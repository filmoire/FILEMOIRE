import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { config } from "./config";
import { pool, type DB } from "./db";
export const id = () => randomUUID();
export const secret = () => randomBytes(32).toString("base64url");
export const hash = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(config().DATA_ENCRYPTION_KEY, "base64"),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function unseal<T>(value: string): T {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1") throw new Error("Unsupported encryption envelope");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(config().DATA_ENCRYPTION_KEY, "base64"),
    Buffer.from(iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(body, "base64")),
      cipher.final(),
    ]).toString(),
  );
}
export function hashCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(code, salt, 32).toString("hex")}`;
}
export function checkCode(code: string, encoded: string) {
  const [salt, digest] = encoded.split(":");
  const expected = Buffer.from(digest, "hex");
  const actual = scryptSync(code, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(
  ok: unknown,
  status: number,
  message: string,
): asserts ok {
  if (!ok) throw new HttpError(status, message);
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const { rows } = await pool().query(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+$2*interval '1 second' ELSE rate_limits.expires_at END RETURNING count`,
    [hash(key), seconds],
  );
  assert(rows[0].count <= max, 429, "Trop de tentatives. Réessayez plus tard.");
}
export function sameOrigin(request: Request) {
  assert(
    request.headers.get("origin") === new URL(config().APP_ORIGIN).origin,
    403,
    "Origine refusée.",
  );
}
export async function audit(
  db: DB,
  actor: string | null,
  project: string | null,
  action: string,
) {
  await db.query(
    "INSERT INTO audit_events(id,actor_id,project_id,action) VALUES($1,$2,$3,$4)",
    [id(), actor, project, action],
  );
}
