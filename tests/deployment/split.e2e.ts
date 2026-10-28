import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  book,
  answer,
  newestEmailToken,
} from "../production/helpers";
import { pool } from "../../src/server/db";
import { unseal } from "../../src/server/security";

test.beforeAll(configureTests);
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);

test("split origin preserves login cookies, CSRF checks and 4 MiB binary upload parts", async ({
  request,
}) => {
  expect((await request.get("http://127.0.0.1:3301/")).status()).toBe(404);
  expect((await request.get("/acces")).status()).toBe(200);
  expect((await request.get("/api/v1/health")).status()).toBe(200);
  const b = await book();
  const view = await answer(b);
  const headers = { Origin: "http://localhost:3300" };
  expect(
    (
      await request.post("/api/v1/auth/request", {
        headers,
        data: { email: b.narrator.email },
      })
    ).status(),
  ).toBe(202);
  const messages = (
    await pool().query("SELECT payload FROM jobs WHERE kind='email'")
  ).rows;
  expect(
    messages
      .map((row) => unseal<{ text: string }>(row.payload).text)
      .some((text) => text.includes("http://localhost:3300/acces#token=")),
  ).toBe(true);
  const login = await request.post("/api/v1/auth/consume", {
    headers,
    data: { token: await newestEmailToken(b.narrator.email) },
  });
  expect(login.status()).toBe(200);
  expect(login.headers()["set-cookie"]).toContain("HttpOnly");
  expect(login.headers()["set-cookie"]).not.toMatch(/Domain=/i);
  expect((await (await request.get("/api/v1/me")).json()).account.id).toBe(
    b.narrator.id,
  );
  expect(
    (
      await request.post("/api/v1/auth/logout", {
        headers: { Origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);

  const bytes = randomBytes(4 * 1024 * 1024);
  const upload = await request.post(`/api/v1/projects/${b.projectId}/uploads`, {
    headers,
    data: {
      memoryId: view.project.memories[0].id,
      kind: "photo",
      bytes: bytes.length,
      mime: "image/jpeg",
      caption: "Boundary test",
    },
  });
  // No completion: random bytes deliberately exercise the transport, not image decoding.
  expect(upload.status()).toBe(201);
  const { id, chunkSize } = await upload.json();
  expect(chunkSize).toBe(bytes.length);
  expect(
    (
      await request.put(`/api/v1/uploads/${id}/0`, {
        headers: { ...headers, "Content-Type": "application/octet-stream" },
        data: bytes,
      })
    ).status(),
  ).toBe(200);
  expect(
    (await (await request.get(`/api/v1/uploads/${id}`)).json()).parts,
  ).toEqual([0]);
  expect(
    (await request.post("/api/v1/auth/logout", { headers, data: {} })).status(),
  ).toBe(200);
  expect((await request.get("/api/v1/projects")).status()).toBe(401);
});
