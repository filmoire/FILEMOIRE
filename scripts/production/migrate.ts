import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
async function main() {
  const p = new Pool({
    connectionString:
      process.env.MIGRATION_DATABASE_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  const db = await p.connect();
  try {
    await db.query("SELECT pg_advisory_lock(76001013)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir("db/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await db.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await db.query("BEGIN");
      try {
        await db.query(await readFile(`db/migrations/${name}`, "utf8"));
        await db.query("INSERT INTO schema_migrations(name) VALUES($1)", [
          name,
        ]);
        await db.query("COMMIT");
        console.log(`Applied ${name}`);
      } catch (e) {
        await db.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await db.query("SELECT pg_advisory_unlock(76001013)");
    db.release();
    await p.end();
  }
}
main().catch(() => {
  console.error("migrate failed. Check configuration and service logs.");
  process.exitCode = 1;
});
