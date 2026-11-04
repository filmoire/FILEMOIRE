import { createHash, timingSafeEqual } from "node:crypto";
import { pool } from "./db";
import { assert } from "./security";

export function requireMonitor(request: Request) {
  const expected = process.env.MONITOR_TOKEN;
  assert(expected && expected.length >= 32, 503, "Monitoring indisponible.");
  const supplied = request.headers.get("authorization") || "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  assert(
    timingSafeEqual(digest(supplied), digest(`Bearer ${expected}`)),
    401,
    "Accès refusé.",
  );
}

export async function workerHealth() {
  // No story, email address, job payload, credentials or error details are exposed.
  const result = await pool().query(`SELECT
    (SELECT EXTRACT(EPOCH FROM now()-seen_at)::float FROM service_heartbeats WHERE name='worker') AS heartbeat_age,
    count(*) FILTER(WHERE state='failed')::int AS failed,
    count(*) FILTER(WHERE state='running' AND locked_at<now()-interval '15 minutes')::int AS stalled,
    COALESCE(max(EXTRACT(EPOCH FROM now()-run_at)) FILTER(WHERE state='pending' AND run_at<=now()),0)::float AS overdue_seconds
    FROM jobs`);
  const row = result.rows[0];
  const heartbeatAge =
    row.heartbeat_age === null ? null : Math.max(0, row.heartbeat_age);
  const issues = [
    ...(heartbeatAge === null || heartbeatAge > 180 ? ["worker_stale"] : []),
    ...(row.failed > 0 ? ["failed_jobs"] : []),
    ...(row.stalled > 0 ? ["stalled_jobs"] : []),
    ...(row.overdue_seconds > 300 ? ["queue_overdue"] : []),
  ];
  return {
    status: issues.length ? "degraded" : "ok",
    issues,
    workerAgeSeconds: heartbeatAge,
    failedJobs: row.failed,
    stalledJobs: row.stalled,
    overdueSeconds: Math.max(0, row.overdue_seconds),
  };
}
