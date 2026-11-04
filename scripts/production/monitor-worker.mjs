import { pathToFileURL } from "node:url";

export async function checkWorker(origin, token, { fetcher = fetch } = {}) {
  const base = new URL(origin);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    !(
      base.protocol === "https:" ||
      (base.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(base.hostname))
    )
  )
    throw new Error("A trusted HTTPS origin or local HTTP origin is required");
  if (!token || token.length < 32)
    throw new Error("MONITOR_TOKEN must be configured securely");
  try {
    const response = await fetcher(new URL("/api/v1/health/worker", base), {
      redirect: "error",
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    });
    const data = await response.json();
    const allowed = [
      "worker_stale",
      "failed_jobs",
      "stalled_jobs",
      "queue_overdue",
    ];
    const issues = Array.isArray(data.issues)
      ? data.issues.filter((s) => allowed.includes(s))
      : [];
    const valid =
      data.status === "ok" &&
      Array.isArray(data.issues) &&
      data.issues.length === 0;
    return {
      ok: response.status === 200 && valid,
      status: response.status,
      issues,
    };
  } catch {
    return { ok: false, status: "unreachable or invalid response", issues: [] };
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await checkWorker(
      process.env.MONITOR_ORIGIN || "https://www.filemoire.fr",
      process.env.MONITOR_TOKEN,
    );
    console.log(
      `${result.ok ? "PASS" : "FAIL"} worker/queue: ${result.status}${result.issues.length ? ` (${result.issues.join(", ")})` : ""}`,
    );
    if (!result.ok) process.exitCode = 1;
  } catch {
    console.error("Worker monitor configuration is missing or invalid.");
    process.exitCode = 1;
  }
}
