import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
const exec = promisify(execFile);

async function rejectedDrill(change, expected) {
  const folder = await mkdtemp(path.join(tmpdir(), "filemoire-restore-guard-"));
  const target = {
    projectId: "project-test",
    branchId: "br-test",
    branchName: "recovery-drill-test",
    host: "ep-drill.neon.tech",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  const branch = {
    DATABASE_URL_UNPOOLED:
      "postgresql://fixture:fixture@ep-drill.neon.tech/neondb",
    NEON_BRANCH: "recovery-drill-test",
    AWS_ENDPOINT_URL_S3: "https://br-test.storage.neon.tech",
  };
  const source = {
    DATABASE_URL:
      "postgresql://fixture:fixture@ep-production-pooler.neon.tech/neondb",
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  const manifest = {
    status: "passed",
    tables: { schema_migrations: 1 },
    objects: [],
  };
  change({ target, branch, source, manifest });
  try {
    await mkdir(path.join(folder, "backup"));
    await writeFile(
      path.join(folder, "backup/manifest.json"),
      JSON.stringify(manifest),
    );
    for (const [name, values] of [
      ["branch.env", branch],
      ["source.env", source],
    ])
      await writeFile(
        path.join(folder, name),
        Object.entries(values)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join("\n"),
        { mode: 0o600 },
      );
    await writeFile(path.join(folder, "target.json"), JSON.stringify(target));
    await assert.rejects(
      exec(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/production/restore-hosted.mjs",
          path.join(folder, "backup"),
          path.join(folder, "branch.env"),
          path.join(folder, "source.env"),
          path.join(folder, "target.json"),
        ],
        { timeout: 10000 },
      ),
      (error) => {
        assert.match(error.stderr, expected);
        assert.equal(error.code, 1);
        return true;
      },
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test("hosted restore refuses the production endpoint", () =>
  rejectedDrill(({ branch, target }) => {
    branch.DATABASE_URL_UNPOOLED =
      "postgresql://fixture:fixture@ep-production.neon.tech/neondb";
    target.host = "ep-production.neon.tech";
  }, /separate direct branch endpoint/));
test("hosted restore refuses a normal production branch name", () =>
  rejectedDrill(({ branch }) => {
    branch.NEON_BRANCH = "production";
  }, /Only recovery-drill branches/));
test("hosted restore refuses storage on another branch", () =>
  rejectedDrill(({ branch }) => {
    branch.AWS_ENDPOINT_URL_S3 = "https://br-production.storage.neon.tech";
  }, /same isolated branch/));
test("hosted restore refuses expired drill targets", () =>
  rejectedDrill(({ target }) => {
    target.expiresAt = new Date(Date.now() - 1000).toISOString();
  }, /expire within 24 hours/));
test("hosted restore refuses paths outside the backup", () =>
  rejectedDrill(({ manifest }) => {
    manifest.objects.push({ key: "../../private.env" });
  }, /Invalid object key/));
