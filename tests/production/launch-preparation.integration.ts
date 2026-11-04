import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { configureTests, resetTests, closeTestDatabase, book } from "./helpers";
import { pool } from "../../src/server/db";
import { id, unseal } from "../../src/server/security";
import { requestWithdrawal } from "../../src/server/withdrawal";
import { workerHealth } from "../../src/server/monitoring";
import { handleApi } from "../../src/server/api";
import { enqueue } from "../../src/server/jobs";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
beforeAll(configureTests);
beforeEach(async () => {
  await resetTests();
  delete process.env.MONITOR_TOKEN;
});
afterAll(async () => {
  delete process.env.MONITOR_TOKEN;
  await closeTestDatabase();
});
const declaration = () => ({
  requestKey: id(),
  name: "Camille Test",
  email: "fixture@example.test",
  orderReference: "FM-FICTIONAL",
  language: "en",
  confirmed: true,
});
function request(path: string, method = "GET", body?: unknown, headers = {}) {
  return handleApi(
    new Request(`${process.env.APP_ORIGIN}/api/v1/${path}`, {
      method,
      headers: {
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    path.split("/"),
  );
}
it("records one encrypted declaration and durable acknowledgement across concurrent retries", async () => {
  const value = declaration();
  const [first, second] = await Promise.all([
    requestWithdrawal(value),
    requestWithdrawal(value),
  ]);
  expect(first).toEqual(second);
  expect(first.text).toContain(value.orderReference);
  expect(first.text).toContain(first.receivedAt);
  expect(first.text).toContain("I notify Intertrad that I withdraw");
  const rows = await pool().query("SELECT * FROM support_requests");
  expect(rows.rowCount).toBe(1);
  expect(rows.rows[0].payload).not.toContain(value.email);
  expect(unseal(rows.rows[0].payload)).toMatchObject({
    topic: "retractation",
    email: value.email,
  });
  const jobs = await pool().query(
    "SELECT payload FROM jobs WHERE dedupe_key=$1",
    [`withdrawal:${first.id}`],
  );
  expect(jobs.rowCount).toBe(1);
  expect(unseal(jobs.rows[0].payload)).toMatchObject({
    to: value.email,
    text: first.text,
  });
  await expect(
    requestWithdrawal({ ...value, email: "someone-else@example.test" }),
  ).rejects.toMatchObject({ status: 409 });
});
it("accepts declarations without login and never discloses or automatically changes an order", async () => {
  const b = await book();
  const value = {
    ...declaration(),
    orderReference: `FM-${b.orderId.slice(0, 8).toUpperCase()}`,
    email: b.buyer.email,
  };
  const response = await request("withdrawals", "POST", value);
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    id: value.requestKey,
    emailStatus: "queued",
  });
  const order = (
    await pool().query(
      "SELECT status,refund_requested,production_committed FROM orders WHERE id=$1",
      [b.orderId],
    )
  ).rows[0];
  expect(order).toEqual({
    status: "paid",
    refund_requested: false,
    production_committed: false,
  });
  expect((await request("withdrawals", "POST", declaration())).status).toBe(
    201,
  );
});
it("rejects missing confirmation, cross-origin submission and excessive confirmation emails", async () => {
  expect(
    (
      await request("withdrawals", "POST", {
        ...declaration(),
        confirmed: false,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await request("withdrawals", "POST", declaration(), {
        origin: "https://attacker.example",
      })
    ).status,
  ).toBe(403);
  expect((await pool().query("SELECT * FROM support_requests")).rowCount).toBe(
    0,
  );
  for (let n = 0; n < 5; n++)
    expect((await request("withdrawals", "POST", declaration())).status).toBe(
      201,
    );
  expect((await request("withdrawals", "POST", declaration())).status).toBe(
    429,
  );
  expect((await pool().query("SELECT * FROM support_requests")).rowCount).toBe(
    5,
  );
});
it("keeps worker details protected by a dedicated credential, separate from public DB health", async () => {
  expect((await request("health/worker")).status).toBe(503);
  process.env.MONITOR_TOKEN = "synthetic-monitor-token-at-least-32-chars";
  expect((await request("health/worker")).status).toBe(401);
  expect(
    (
      await request("health/worker", "GET", undefined, {
        authorization: "Bearer incorrect",
      })
    ).status,
  ).toBe(401);
  expect((await request("health")).status).toBe(200);
  const missing = await request("health/worker", "GET", undefined, {
    authorization: `Bearer ${process.env.MONITOR_TOKEN}`,
  });
  expect(missing.status).toBe(503);
  expect(await missing.json()).toMatchObject({ issues: ["worker_stale"] });
  await pool().query("INSERT INTO service_heartbeats(name) VALUES('worker')");
  expect(
    (
      await request("health/worker", "GET", undefined, {
        authorization: `Bearer ${process.env.MONITOR_TOKEN}`,
      })
    ).status,
  ).toBe(200);
});
it("detects stale heartbeat, overdue work, failed and stalled jobs without leaking payloads", async () => {
  await pool().query(
    "INSERT INTO service_heartbeats(name,seen_at) VALUES('worker',now()-interval '4 minutes')",
  );
  await enqueue(
    pool(),
    "email",
    { to: "private@example.test" },
    "overdue",
    new Date(Date.now() - 6 * 60000),
  );
  await enqueue(pool(), "email", { to: "private@example.test" }, "failed");
  await enqueue(pool(), "email", { to: "private@example.test" }, "stalled");
  await pool().query(
    "UPDATE jobs SET state='failed' WHERE dedupe_key='failed'",
  );
  await pool().query(
    "UPDATE jobs SET state='running',locked_at=now()-interval '16 minutes' WHERE dedupe_key='stalled'",
  );
  const result = await workerHealth();
  expect(result.issues).toEqual([
    "worker_stale",
    "failed_jobs",
    "stalled_jobs",
    "queue_overdue",
  ]);
  expect(JSON.stringify(result)).not.toContain("private");
  await pool().query("UPDATE service_heartbeats SET seen_at=now()");
  await pool().query(
    "UPDATE jobs SET state='pending',run_at=now()+interval '30 days',locked_at=NULL",
  );
  expect(await workerHealth()).toMatchObject({
    status: "ok",
    issues: [],
    overdueSeconds: 0,
  });
});
