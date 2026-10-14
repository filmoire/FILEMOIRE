import { Pool, type PoolClient } from "pg";
import { config } from "./config";
const scope = globalThis as typeof globalThis & { filemoirePool?: Pool };
export function pool() {
  return (scope.filemoirePool ??= new Pool({
    connectionString: config().DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  }));
}
export type DB = Pick<PoolClient, "query">;
export async function transaction<T>(
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool().connect();
  try {
    await db.query("BEGIN");
    const value = await fn(db);
    await db.query("COMMIT");
    return value;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
