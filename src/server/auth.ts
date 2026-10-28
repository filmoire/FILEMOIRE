import { cookies } from "next/headers";
import { TOTP, Secret } from "otpauth";
import { config } from "./config";
import { pool, transaction } from "./db";
import {
  assert,
  hash,
  secret,
  id,
  seal,
  unseal,
  rateLimit,
  audit,
} from "./security";
import { enqueue } from "./jobs";
import { stagingEmailAllowed } from "@/lib/deployment";
import { assertSignupCapacity } from "./capacity";
export type Account = {
  id: string;
  email: string;
  name: string;
  admin: boolean;
  mfa: boolean;
};
export const cookieName = () =>
  config().APP_ORIGIN.startsWith("https://")
    ? "__Host-filemoire"
    : "filemoire_session";
export async function currentAccount(token?: string): Promise<Account | null> {
  const raw = token ?? (await cookies()).get(cookieName())?.value;
  if (!raw) return null;
  const { rows } = await pool().query(
    "SELECT a.id,a.email,a.name,s.mfa_verified_at FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [hash(raw)],
  );
  if (!rows[0]) return null;
  const a = rows[0];
  if (!stagingEmailAllowed(a.email)) return null;
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    admin: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .includes(a.email),
    mfa:
      !!a.mfa_verified_at &&
      Date.now() - new Date(a.mfa_verified_at).getTime() < 3600000,
  };
}
export async function requireAccount() {
  const a = await currentAccount();
  assert(a, 401, "Connectez-vous pour continuer.");
  return a;
}
export function requireAdmin(a: Account) {
  assert(
    a.admin && a.mfa,
    403,
    "Authentification administrateur renforcée requise.",
  );
}
export async function requestLogin(email: string) {
  assert(
    stagingEmailAllowed(email),
    403,
    "Accès à la préproduction réservé aux comptes autorisés.",
  );
  await rateLimit(`login:${email}`, 5, 900);
  await assertSignupCapacity(pool(), email);
  const token = secret();
  await transaction(async (db) => {
    await db.query(
      "INSERT INTO login_tokens(token_hash,email,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
      [hash(token), email],
    );
    await enqueue(
      db,
      "email",
      {
        to: email,
        subject: "Votre lien de connexion Filémoire",
        text: `Connectez-vous avec ce lien valable 15 minutes : ${config().APP_ORIGIN}/acces#token=${token}\nIgnorez cet e-mail si vous ne l’avez pas demandé.`,
      },
      `login:${hash(token)}`,
    );
  });
}
export async function consumeLogin(token: string) {
  const session = secret();
  const account = await transaction(async (db) => {
    if (config().ACCOUNT_LIMIT)
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('filemoire-signups'))",
      );
    const { rows } = await db.query(
      "UPDATE login_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING email",
      [hash(token)],
    );
    assert(rows[0], 400, "Ce lien a expiré ou a déjà été utilisé.");
    assert(
      stagingEmailAllowed(rows[0].email),
      403,
      "Accès à la préproduction réservé aux comptes autorisés.",
    );
    await assertSignupCapacity(db, rows[0].email);
    const a = await db.query(
      "INSERT INTO accounts(id,email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,email,name",
      [id(), rows[0].email],
    );
    await db.query(
      "INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [hash(session), a.rows[0].id],
    );
    await audit(db, a.rows[0].id, null, "login");
    return a.rows[0];
  });
  return { session, account };
}
export async function logout() {
  const c = await cookies();
  const token = c.get(cookieName())?.value;
  if (token)
    await pool().query("DELETE FROM sessions WHERE token_hash=$1", [
      hash(token),
    ]);
  c.delete(cookieName());
}
export async function setSession(token: string) {
  (await cookies()).set(cookieName(), token, {
    httpOnly: true,
    secure: config().APP_ORIGIN.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function mfaSetup(a: Account) {
  assert(a.admin, 403, "Accès refusé.");
  return transaction(async (db) => {
    const row = await db.query(
      "SELECT mfa_confirmed FROM accounts WHERE id=$1 FOR UPDATE",
      [a.id],
    );
    assert(
      !row.rows[0].mfa_confirmed,
      409,
      "Un authentificateur est déjà configuré.",
    );
    const totp = new TOTP({
      issuer: "Filémoire",
      label: a.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new Secret({ size: 20 }),
    });
    await db.query("UPDATE accounts SET mfa_secret=$2 WHERE id=$1", [
      a.id,
      seal(totp.secret.base32),
    ]);
    return { uri: totp.toString() };
  });
}
export async function verifyMfa(
  a: Account,
  code: string,
  sessionToken?: string,
) {
  assert(a.admin, 403, "Accès refusé.");
  await rateLimit(`mfa:${a.id}`, 5, 300);
  const token = sessionToken ?? (await cookies()).get(cookieName())?.value;
  assert(token, 401, "Session expirée.");
  await transaction(async (db) => {
    const { rows } = await db.query(
      "SELECT mfa_secret,last_mfa_step FROM accounts WHERE id=$1 FOR UPDATE",
      [a.id],
    );
    assert(rows[0]?.mfa_secret, 400, "Configurez un authentificateur.");
    const totp = new TOTP({
      secret: Secret.fromBase32(unseal<string>(rows[0].mfa_secret)),
    });
    const now = Date.now();
    const delta = totp.validate({ token: code, window: 1, timestamp: now });
    const step = Math.floor(now / 30000) + (delta ?? 0);
    assert(
      delta !== null && step > Number(rows[0].last_mfa_step),
      400,
      "Code incorrect ou déjà utilisé.",
    );
    const session = await db.query(
      "UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1 AND account_id=$2 AND expires_at>now() RETURNING token_hash",
      [hash(token), a.id],
    );
    assert(session.rowCount, 401, "Session expirée.");
    await db.query(
      "UPDATE accounts SET mfa_confirmed=true,last_mfa_step=$2 WHERE id=$1",
      [a.id, step],
    );
    await audit(db, a.id, null, "mfa.verified");
  });
}
