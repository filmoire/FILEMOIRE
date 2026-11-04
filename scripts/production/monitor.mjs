import { pathToFileURL } from "node:url";

// Anonymous checks only: no sessions, login emails, production secrets or data writes.
export async function checkWebsite(
  origin,
  { fetcher = fetch, attempts = 2, timeoutMs = 45000 } = {},
) {
  const base = new URL(origin);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    (base.protocol !== "https:" &&
      !(
        base.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(base.hostname)
      ))
  ) {
    throw new Error("Provide a public HTTPS origin or local HTTP test origin");
  }
  const checks = [
    {
      name: "homepage",
      path: "/",
      type: "text/html",
      valid: async (r) => /Fil[ée]moire/i.test(await r.text()),
    },
    {
      name: "sign-in page",
      path: "/acces",
      type: "text/html",
      valid: async (r) => /<form[\s>]/i.test(await r.text()),
    },
    {
      name: "database health through frontend proxy",
      path: "/api/v1/health",
      type: "application/json",
      valid: async (r) => (await r.json()).status === "ok",
    },
    {
      name: "catalog",
      path: "/api/v1/catalog",
      type: "application/json",
      valid: async (r) => Array.isArray((await r.json()).packages),
    },
    {
      name: "email/dashboard logo",
      path: "/brand/filemoire-logo.png",
      type: "image/png",
      valid: async (r) =>
        Buffer.from(await r.arrayBuffer())
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
  ];
  const results = [];
  for (const check of checks) {
    let result;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const started = Date.now();
      try {
        const response = await fetcher(new URL(check.path, base), {
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            "User-Agent": "FilemoireReadinessMonitor/1.0",
            "Cache-Control": "no-cache",
          },
        });
        const valid =
          response.status === 200 &&
          response.headers.get("content-type")?.includes(check.type) &&
          (await check.valid(response));
        result = {
          name: check.name,
          ok: !!valid,
          status: response.status,
          attempt,
          ms: Date.now() - started,
        };
      } catch {
        result = {
          name: check.name,
          ok: false,
          status: "unreachable or invalid response",
          attempt,
          ms: Date.now() - started,
        };
      }
      if (result.ok) break;
    }
    results.push(result);
  }
  return results;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const results = await checkWebsite(
    process.env.MONITOR_ORIGIN || "https://www.filemoire.fr",
  );
  for (const row of results)
    console.log(
      `${row.ok ? "PASS" : "FAIL"} ${row.name}: HTTP ${row.status}, attempt ${row.attempt}, ${row.ms}ms`,
    );
  console.log(
    "Scope: public availability and DB reachability only; not worker/email delivery, backups or human acceptance.",
  );
  if (results.some((row) => !row.ok)) process.exitCode = 1;
}
