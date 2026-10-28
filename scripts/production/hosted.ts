import { spawn, type ChildProcess } from "node:child_process";
import { readdir } from "node:fs/promises";
import { config } from "../../src/server/config";
import { pool } from "../../src/server/db";

export async function startHosted(
  stage: "staging" | "production",
  validate?: () => void,
) {
  // Split deployments must link emails and enforce CSRF against the frontend.
  if (process.env.FILEMOIRE_SERVICE === "backend" && !process.env.APP_ORIGIN)
    throw new Error("Backend deployments require the frontend APP_ORIGIN");
  // Render supplies the HTTPS origin for the original single-service deployment.
  process.env.APP_ORIGIN ||= process.env.RENDER_EXTERNAL_URL;
  if (
    config().DEPLOYMENT_STAGE !== stage ||
    process.env.NODE_ENV !== "production"
  )
    throw new Error("Hosted launcher and deployment stage must match");
  validate?.();
  const expected = (await readdir("db/migrations")).filter((name) =>
    name.endsWith(".sql"),
  );
  try {
    const privileges = (
      await pool().query(
        "SELECT rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,has_schema_privilege(current_user,'public','CREATE') AS schema_create,has_table_privilege(current_user,'schema_migrations','INSERT') AS migration_write FROM pg_roles WHERE rolname=current_user",
      )
    ).rows[0];
    if (!privileges || Object.values(privileges).some(Boolean))
      throw new Error(
        "Hosted applications require a restricted runtime database role",
      );
    const applied = new Set(
      (await pool().query("SELECT name FROM schema_migrations")).rows.map(
        (r) => r.name,
      ),
    );
    if (expected.some((name) => !applied.has(name)))
      throw new Error("Apply outstanding migrations before deploying");
  } finally {
    await pool().end();
  }
  // Migrations run separately. Neither child needs the database-owner password.
  const env = { ...process.env };
  delete env.MIGRATION_DATABASE_URL;
  delete env.DATABASE_URL_UNPOOLED;
  let stopping = false;
  const children = new Set<ChildProcess>();
  let deadline: NodeJS.Timeout | undefined;
  const stop = (failed: boolean) => {
    if (failed) process.exitCode = 1;
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill("SIGTERM");
    deadline = setTimeout(() => {
      process.exitCode = 1;
      for (const child of children) child.kill("SIGKILL");
    }, 20000);
    deadline.unref();
  };
  process.on("SIGTERM", () => stop(false));
  process.on("SIGINT", () => stop(false));
  for (const entry of ["server.js", "dist-worker/worker.cjs"]) {
    const child = spawn(process.execPath, [entry], { env, stdio: "inherit" });
    children.add(child);
    child.on("error", () => stop(true));
    child.on("exit", () => {
      children.delete(child);
      if (!stopping) {
        console.error(`Hosted service exited: ${entry}`);
        stop(true);
      }
      if (!children.size && deadline) clearTimeout(deadline);
    });
  }
}
