import test from "node:test";
import assert from "node:assert/strict";
import { checkWebsite } from "./monitor.mjs";

function healthy(url) {
  if (url.pathname === "/api/v1/health") return Response.json({ status: "ok" });
  if (url.pathname === "/api/v1/catalog")
    return Response.json({ packages: [] });
  if (url.pathname.endsWith(".png"))
    return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
      headers: { "content-type": "image/png" },
    });
  return new Response("<h1>Filémoire</h1><form></form>", {
    headers: { "content-type": "text/html" },
  });
}
test("accepts healthy public routes without cookies or authentication", async () => {
  const rows = await checkWebsite("https://example.test", {
    fetcher: async (url, options) => {
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Cookie, undefined);
      assert.equal(options.headers.Authorization, undefined);
      return healthy(url);
    },
  });
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.ok && row.attempt === 1));
});
test("retries a cold backend but reports persistent DB failure", async () => {
  let healthCalls = 0;
  const rows = await checkWebsite("https://example.test", {
    fetcher: async (url) => {
      if (url.pathname.endsWith("health")) {
        healthCalls++;
        return Response.json({ status: "error" }, { status: 503 });
      }
      return healthy(url);
    },
  });
  assert.equal(healthCalls, 2);
  assert.equal(rows.find((row) => row.name.includes("database")).ok, false);
});
test("rejects an HTML error page disguised as successful API response", async () => {
  const rows = await checkWebsite("https://example.test", {
    fetcher: async (url) =>
      url.pathname.endsWith("health")
        ? new Response("<h1>Unavailable</h1>", {
            headers: { "content-type": "text/html" },
          })
        : healthy(url),
  });
  assert.equal(rows.find((row) => row.name.includes("database")).ok, false);
});
test("rejects credential-bearing URLs before any network request", async () => {
  await assert.rejects(
    checkWebsite("https://user:secret@example.test", {
      fetcher: async () => {
        throw new Error("must not fetch");
      },
    }),
    /HTTPS origin/,
  );
});
