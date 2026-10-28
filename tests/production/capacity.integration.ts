import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
  it,
  vi,
} from "vitest";
import sharp from "sharp";
import {
  configureTests,
  resetTests,
  book,
  answer,
  newestEmailToken,
} from "./helpers";
import { pool } from "../../src/server/db";
import { requestLogin, consumeLogin } from "../../src/server/auth";
import { beginUpload, uploadPart, finishUpload } from "../../src/server/media";
import { prepareProof } from "../../src/server/proofs";
import { id } from "../../src/server/security";

beforeAll(() => configureTests());
beforeEach(async () => {
  vi.stubEnv("ACCOUNT_LIMIT", "");
  vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "");
  vi.stubEnv("PROJECT_STORAGE_LIMIT_MB", "2048");
  await resetTests();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => pool().end());

it("admits only one concurrent signup into the last beta place and keeps existing logins working", async () => {
  vi.stubEnv("ACCOUNT_LIMIT", "1");
  const emails = ["first@example.test", "second@example.test"];
  await Promise.all(emails.map(requestLogin));
  const tokens = await Promise.all(emails.map(newestEmailToken));
  const outcomes = await Promise.allSettled(tokens.map(consumeLogin));
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter((r) => r.status === "rejected")).toHaveLength(1);
  const existing = (await pool().query("SELECT email FROM accounts")).rows;
  expect(existing).toHaveLength(1);
  await requestLogin(existing[0].email);
  await expect(
    consumeLogin(await newestEmailToken(existing[0].email)),
  ).resolves.toBeTruthy();
  await expect(requestLogin("outside@example.test")).rejects.toMatchObject({
    status: 503,
  });
});

async function readyBook() {
  const b = await book();
  const view = await answer(b);
  return { ...b, memoryId: view.project.memories[0].id };
}
function photo(memoryId: string, bytes: number) {
  return {
    memoryId,
    kind: "photo",
    bytes,
    mime: "image/png",
    caption: "Capacity fixture",
  };
}

it("serializes reservations across books so concurrent uploads cannot exceed the site budget", async () => {
  const a = await readyBook(),
    b = await readyBook();
  vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "1");
  const results = await Promise.allSettled([
    beginUpload(a.narrator, a.projectId, photo(a.memoryId, 700000)),
    beginUpload(b.narrator, b.projectId, photo(b.memoryId, 700000)),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(
    Number(
      (await pool().query("SELECT sum(bytes) AS total FROM uploads")).rows[0]
        .total,
    ),
  ).toBe(700000);
});

it("keeps expired reservations charged until actual worker cleanup and enforces the book limit", async () => {
  const b = await readyBook();
  vi.stubEnv("PROJECT_STORAGE_LIMIT_MB", "1");
  await beginUpload(b.narrator, b.projectId, photo(b.memoryId, 700000));
  await pool().query("UPDATE uploads SET expires_at=now()-interval '1 minute'");
  await expect(
    beginUpload(b.narrator, b.projectId, photo(b.memoryId, 700000)),
  ).rejects.toMatchObject({ status: 413 });
});

async function fillMedia(projectId: string, ownerId: string) {
  await pool().query(
    "INSERT INTO media(id,project_id,owner_id,object_key,kind,mime,bytes,sha256) VALUES($1,$2,$3,$4,'photo','image/jpeg',1048576,$5)",
    [id(), projectId, ownerId, `capacity-fixture/${id()}`, "fixture"],
  );
}

it("rechecks final media size before storing a completed upload", async () => {
  const b = await readyBook();
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#eee" },
  })
    .png()
    .toBuffer();
  const upload = await beginUpload(
    b.narrator,
    b.projectId,
    photo(b.memoryId, image.length),
  );
  await uploadPart(b.narrator, upload.id, 0, image);
  await fillMedia(b.projectId, b.narrator.id);
  vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "1");
  await expect(finishUpload(b.narrator, upload.id)).rejects.toMatchObject({
    status: 503,
  });
  expect(
    (await pool().query("SELECT status FROM uploads WHERE id=$1", [upload.id]))
      .rows[0].status,
  ).toBe("uploading");
  expect(
    (await pool().query("SELECT id FROM media WHERE id=$1", [upload.id]))
      .rowCount,
  ).toBe(0);
});

it("includes generated PDFs in the storage budget", async () => {
  const b = await readyBook();
  await fillMedia(b.projectId, b.narrator.id);
  vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "1");
  await expect(prepareProof(b.narrator, b.projectId)).rejects.toMatchObject({
    status: 503,
  });
  expect(
    (await pool().query("SELECT id FROM media WHERE kind='pdf'")).rowCount,
  ).toBe(0);
});
