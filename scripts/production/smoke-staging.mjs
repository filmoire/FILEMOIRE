// Read credentials from the environment; never print passwords, tokens or URLs containing them.
import assert from "node:assert/strict";

async function main() {
  const target = new URL(process.argv[2]);
  if (
    target.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(target.hostname)
  )
    throw new Error("Use HTTPS for remote staging");
  if (!process.env.STAGING_ACCESS_USER || !process.env.STAGING_ACCESS_PASSWORD)
    throw new Error(
      "Staging access credentials must be supplied through the environment",
    );
  const authorization = `Basic ${Buffer.from(`${process.env.STAGING_ACCESS_USER}:${process.env.STAGING_ACCESS_PASSWORD}`).toString("base64")}`;
  const request = (path, authenticated = false) =>
    fetch(new URL(path, target), {
      headers: authenticated ? { authorization } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(90000), // A free instance may need to wake up.
    });
  const health = await request("/api/v1/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  console.log("PASS health and database");
  for (const path of [
    "/",
    "/acces",
    "/espace",
    "/api/v1/catalog",
    "/api/v1/me",
    "/demo/jardin.svg",
  ]) {
    assert.equal(
      (await request(path)).status,
      401,
      `Anonymous access allowed: ${path}`,
    );
  }
  console.log("PASS anonymous access protection");
  const login = await request("/acces", true);
  assert.equal(login.status, 200);
  assert.match(login.headers.get("cache-control") ?? "", /no-store/);
  const html = await login.text();
  assert.match(html, /Préproduction privée/);
  const script = html.match(/src="([^" ]*\/_next\/static\/[^" ]+\.js)"/)?.[1];
  assert.ok(script, "Expected application JavaScript asset");
  assert.equal((await request(script)).status, 401);
  assert.equal((await request(script, true)).status, 200);
  assert.equal((await request("/demo/jardin.svg", true)).status, 200);
  assert.equal((await request("/demo/boite-mail", true)).status, 404);
  const session = await request("/api/v1/me", true);
  assert.equal(session.status, 200);
  assert.equal((await session.json()).account, null);
  assert.equal((await request("/api/v1/projects", true)).status, 401);
  const catalog = await request("/api/v1/catalog", true);
  assert.equal(catalog.status, 200);
  assert.equal((await catalog.json()).ordersOpen, false);
  console.log(
    "PASS protected login page, staging notice, assets, account boundary and closed checkout",
  );
  console.log(
    "Login email delivery, media persistence and PDF generation still need separate end-to-end verification.",
  );
}
main().catch((error) => {
  console.error(`Staging smoke check failed: ${error.message}`);
  process.exitCode = 1;
});
