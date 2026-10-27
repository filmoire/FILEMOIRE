// Run only against a loopback app using Neon and the local Mailpit inbox.
// Creates one clearly labelled fictional manuscript; never resets a database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../../src/server/config.ts";
import { pool } from "../../src/server/db.ts";
import { hash, unseal } from "../../src/server/security.ts";

const settings = config();
const origin = settings.APP_ORIGIN;
let cookie = "";
let checks = 0;
const consumedMessages = new Set();
async function request(
  path,
  method = "GET",
  body,
  status = 200,
  authenticated = true,
) {
  const response = await fetch(`${origin}/api/v1/${path}`, {
    method,
    signal: AbortSignal.timeout(90000),
    headers: {
      Origin: origin,
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined
        ? {
            "Content-Type": Buffer.isBuffer(body)
              ? "application/octet-stream"
              : "application/json",
          }
        : {}),
    },
    body:
      body === undefined
        ? undefined
        : Buffer.isBuffer(body)
          ? body
          : JSON.stringify(body),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(
    response.status,
    status,
    `${method} ${path}: HTTP ${response.status}`,
  );
  checks++;
  return { response, bytes, json: () => JSON.parse(bytes.toString()) };
}
async function login(email) {
  await request("auth/request", "POST", { email }, 202, false);
  for (let attempt = 0; attempt < 30; attempt++) {
    const found = await fetch(
      `http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    assert.equal(found.status, 200, "Local Mailpit search must be available");
    const { messages = [] } = await found.json();
    const freshMessage = messages.find(
      (message) => !consumedMessages.has(message.ID),
    );
    if (freshMessage) {
      const message = await (
        await fetch(`http://127.0.0.1:8025/api/v1/message/${freshMessage.ID}`)
      ).json();
      const token = message.Text?.match(/#token=([\w-]+)/)?.[1];
      assert(token, "The local login email must contain a one-use token");
      const result = await request(
        "auth/consume",
        "POST",
        { token },
        200,
        false,
      );
      cookie = result.response.headers.get("set-cookie")?.split(";")[0] || "";
      assert(cookie, "Login must establish a session");
      consumedMessages.add(freshMessage.ID);
      await request("auth/consume", "POST", { token }, 400, false);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    "The local worker did not deliver the login email to Mailpit",
  );
}
async function main() {
  assert(
    ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
    "Only a loopback app is allowed",
  );
  assert(
    new URL(settings.DATABASE_URL).hostname.endsWith(".neon.tech"),
    "A Neon database is required",
  );
  assert.equal(settings.STORAGE_DRIVER, "s3");
  assert.equal(settings.EMAIL_PROVIDER, "smtp");
  assert(
    ["localhost", "127.0.0.1"].includes(new URL(settings.SMTP_URL).hostname),
    "Email must stay in local Mailpit",
  );
  assert.equal(process.env.CHECKOUT_ENABLED, "false");
  assert.equal(process.env.PRINT_ENABLED, "false");
  const health = (await request("health")).json();
  assert.equal(health.status, "ok");
  console.log("PASS app health reaches Neon Postgres");

  const email = `neon-smoke-${randomUUID()}@example.test`;
  await login(email);
  console.log("PASS email sign-in through local inbox; token replay denied");

  let view = (
    await request(
      "projects",
      "POST",
      {
        requestKey: randomUUID(),
        firstName: "Neon",
        lastName: "Verification",
        title: "Neon verification — fictional manuscript",
        theme: "vie",
        consentVersion: "2026-10-13",
        accepted: true,
      },
      201,
    )
  ).json();
  const projectId = view.project.id;
  const story = `Fictional Neon persistence check ${randomUUID()}. A quiet afternoon in the garden.`;
  view = (
    await request(`projects/${projectId}/commands`, "POST", {
      revision: view.revision,
      command: {
        type: "answer",
        questionId: view.project.questions[0].id,
        text: story,
        visibility: "moi",
        draft: false,
      },
    })
  ).json();
  const memory = view.project.memories.find((item) => item.text === story);
  assert(memory, "Saved story should be returned by the application");
  const record = (
    await pool().query("SELECT payload FROM projects WHERE id=$1", [projectId])
  ).rows[0];
  assert(record.payload.startsWith("v1."));
  assert(!record.payload.includes(story), "Database payload must be encrypted");
  assert(unseal(record.payload).memories.some((item) => item.text === story));
  await request(`projects/${projectId}`, "GET", undefined, 401, false);
  console.log(
    "PASS story saved through API and encrypted in Neon; anonymous access denied",
  );

  const png = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#e9dfef" },
  })
    .png()
    .toBuffer();
  const upload = (
    await request(
      `projects/${projectId}/uploads`,
      "POST",
      {
        kind: "photo",
        bytes: png.length,
        mime: "image/png",
        memoryId: memory.id,
        caption: "Fictional Neon test image",
      },
      201,
    )
  ).json();
  await request(`uploads/${upload.id}/0`, "PUT", png);
  await request(`uploads/${upload.id}/complete`, "POST", {});
  view = (await request(`projects/${projectId}`)).json();
  const photo = view.project.photos.find((item) => item.id === upload.id);
  assert(photo, "Completed upload should be part of the saved manuscript");
  const media = (
    await pool().query(
      "SELECT object_key,sha256 FROM media WHERE id=$1 AND project_id=$2",
      [photo.id, projectId],
    )
  ).rows[0];
  const downloaded = (await request(`media/${photo.id}`)).bytes;
  assert.equal(hash(downloaded), media.sha256);
  assert.equal((await sharp(downloaded).metadata()).format, "jpeg");
  const s3 = new S3Client({
    region: settings.S3_REGION,
    endpoint: settings.S3_ENDPOINT,
    forcePathStyle: true,
  });
  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: settings.S3_BUCKET,
        Key: media.object_key,
      }),
    );
    const encrypted = Buffer.from(await object.Body.transformToByteArray());
    assert(encrypted.toString().startsWith("v1."));
    assert.deepEqual(
      Buffer.from(unseal(encrypted.toString()).base64, "base64"),
      downloaded,
    );
  } finally {
    s3.destroy();
  }
  const anonymous = await fetch(
    `${settings.S3_ENDPOINT.replace(/\/$/, "")}/${settings.S3_BUCKET}/${media.object_key}`,
    { signal: AbortSignal.timeout(15000) },
  );
  assert(
    [401, 403].includes(anonymous.status),
    "The bucket must deny anonymous file access",
  );
  await request(`media/${photo.id}`, "GET", undefined, 401, false);
  console.log(
    "PASS photo upload/download through Neon storage; encrypted bytes and private access verified",
  );

  await request(`projects/${projectId}/preview`);
  const pdf = (await request(`projects/${projectId}/proof`)).bytes;
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const repeatedPdf = (await request(`projects/${projectId}/proof`)).bytes;
  assert.deepEqual(
    repeatedPdf,
    pdf,
    "Saved PDF must be stable across requests",
  );
  console.log("PASS generated PDF stored and retrieved from Neon storage");

  await request("auth/logout", "POST", {});
  cookie = "";
  await login(email);
  const reloaded = (await request(`projects/${projectId}`)).json();
  assert(reloaded.project.memories.some((item) => item.text === story));
  assert.equal(reloaded.project.photos.length, 1);
  await request("auth/logout", "POST", {});
  cookie = "";
  console.log("PASS saved story and photo survive a fresh sign-in");
  console.log(
    `PASS ${checks} live HTTP checks; Neon database and private storage verified end to end`,
  );
  console.log(`Fictional verification manuscript retained: ${projectId}`);
}
main()
  .catch((error) => {
    console.error(`FAIL Neon verification: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (cookie) await request("auth/logout", "POST", {}).catch(() => {});
    await pool().end();
  });
