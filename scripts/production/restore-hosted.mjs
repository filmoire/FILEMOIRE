// Restore only into a NEW database and NEW private bucket on an expiring drill branch.
// node --import tsx scripts/production/restore-hosted.mjs BACKUP BRANCH_ENV KEY_ENV TARGET_JSON
import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import pg from "pg";
import {
  S3Client,
  CreateBucketCommand,
  GetBucketAclCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import security from "../../src/server/security.ts";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
function docker(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", () => {}); // Never print SQL, credentials or private data.
    child.on("error", () => reject(new Error("Docker could not start")));
    child.on("exit", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`PostgreSQL utility failed (${code})`)),
    );
  });
}

async function main() {
  const [backupArg, branchFile, keyFile, targetFile] = process.argv.slice(2);
  ensure(
    backupArg && branchFile && keyFile && targetFile,
    "Pass backup directory, branch env, separate key env and target metadata JSON",
  );
  const backup = path.resolve(backupArg);
  const branch = parseEnv(await readFile(branchFile, "utf8"));
  const source = parseEnv(await readFile(keyFile, "utf8"));
  const target = JSON.parse(await readFile(targetFile, "utf8"));
  const manifest = JSON.parse(
    await readFile(path.join(backup, "manifest.json"), "utf8"),
  );
  const url = new URL(branch.DATABASE_URL_UNPOOLED);
  const productionHost = new URL(source.DATABASE_URL).hostname.replace(
    "-pooler",
    "",
  );
  ensure(
    target.projectId && /^br-[a-z0-9-]+$/.test(target.branchId),
    "Explicit drill branch metadata required",
  );
  ensure(
    /^recovery-drill-[a-z0-9-]+$/.test(branch.NEON_BRANCH) &&
      branch.NEON_BRANCH === target.branchName,
    "Only recovery-drill branches are accepted",
  );
  ensure(
    url.hostname === target.host &&
      url.hostname.endsWith(".neon.tech") &&
      !url.hostname.includes("-pooler") &&
      url.hostname !== productionHost,
    "Restore host must be a separate direct branch endpoint",
  );
  url.searchParams.set("sslmode", "verify-full");
  const expiry = Date.parse(target.expiresAt);
  ensure(
    expiry > Date.now() && expiry < Date.now() + 24 * 3600000,
    "Drill branch must expire within 24 hours",
  );
  const storage = new URL(branch.AWS_ENDPOINT_URL_S3);
  ensure(
    storage.protocol === "https:" &&
      storage.hostname.startsWith(`${target.branchId}.storage.`) &&
      storage.hostname.endsWith(".neon.tech"),
    "Storage must belong to the same isolated branch",
  );
  ensure(
    Buffer.from(source.DATA_ENCRYPTION_KEY || "", "base64").length === 32,
    "Separate matching encryption key required",
  );
  ensure(
    manifest.status === "passed" && manifest.tables?.schema_migrations > 0,
    "Use a locally verified Filemoire backup",
  );
  const tables = Object.entries(manifest.tables);
  ensure(
    tables.every(
      ([name, count]) =>
        /^[a-z_]+$/.test(name) && Number.isSafeInteger(count) && count >= 0,
    ),
    "Invalid table manifest",
  );
  for (const object of manifest.objects) {
    ensure(
      /^media\/[a-z0-9-]+\/[a-z0-9-]+$/.test(object.key),
      "Invalid object key",
    );
    const bytes = await readFile(path.join(backup, "objects", object.key));
    ensure(
      bytes.length === object.bytes && sha(bytes) === object.sha256,
      "Backup object checksum mismatch",
    );
  }
  // Only the decryption helpers are used; no application worker is ever launched.
  process.env.DATABASE_URL = url.toString();
  process.env.DATA_ENCRYPTION_KEY = source.DATA_ENCRYPTION_KEY;
  process.env.NODE_ENV = "development";
  process.env.DEPLOYMENT_STAGE = "production";
  delete process.env.NEXT_PUBLIC_DEPLOYMENT_STAGE;
  const connect = (connectionString) =>
    new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 15000,
    });
  const admin = connect(url.toString());
  const suffix = randomBytes(6).toString("hex");
  const database = `filemoire_restore_${suffix}`;
  const bucket = `restore-${suffix}`;
  let restored;
  const s3 = new S3Client({
    region: branch.AWS_REGION,
    endpoint: storage.toString(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: branch.AWS_ACCESS_KEY_ID,
      secretAccessKey: branch.AWS_SECRET_ACCESS_KEY,
    },
  });
  try {
    await admin.connect();
    const major = Math.floor(
      Number(
        (await admin.query("SHOW server_version_num")).rows[0]
          .server_version_num,
      ) / 10000,
    );
    ensure([17, 18].includes(major), "Unsupported PostgreSQL utility version");
    const image = `postgres:${major}-bookworm`;
    // No DROP, --clean or overwrite of an existing database, even on the drill branch.
    await admin.query(`CREATE DATABASE ${database} TEMPLATE template0`);
    url.pathname = `/${database}`;
    restored = connect(url.toString());
    await restored.connect();
    ensure(
      Number(
        (
          await restored.query(
            "SELECT count(*) FROM pg_tables WHERE schemaname='public'",
          )
        ).rows[0].count,
      ) === 0,
      "Restore database must be empty",
    );
    const mount = `type=bind,src=${backup},dst=/backup,readonly`;
    const toc = await docker([
      "run",
      "--rm",
      "--network",
      "none",
      "--mount",
      mount,
      image,
      "pg_restore",
      "--list",
      "/backup/database.dump",
    ]);
    // template0 already owns an empty public schema; keep it and restore its contents.
    const listName = `restore-${suffix}.list`;
    await writeFile(
      path.join(backup, listName),
      toc
        .split("\n")
        .filter(
          (line) => !/ SCHEMA - public | COMMENT - SCHEMA public /.test(line),
        )
        .join("\n"),
      { mode: 0o600, flag: "wx" },
    );
    const pgEnv = {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGDATABASE: database,
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: "/backup/ca-certificates.pem",
    };
    await docker(
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
        mount,
        image,
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        "--dbname",
        database,
        "--use-list",
        `/backup/${listName}`,
        "/backup/database.dump",
      ],
      pgEnv,
    );
    for (const [table, expected] of tables) {
      const actual = Number(
        (await restored.query(`SELECT count(*) FROM public.${table}`)).rows[0]
          .count,
      );
      ensure(actual === expected, `Restored row count mismatch: ${table}`);
    }
    const projects = (await restored.query("SELECT payload FROM projects"))
      .rows;
    for (const { payload } of projects) security.unseal(payload);
    console.log(
      `PASS hosted restore: ${tables.length} tables and ${projects.length} decrypted projects`,
    );
    // The branch's S3 service creates private buckets; never request a public ACL.
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    const acl = await s3.send(new GetBucketAclCommand({ Bucket: bucket }));
    ensure(
      !(acl.Grants || []).some((grant) => grant.Grantee?.Type === "Group"),
      "Restore bucket must not allow public/group access",
    );
    for (const object of manifest.objects) {
      const bytes = await readFile(path.join(backup, "objects", object.key));
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: object.key,
          Body: bytes,
          ContentType: "application/octet-stream",
        }),
      );
    }
    const media = (await restored.query("SELECT object_key,sha256 FROM media"))
      .rows;
    const verified = new Set();
    for (const object of manifest.objects) {
      const response = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: object.key }),
      );
      const bytes = Buffer.from(await response.Body.transformToByteArray());
      ensure(sha(bytes) === object.sha256, "Restored object checksum mismatch");
      const plain = Buffer.from(
        security.unseal(bytes.toString()).base64,
        "base64",
      );
      const record = media.find((row) => row.object_key === object.key);
      if (record)
        ensure(
          sha(plain) === record.sha256,
          "Restored media plaintext checksum mismatch",
        );
      verified.add(object.key);
    }
    ensure(
      media.every((row) => verified.has(row.object_key)),
      "A restored media reference is missing",
    );
    console.log(
      `PASS hosted storage restore: ${verified.size} encrypted objects and ${media.length} referenced media hashes`,
    );
    const evidence = {
      at: new Date().toISOString(),
      status: "passed",
      projectId: target.projectId,
      branchId: target.branchId,
      branchName: branch.NEON_BRANCH,
      expiresAt: target.expiresAt,
      database,
      bucket,
      tables: tables.length,
      projects: projects.length,
      objects: verified.size,
      media: media.length,
      backup: path.basename(backup),
      limitations:
        "Isolated hosted database/media restore only. No application cutover, production rollback, scheduled off-device backup or key escrow is claimed. No worker ran against restored jobs.",
    };
    await writeFile(
      path.join(backup, "hosted-restore.json"),
      JSON.stringify(evidence, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    console.log(
      "PASS production database and media unchanged; drill resources expire with their branch",
    );
  } finally {
    await restored?.end();
    await admin.end();
    s3.destroy();
  }
}
main().catch((error) => {
  console.error(
    "Hosted restore failed:",
    error.code ||
      String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]"),
  );
  process.exitCode = 1;
});
