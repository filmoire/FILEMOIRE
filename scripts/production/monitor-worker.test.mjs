import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWorker } from "./monitor-worker.mjs";
const token = "fixture-monitor-token-not-a-secret";
test("uses bearer auth, forbids redirects and accepts healthy status", async () => {
  const result = await checkWorker("https://example.test", token, {
    fetcher: async (url, init) => {
      assert.equal(url.pathname, "/api/v1/health/worker");
      assert.equal(init.headers.Authorization, `Bearer ${token}`);
      assert.equal(init.redirect, "error");
      return Response.json({ status: "ok", issues: [] });
    },
  });
  assert.equal(result.ok, true);
});
test("does not log response secrets, missing health or provider errors", async () => {
  for (const response of [
    Response.json({ error: "secret" }, { status: 401 }),
    Response.json({}),
    Response.json(
      { status: "degraded", issues: ["failed_jobs", "secret"] },
      { status: 503 },
    ),
  ]) {
    const result = await checkWorker("https://example.test", token, {
      fetcher: async () => response,
    });
    assert.equal(result.ok, false);
    assert.ok(!JSON.stringify(result).includes("secret"));
  }
});
test("rejects insecure and credential-bearing origins before sending token", async () => {
  for (const origin of [
    "http://example.test",
    "https://user:pass@example.test",
    "https://example.test/?token=x",
    "https://example.test/path",
  ]) {
    await assert.rejects(
      checkWorker(origin, token, {
        fetcher: () => {
          throw new Error("should not call");
        },
      }),
    );
  }
  await assert.rejects(checkWorker("https://example.test", "short"));
});
