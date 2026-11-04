import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { backupEntries, archiveBackup } from "./archive-backup.mjs";

async function fixture(fn) {
  const temp = await mkdtemp(path.join(tmpdir(), "filemoire-archive-test-"));
  const folder = path.join(temp, "backup");
  await mkdir(path.join(folder, "objects"), { recursive: true });
  const bytes = Buffer.from("synthetic ciphertext");
  await writeFile(path.join(folder, "database.dump"), "synthetic database");
  await writeFile(path.join(folder, "objects/photo-1"), bytes);
  const manifest = {
    status: "passed",
    objects: [
      {
        key: "photo-1",
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
    ],
  };
  await writeFile(path.join(folder, "manifest.json"), JSON.stringify(manifest));
  try {
    await fn({ folder, temp, manifest });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
test("only includes explicit verified files and rejects traversal, symlinks and changed media", async () =>
  fixture(async ({ folder, temp, manifest }) => {
    await writeFile(
      path.join(folder, ".env"),
      "DATA_ENCRYPTION_KEY=synthetic-only",
    );
    assert.deepEqual((await backupEntries(folder)).entries, [
      "database.dump",
      "manifest.json",
      "objects/photo-1",
    ]);
    await writeFile(path.join(folder, "objects/photo-1"), "modified");
    await assert.rejects(backupEntries(folder), /integrity/);
    manifest.objects[0].key = "../../outside";
    await writeFile(
      path.join(folder, "manifest.json"),
      JSON.stringify(manifest),
    );
    await assert.rejects(backupEntries(folder), /Unsafe/);
    await rm(path.join(folder, "database.dump"));
    await writeFile(path.join(temp, "outside"), "sensitive fixture");
    await symlink(
      path.join(temp, "outside"),
      path.join(folder, "database.dump"),
    );
    await assert.rejects(backupEntries(folder), /regular/);
  }));
test("age archive round trip is private, excludes keys, rejects overwrite and detects corruption", async () =>
  fixture(async ({ folder, temp }) => {
    const identity = path.join(temp, "identity.txt");
    execFileSync("age-keygen", ["-o", identity], { stdio: "pipe" });
    const recipient = execFileSync("age-keygen", ["-y", identity], {
      encoding: "utf8",
    }).trim();
    await writeFile(
      path.join(folder, "production-key.env"),
      "SYNTHETIC_SECRET_DO_NOT_INCLUDE",
    );
    const output = path.join(temp, "backup.tar.gz.age");
    assert.deepEqual(await archiveBackup(folder, output, recipient), {
      files: 3,
    });
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const encrypted = await readFile(output);
    assert.ok(!encrypted.includes(Buffer.from("synthetic database")));
    const archive = execFileSync("age", ["--decrypt", "-i", identity, output]);
    const entries = execFileSync("tar", ["-tzf", "-"], {
      input: archive,
      encoding: "utf8",
    });
    assert.deepEqual(
      entries.trim().split("\n").sort(),
      ["database.dump", "manifest.json", "objects/photo-1"].sort(),
    );
    assert.equal(
      execFileSync("tar", ["-xOzf", "-", "database.dump"], {
        input: archive,
        encoding: "utf8",
      }),
      "synthetic database",
    );
    await assert.rejects(archiveBackup(folder, output, recipient), /EEXIST/);
    const damaged = Buffer.from(encrypted);
    damaged[damaged.length - 1] ^= 1;
    assert.throws(() =>
      execFileSync("age", ["--decrypt", "-i", identity], {
        input: damaged,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    await assert.rejects(
      archiveBackup(folder, path.join(folder, "bad.age"), recipient),
      /outside/,
    );
    await assert.rejects(
      archiveBackup(
        folder,
        path.join(temp, "bad.age"),
        "AGE-SECRET-KEY-invalid",
      ),
      /public/,
    );
  }));
