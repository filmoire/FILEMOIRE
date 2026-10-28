// Run with the owner env file on the operator's machine, never in the web service.
import { open, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import pg from "pg";

async function main() {
  const target = process.argv[2];
  if (!target || !/^\.env\.[a-z0-9.-]+$/.test(target))
    throw new Error(
      "Supply a new ignored .env.* output filename in the project root",
    );
  const ownerUrl =
    process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!ownerUrl)
    throw new Error("A direct migration-owner connection is required");
  const direct = new URL(ownerUrl);
  if (direct.hostname.includes("-pooler"))
    throw new Error("Use a direct connection");
  const runtimeUrl = new URL(process.env.DATABASE_URL ?? ownerUrl);
  if (
    runtimeUrl.hostname.replace("-pooler", "") !== direct.hostname ||
    runtimeUrl.pathname !== direct.pathname
  )
    throw new Error(
      "Runtime and owner connections must target the same database",
    );
  const db = new pg.Client({
    connectionString: ownerUrl,
    connectionTimeoutMillis: 15000,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
  let file,
    credentialsWritten = false;
  try {
    // Never overwrite credentials or rotate a role that another service may use.
    file = await open(target, "wx", 0o600);
    await db.connect();
    await db.query("BEGIN");
    if (
      (
        await db.query(
          "SELECT 1 FROM pg_roles WHERE rolname='filemoire_runtime'",
        )
      ).rowCount
    )
      throw new Error(
        "Runtime role already exists; reuse its existing credentials",
      );
    const password = randomBytes(36).toString("hex");
    const identity = (
      await db.query(
        "SELECT current_user AS owner,current_database() AS database",
      )
    ).rows[0];
    await db.query(
      `CREATE ROLE filemoire_runtime LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS CONNECTION LIMIT 30`,
    );
    await db.query(
      `GRANT CONNECT ON DATABASE ${quote(identity.database)} TO filemoire_runtime`,
    );
    await db.query("GRANT USAGE ON SCHEMA public TO filemoire_runtime");
    await db.query(
      "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO filemoire_runtime",
    );
    await db.query(
      "REVOKE ALL ON TABLE schema_migrations FROM filemoire_runtime",
    );
    await db.query(
      "GRANT SELECT ON TABLE schema_migrations TO filemoire_runtime",
    );
    await db.query(
      "GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO filemoire_runtime",
    );
    await db.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quote(identity.owner)} IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO filemoire_runtime`,
    );
    await db.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quote(identity.owner)} IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO filemoire_runtime`,
    );
    const access = (
      await db.query(
        "SELECT has_schema_privilege('filemoire_runtime','public','CREATE') AS schema_create,has_table_privilege('filemoire_runtime','schema_migrations','INSERT') AS migration_write",
      )
    ).rows[0];
    if (Object.values(access).some(Boolean))
      throw new Error(
        "Inherited privileges are too broad; no changes committed",
      );
    runtimeUrl.username = "filemoire_runtime";
    runtimeUrl.password = password;
    await file.writeFile(`DATABASE_URL=${runtimeUrl.toString()}\n`);
    await file.sync();
    credentialsWritten = true;
    await db.query("COMMIT");
    console.log(
      `Created restricted runtime role. Credentials saved privately in ${target} (0600); owner configuration unchanged.`,
    );
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    // Never print database errors that can echo SQL credentials.
    console.error(
      "Runtime setup failed; existing credentials were not overwritten.",
      error.code ??
        "Check owner access and whether the role/output file already exists.",
    );
    if (credentialsWritten)
      console.error(
        "The private credential file was retained; verify the role before retrying if the commit outcome is unknown.",
      );
    process.exitCode = 1;
  } finally {
    await db.end().catch(() => {});
    await file?.close();
    if (file && !credentialsWritten) await unlink(target);
  }
}
main().catch(() => {
  // URL parsing errors can contain credentials; do not echo the thrown error.
  console.error(
    "Runtime setup failed. Check the owner connection and a new ignored .env.* output filename.",
  );
  process.exitCode = 1;
});
