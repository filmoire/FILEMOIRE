import { type DB, pool } from "./db";
import { id, seal, unseal } from "./security";
export type Job = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  lock: string;
};
export async function enqueue(
  db: DB,
  kind: string,
  payload: unknown,
  key: string,
  at = new Date(),
) {
  await db.query(
    "INSERT INTO jobs(id,kind,payload,dedupe_key,run_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING",
    [id(), kind, seal(payload), key, at],
  );
}
export async function claimJob(): Promise<Job | null> {
  await pool().query(
    "UPDATE jobs SET state='failed',last_error='Worker lease expired after five attempts' WHERE state='running' AND attempts>=5 AND locked_at<now()-interval '15 minutes'",
  );
  const lock = id();
  const { rows } = await pool().query(
    `UPDATE jobs SET state='running',locked_at=now(),lock_token=$1,attempts=attempts+1 WHERE id=(SELECT id FROM jobs WHERE (state='pending' AND run_at<=now()) OR (state='running' AND locked_at<now()-interval '15 minutes') ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
    [lock],
  );
  return rows[0]
    ? {
        id: rows[0].id,
        kind: rows[0].kind,
        payload: unseal(rows[0].payload),
        attempts: rows[0].attempts,
        lock,
      }
    : null;
}
export async function finishJob(job: Job, failed = false) {
  await pool().query(
    `UPDATE jobs SET state=$3,run_at=now()+$4*interval '1 second',locked_at=NULL,lock_token=NULL,last_error=$5 WHERE id=$1 AND lock_token=$2`,
    [
      job.id,
      job.lock,
      failed ? (job.attempts >= 5 ? "failed" : "pending") : "done",
      Math.min(3600, 30 * 2 ** job.attempts),
      failed
        ? "Provider operation failed; inspect structured job diagnostics"
        : null,
    ],
  );
}
