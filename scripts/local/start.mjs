import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

process.chdir(fileURLToPath(new URL("../../", import.meta.url)));
const envFile = ".env.filemoire.local";
const lockFile = ".filemoire-local.lock";
const children = new Set();
let ownsLock = false;
let stopping = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    children.add(child);
    child.once("error", (error) => {
      children.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      children.delete(child);
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args[0] ?? ""} failed (${signal ?? code}).`),
        );
    });
  });
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  const deadline = Date.now() + 8000;
  while (children.size && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 100));
  for (const child of children) child.kill("SIGKILL");
  if (ownsLock) await unlink(lockFile).catch(() => {});
  console.log(
    "\nFilemoire stopped. Books and media are saved; the database and local inbox remain available.",
  );
  process.exit(code);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());

async function freePort(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (e) =>
      e.code === "EADDRINUSE" ? resolve(false) : reject(e),
    );
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
async function lock() {
  try {
    const previous = JSON.parse(await readFile(lockFile, "utf8"));
    let alive = false;
    try {
      process.kill(previous.pid, 0);
      alive = true;
    } catch (e) {
      if (e.code !== "ESRCH") throw e;
    }
    if (alive) {
      console.log(
        `Filemoire is already starting or running: ${previous.origin || "check its terminal"}`,
      );
      return false;
    }
    await unlink(lockFile);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await writeFile(lockFile, JSON.stringify({ pid: process.pid }), {
    flag: "wx",
    mode: 0o600,
  });
  ownsLock = true;
  return true;
}

async function main() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 22 || minor < 12)
    throw new Error("Use Node.js 22 (22.12 or newer).");
  await access("node_modules/next/dist/bin/next").catch(() => {
    throw new Error(
      "Install dependencies first: corepack pnpm@10.28.0 install --frozen-lockfile",
    );
  });
  if (!(await lock())) return;
  await run("docker", ["info", "--format", "Docker {{.ServerVersion}}"], {
    timeout: 10000,
  });
  for (const tool of ["ffmpeg", "ffprobe"])
    await run(tool, ["-version"], { stdio: "ignore" }).catch(() => {
      throw new Error(
        `${tool} is required. Install FFmpeg, then run this command again.`,
      );
    });

  let port = Number(process.env.FILEMOIRE_PORT || 3100);
  if (!Number.isInteger(port) || port < 1024 || port > 65525)
    throw new Error("FILEMOIRE_PORT must be between 1024 and 65525.");
  while (!(await freePort(port))) {
    console.log(`Port ${port} is occupied; trying ${port + 1}.`);
    port++;
    if (port > 65535) throw new Error("No available local port.");
  }
  const origin = `http://localhost:${port}`;
  try {
    await writeFile(
      envFile,
      [
        "# Private local settings. Keep this encryption key with your database and media backups.",
        "APP_MODE=live",
        "NEXT_PUBLIC_APP_MODE=live",
        "FILEMOIRE_LOCAL=true",
        "PERSONAL_DRAFTS_ENABLED=true",
        "DATABASE_URL=postgres://filemoire:local_development_only@127.0.0.1:55432/filemoire",
        "DATABASE_SSL=false",
        `DATA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`,
        "STORAGE_DRIVER=local",
        "LOCAL_STORAGE_DIR=.private-media",
        "SMTP_URL=smtp://127.0.0.1:1025",
        'EMAIL_FROM="Filemoire <noreply@example.test>"',
        "APP_TIMEZONE=Europe/Paris",
        "CHECKOUT_ENABLED=false",
        "PRINT_ENABLED=false",
        "LEGAL_APPROVED=false",
        "COMMERCIAL_APPROVED=false",
        "PRINT_SPEC_APPROVED=false",
        "",
      ].join("\n"),
      { flag: "wx", mode: 0o600 },
    );
    console.log(`Created ${envFile} with a private encryption key.`);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  Object.assign(process.env, parseEnv(await readFile(envFile, "utf8")));
  const database = new URL(process.env.DATABASE_URL || "");
  if (
    !["127.0.0.1", "localhost"].includes(database.hostname) ||
    database.port !== "55432" ||
    database.pathname !== "/filemoire"
  )
    throw new Error(
      "The local launcher only accepts its local filemoire database on port 55432. Use the deployment runbook for other databases.",
    );
  if (
    process.env.MIGRATION_DATABASE_URL &&
    process.env.MIGRATION_DATABASE_URL !== process.env.DATABASE_URL
  )
    throw new Error(
      "The local launcher cannot use a separate migration database.",
    );
  if (
    Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64").length !== 32
  )
    throw new Error(
      "The saved local encryption key is invalid. Restore the original key; do not replace it if data already exists.",
    );
  Object.assign(process.env, {
    APP_MODE: "live",
    NEXT_PUBLIC_APP_MODE: "live",
    FILEMOIRE_LOCAL: "true",
    PERSONAL_DRAFTS_ENABLED: "true",
    APP_ORIGIN: origin,
    NEXT_BUILD_DIR: ".next-local",
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    SMTP_URL: "smtp://127.0.0.1:1025",
    EMAIL_FROM: "Filemoire <noreply@example.test>",
    STORAGE_DRIVER: "local",
    LOCAL_STORAGE_DIR: ".private-media",
    DATABASE_SSL: "false",
    CHECKOUT_ENABLED: "false",
    PRINT_ENABLED: "false",
    LEGAL_APPROVED: "false",
    COMMERCIAL_APPROVED: "false",
    PRINT_SPEC_APPROVED: "false",
    TRANSCRIPTION_URL: "",
    TRANSCRIPTION_API_KEY: "",
    TRANSCRIPTION_MODEL: "",
  });
  await writeFile(lockFile, JSON.stringify({ pid: process.pid, origin }), {
    mode: 0o600,
  });
  await run("docker", [
    "compose",
    "-f",
    "compose.dev.yml",
    "up",
    "-d",
    "--wait",
  ]);
  await run(process.execPath, [
    "--import",
    "tsx",
    "scripts/production/migrate.ts",
  ]);
  console.log(
    `\nStarting Filemoire at ${origin}\nLocal email inbox: http://localhost:8025\nPress Ctrl+C to stop the website and worker.\n`,
  );
  const onUnexpectedExit = (error) => {
    if (!stopping) {
      console.error(error?.message || "A required process stopped.");
      void stop(1);
    }
  };
  void run(process.execPath, [
    "--import",
    "tsx",
    "scripts/production/worker.ts",
  ]).then(() => onUnexpectedExit(), onUnexpectedExit);
  void run(process.execPath, [
    "node_modules/next/dist/bin/next",
    "dev",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ]).then(() => onUnexpectedExit(), onUnexpectedExit);
}
main().catch(async (e) => {
  console.error(
    `\nUnable to start Filemoire: ${e.message}\nMake sure Docker Desktop is running, then try again.`,
  );
  await stop(1);
});
