import { spawn, type ChildProcess } from "node:child_process";
import { readdir } from "node:fs/promises";
import { config } from "../../src/server/config";
import { pool } from "../../src/server/db";

async function main() {
  // Render supplies the HTTPS origin after the service has been created.
  process.env.APP_ORIGIN ||= process.env.RENDER_EXTERNAL_URL;
  if (
    config().DEPLOYMENT_STAGE !== "staging" ||
    process.env.NODE_ENV !== "production"
  )
    throw new Error(
      "This combined launcher is only for hosted private staging",
    );
  const expected = (await readdir("db/migrations")).filter((name) =>
    name.endsWith(".sql"),
  );
  try {
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
        console.error(`Staging service exited: ${entry}`);
        stop(true);
      }
      if (!children.size && deadline) clearTimeout(deadline);
    });
  }
}
main().catch(() => {
  console.error(
    "Staging startup failed. Check configuration and applied migrations.",
  );
  process.exitCode = 1;
});
