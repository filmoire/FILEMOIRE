import { mkdtemp, cp, readFile, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { hash, unseal } from "../../src/server/security";
async function main() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/filemoire_test"
  )
    throw new Error(
      "Restore drill requires an isolated local filemoire_test database.",
    );
  if (!process.env.DATA_ENCRYPTION_KEY)
    throw new Error("The fixture encryption key must be supplied separately.");
  process.env.DATABASE_URL = url.toString();
  process.env.STORAGE_DRIVER = "local";
  const target = "filemoire_restore_test";
  const source = new Pool({ connectionString: url.toString() });
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminUrl.toString() });
  const dir = await mkdtemp(path.join(tmpdir(), "filemoire-restore-"));
  await chmod(dir, 0o700);
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: "filemoire_test",
  };
  const run = promisify(execFile);
  let created = false;
  let restored: Pool | undefined;
  try {
    if (
      (
        await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          target,
        ])
      ).rowCount
    )
      throw new Error(
        "The restore target already exists; refusing to overwrite it.",
      );
    const before = (
      await source.query("SELECT id,payload FROM projects ORDER BY id")
    ).rows;
    if (!before.length)
      throw new Error(
        "Seed a non-empty test project before running the restore drill.",
      );
    await run(
      "pg_dump",
      ["-Fc", "--no-owner", "--file", path.join(dir, "database.dump")],
      { env },
    );
    await cp(
      process.env.LOCAL_STORAGE_DIR ?? ".production-test/media",
      path.join(dir, "media"),
      { recursive: true },
    );
    await admin.query("CREATE DATABASE filemoire_restore_test");
    created = true;
    await run(
      "pg_restore",
      [
        "--no-owner",
        "--exit-on-error",
        "--dbname",
        target,
        path.join(dir, "database.dump"),
      ],
      { env: { ...env, PGDATABASE: target } },
    );
    const restoredUrl = new URL(url);
    restoredUrl.pathname = "/" + target;
    restored = new Pool({ connectionString: restoredUrl.toString() });
    const after = (
      await restored.query("SELECT id,payload FROM projects ORDER BY id")
    ).rows;
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error("Restored database differs.");
    for (const row of after) unseal(row.payload);
    const files = (await restored.query("SELECT object_key,sha256 FROM media"))
      .rows;
    for (const f of files) {
      if (!/^[a-z0-9/-]+$/.test(f.object_key)) throw new Error("Invalid key");
      const object = unseal<{ base64: string }>(
        (await readFile(path.join(dir, "media", f.object_key))).toString(),
      );
      if (hash(Buffer.from(object.base64, "base64")) !== f.sha256)
        throw new Error("Restored media differs.");
    }
    const evidence = {
      at: new Date().toISOString(),
      scope:
        "isolated local database and encrypted media; not a hosted disaster recovery certification",
      projects: after.length,
      media: files.length,
      status: "passed",
    };
    await writeFile(
      "artifacts/production/restore-drill.json",
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence));
  } finally {
    await restored?.end();
    if (created) await admin.query("DROP DATABASE filemoire_restore_test");
    await source.end();
    await admin.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
