// Owner-machine backup + isolated Docker restore. Never restores over a cloud DB.
// NODE_ENV=development node --env-file=.env.local --import tsx scripts/production/backup-cloud.mjs
import { mkdir, mkdtemp, writeFile, open, chmod } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { rootCertificates } from "node:tls";
import pg from "pg";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import security from "../../src/server/security.ts";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = (args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      env: options.env ?? process.env,
      stdio: ["ignore", options.stdout ?? "pipe", "pipe"],
    });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    // Child errors can include connection details. Do not echo them or SQL payloads.
    child.stderr.on("data", () => {});
    child.on("error", () => reject(new Error("Docker could not start")));
    child.on("exit", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`Docker ${args[0]} failed (${code})`)),
    );
  });

async function main() {
  const direct = new URL(
    process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL_UNPOOLED ??
      "",
  );
  if (
    !direct.hostname.endsWith(".neon.tech") ||
    direct.hostname.includes("-pooler")
  )
    throw new Error("Backup requires the selected project's direct Neon URL");
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !process.env.DATA_ENCRYPTION_KEY)
    throw new Error("Private bucket and encryption key required");
  const db = new pg.Client({
    connectionString: direct.toString(),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15000,
  });
  const s3 = new S3Client({
    region: process.env.S3_REGION ?? process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
  });
  const container = `filemoire-restore-${randomUUID()}`;
  let restoreStarted = false;
  try {
    await db.connect();
    const major = Math.floor(
      Number(
        (await db.query("SHOW server_version_num")).rows[0].server_version_num,
      ) / 10000,
    );
    if (![17, 18].includes(major))
      throw new Error("Review the backup image for this PostgreSQL version");
    const image = `postgres:${major}-bookworm`;
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await db.query("SELECT pg_export_snapshot() AS id"))
      .rows[0].id;
    const tables = (
      await db.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
      )
    ).rows.map((row) => row.tablename);
    if (!tables.includes("schema_migrations"))
      throw new Error("Not a migrated Filemoire database");
    if (tables.some((name) => !/^[a-z_]+$/.test(name)))
      throw new Error("Unexpected table name");
    const counts = {};
    for (const table of tables)
      counts[table] = Number(
        (await db.query(`SELECT count(*) FROM public.${table}`)).rows[0].count,
      );
    const media = (await db.query("SELECT object_key,sha256 FROM media")).rows;
    await mkdir("artifacts/production", { recursive: true });
    const folder = await mkdtemp(
      path.resolve("artifacts/production/cloud-backup-"),
    );
    await chmod(folder, 0o700);
    // The official PostgreSQL image has no system CA bundle. Reuse Node's
    // trusted public roots while retaining full hostname/certificate checking.
    await writeFile(
      path.join(folder, "ca-certificates.pem"),
      rootCertificates.join("\n"),
      { mode: 0o600 },
    );
    const file = await open(path.join(folder, "database.dump"), "wx", 0o600);
    try {
      const pgEnv = {
        ...process.env,
        PGHOST: direct.hostname,
        PGPORT: direct.port || "5432",
        PGDATABASE: decodeURIComponent(direct.pathname.slice(1)),
        PGUSER: decodeURIComponent(direct.username),
        PGPASSWORD: decodeURIComponent(direct.password),
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: "/backup/ca-certificates.pem",
      };
      await run(
        [
          "run",
          "--rm",
          ...[
            "PGHOST",
            "PGPORT",
            "PGDATABASE",
            "PGUSER",
            "PGPASSWORD",
            "PGSSLMODE",
            "PGSSLROOTCERT",
          ].flatMap((key) => ["--env", key]),
          "--mount",
          `type=bind,src=${folder},dst=/backup,readonly`,
          image,
          "pg_dump",
          "--format=custom",
          "--no-owner",
          "--no-acl",
          "--schema=public",
          `--snapshot=${snapshot}`,
        ],
        { env: pgEnv, stdout: file.fd },
      );
    } finally {
      await file.close();
    }
    await db.query("COMMIT");
    console.log("PASS cloud database dumped with verified TLS");
    const objects = [],
      copied = new Set();
    let token;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
      );
      for (const object of page.Contents ?? []) {
        if (
          !object.Key ||
          !/^[a-z0-9/-]+$/.test(object.Key) ||
          object.Key.startsWith("/")
        )
          throw new Error("Unexpected private object key");
        const result = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: object.Key }),
        );
        const bytes = Buffer.from(await result.Body.transformToByteArray());
        const plain = Buffer.from(
          security.unseal(bytes.toString()).base64,
          "base64",
        );
        const record = media.find((item) => item.object_key === object.Key);
        if (record && digest(plain) !== record.sha256)
          throw new Error("Backed-up media hash mismatch");
        const dest = path.join(folder, "objects", object.Key);
        await mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
        await writeFile(dest, bytes, { mode: 0o600, flag: "wx" });
        objects.push({
          key: object.Key,
          bytes: bytes.length,
          sha256: digest(bytes),
        });
        copied.add(object.Key);
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    if (media.some((item) => !copied.has(item.object_key)))
      throw new Error("Backup is missing a referenced media object");
    console.log(
      `PASS ${objects.length} encrypted objects copied; referenced media hashes verified`,
    );
    await run([
      "run",
      "-d",
      "--name",
      container,
      "--network",
      "none",
      "--tmpfs",
      "/var/lib/postgresql",
      "--env",
      "PGDATA=/var/lib/postgresql/data",
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "--mount",
      `type=bind,src=${folder},dst=/backup,readonly`,
      image,
    ]);
    restoreStarted = true;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        // The entrypoint's temporary initialization server listens only on a
        // Unix socket. Wait for the final server before starting the restore.
        await run([
          "exec",
          container,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-U",
          "postgres",
        ]);
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!ready) throw new Error("Isolated restore database did not start");
    await run([
      "exec",
      container,
      "pg_restore",
      "--clean",
      "--if-exists",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      "/backup/database.dump",
    ]);
    for (const table of tables) {
      const count = Number(
        (
          await run([
            "exec",
            container,
            "psql",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-tAc",
            `SELECT count(*) FROM public.${table}`,
          ])
        ).trim(),
      );
      if (count !== counts[table])
        throw new Error(
          `Table count changed during backup: ${table}. Repeat during a quiet period.`,
        );
    }
    const payloads = (
      await run([
        "exec",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-tAc",
        "SELECT payload FROM projects",
      ])
    ).trim();
    for (const payload of payloads ? payloads.split("\n") : [])
      security.unseal(payload);
    const evidence = {
      at: new Date().toISOString(),
      status: "passed",
      scope:
        "Cloud snapshot restored into an isolated local container; not a hosted rollback drill",
      tables: counts,
      objects,
      encryptionKey:
        "Not included: keep a separate secure backup of the existing key",
    };
    await writeFile(
      path.join(folder, "manifest.json"),
      JSON.stringify(evidence, null, 2),
      { mode: 0o600 },
    );
    console.log(
      `PASS restored ${tables.length} tables and decrypted ${counts.projects} project payloads`,
    );
    console.log(
      `Backup saved privately: ${folder}. Keep the encryption key separately; copy the backup to owner-controlled secure storage.`,
    );
  } finally {
    if (restoreStarted) await run(["rm", "-f", container]);
    await db.end();
    s3.destroy();
  }
}
main().catch((error) => {
  console.error(
    "Backup verification failed:",
    error.code ??
      error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[REDACTED]"),
  );
  process.exitCode = 1;
});
