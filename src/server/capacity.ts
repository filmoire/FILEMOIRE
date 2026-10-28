import { config } from "./config";
import type { DB } from "./db";
import { assert } from "./security";

export async function assertSignupCapacity(db: DB, email: string) {
  const limit = config().ACCOUNT_LIMIT;
  if (!limit) return;
  const { rows } = await db.query(
    "SELECT EXISTS(SELECT 1 FROM accounts WHERE email=$1) AS existing, (SELECT count(*) FROM accounts) AS total",
    [email],
  );
  assert(
    rows[0].existing || Number(rows[0].total) < limit,
    503,
    "La bêta est complète. Les comptes existants peuvent toujours se connecter.",
  );
}

// Acquire before project/upload row locks in every path that adds stored bytes.
export async function lockMediaCapacity(db: DB) {
  if (config().TOTAL_MEDIA_LIMIT_MB)
    await db.query(
      "SELECT pg_advisory_xact_lock(hashtext('filemoire-media-capacity'))",
    );
}

export async function assertMediaCapacity(
  db: DB,
  projectId: string,
  bytes: number,
  completingUpload?: string,
) {
  const c = config();
  // Expired reservations still count until the worker actually cleans them up.
  const { rows } = await db.query(
    `SELECT
      COALESCE((SELECT sum(bytes) FROM media WHERE project_id=$1),0) +
      COALESCE((SELECT sum(bytes) FROM uploads WHERE project_id=$1 AND status='uploading' AND ($2::uuid IS NULL OR id<>$2)),0) AS project_bytes,
      CASE WHEN $3 THEN
        COALESCE((SELECT sum(bytes) FROM media),0) +
        COALESCE((SELECT sum(bytes) FROM uploads WHERE status='uploading' AND ($2::uuid IS NULL OR id<>$2)),0)
      ELSE 0 END AS total_bytes`,
    [projectId, completingUpload ?? null, !!c.TOTAL_MEDIA_LIMIT_MB],
  );
  assert(
    Number(rows[0].project_bytes) + bytes <=
      c.PROJECT_STORAGE_LIMIT_MB * 1024 ** 2,
    413,
    "Limite de stockage du livre atteinte.",
  );
  assert(
    !c.TOTAL_MEDIA_LIMIT_MB ||
      Number(rows[0].total_bytes) + bytes <= c.TOTAL_MEDIA_LIMIT_MB * 1024 ** 2,
    503,
    "Le stockage de la bêta est complet. Réessayez après avoir supprimé des fichiers.",
  );
}
