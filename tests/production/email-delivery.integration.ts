import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  newestEmailToken,
} from "./helpers";
import { requestLogin, consumeLogin } from "../../src/server/auth";
import { handleApi } from "../../src/server/api";
import { processOne } from "../../src/server/worker";
import { pool } from "../../src/server/db";
import { enqueue } from "../../src/server/jobs";
import { randomUUID } from "node:crypto";

beforeAll(configureTests);
beforeEach(async () => {
  await resetTests();
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("EMAIL_FROM", "Filémoire <sender@example.test>");
  vi.stubEnv("RESEND_API_KEY", "test-key-never-sent");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(closeTestDatabase);

async function delivery(receipt: string) {
  const response = await handleApi(
    new Request(`http://localhost:3300/api/v1/auth/delivery/${receipt}`),
    ["auth", "delivery", receipt],
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}

it("reports queued, then provider-accepted mail, and keeps the link single-use", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "provider-confirmation" }));
  vi.stubGlobal("fetch", fetch);
  const response = await handleApi(
    new Request("http://localhost:3300/api/v1/auth/request", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3300",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "delivery@example.test" }),
    }),
    ["auth", "request"],
  );
  expect(response.status).toBe(202);
  const request = await response.json();
  expect(request.status).toBe("pending");
  expect(request.receipt).toMatch(/^[\da-f-]{36}$/);
  expect(await delivery(request.receipt)).toEqual({ status: "pending" });
  await processOne();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await delivery(request.receipt)).toEqual({ status: "sent" });
  const token = await newestEmailToken("delivery@example.test");
  expect(JSON.stringify(request)).not.toContain(token);
  await consumeLogin(token);
  expect(await delivery(request.receipt)).toEqual({ status: "expired" });
  await expect(consumeLogin(token)).rejects.toMatchObject({ status: 400 });
});

it("shows permanent Resend rejection instead of success and does not retry it", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response("private email and token", { status: 403 }),
    );
  vi.stubGlobal("fetch", fetch);
  const receipt = await requestLogin("blocked@example.test");
  await processOne();
  expect(await delivery(receipt!)).toEqual({ status: "failed" });
  expect(await processOne()).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledWith(
    expect.stringContaining('"providerStatus":403'),
  );
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /private|blocked@example|test-key/,
  );
});

it("retains retries for temporary rate limits without claiming success", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 429 })),
  );
  const receipt = await requestLogin("retry@example.test");
  await processOne();
  expect(await delivery(receipt!)).toEqual({ status: "pending" });
});

it("does not send expired login links or expose unrelated queue payloads", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const receipt = await requestLogin("expired@example.test");
  await pool().query(
    "UPDATE login_tokens SET expires_at=now()-interval '1 minute'",
  );
  await pool().query(
    "UPDATE jobs SET created_at=now()-interval '16 minutes' WHERE id=$1",
    [receipt],
  );
  await processOne();
  expect(fetch).not.toHaveBeenCalled();
  expect(await delivery(receipt!)).toEqual({ status: "expired" });
  expect(await delivery(randomUUID())).toEqual({ status: "expired" });
  const unrelated = await enqueue(
    pool(),
    "email",
    { to: "private@example.test", text: "private narrative" },
    "invitation-test",
  );
  expect(await delivery(unrelated!)).toEqual({ status: "expired" });
});
