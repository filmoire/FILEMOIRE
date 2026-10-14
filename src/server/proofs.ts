import type { Account } from "./auth";
import type { Project } from "@/lib/types";
import { isLocked } from "@/lib/rules";
import { pool, transaction } from "./db";
import { accessProject, bookHash } from "./projects";
import { assert, hash, id, unseal } from "./security";
import { putObject, getObject } from "./storage";
import { renderProof } from "./pdf";

/** Persist the exact PDF being reviewed. Approval and print reuse these bytes. */
export async function prepareProof(a: Account, projectId: string) {
  return transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "narrator" && !row.deletion_at, 403, "Accès refusé.");
    const p = unseal<Project>(row.payload);
    const locked = isLocked(p);
    const existing = (
      await db.query(
        `SELECT id,revision,content_hash,pdf_media_id,approved_at FROM book_versions
         WHERE project_id=$1 AND (($3 AND approved_at IS NOT NULL) OR (NOT $3 AND revision=$2))
         ORDER BY revision DESC LIMIT 1`,
        [projectId, row.revision, locked],
      )
    ).rows[0];
    // Approval freezes the bytes, including across renderer upgrades or later
    // preference revisions. A missing approved artifact must never be recreated.
    if (locked || existing?.approved_at) {
      assert(
        existing?.approved_at && existing.pdf_media_id,
        503,
        "Épreuve approuvée indisponible.",
      );
      return {
        versionId: existing.id,
        contentHash: existing.content_hash,
        revision: existing.revision,
        mediaId: existing.pdf_media_id,
      };
    }
    const contentHash = bookHash(p);
    if (existing?.pdf_media_id && existing.content_hash === contentHash)
      return {
        versionId: existing.id,
        contentHash,
        revision: row.revision,
        mediaId: existing.pdf_media_id,
      };
    const bytes = await renderProof(p, db),
      mediaId = id(),
      key = `media/${projectId}/${mediaId}`;
    await putObject(key, bytes);
    await db.query(
      "INSERT INTO media(id,project_id,owner_id,object_key,kind,mime,bytes,sha256) VALUES($1,$2,$3,$4,'pdf','application/pdf',$5,$6)",
      [mediaId, projectId, a.id, key, bytes.length, hash(bytes)],
    );
    const version = (
      await db.query(
        `INSERT INTO book_versions(id,project_id,revision,content_hash,payload,pdf_media_id) VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(project_id,revision) DO UPDATE SET pdf_media_id=EXCLUDED.pdf_media_id,content_hash=EXCLUDED.content_hash,payload=EXCLUDED.payload
         WHERE book_versions.approved_at IS NULL RETURNING id`,
        [id(), projectId, row.revision, contentHash, row.payload, mediaId],
      )
    ).rows[0];
    assert(version, 409, "Cette épreuve est déjà approuvée.");
    return {
      versionId: version.id,
      contentHash,
      revision: row.revision,
      mediaId,
    };
  });
}
export async function proofBytes(
  a: Account,
  projectId: string,
  versionId?: string,
) {
  const row = await accessProject(pool(), a, projectId);
  assert(row.role === "narrator", 403, "Accès refusé.");
  const vid = versionId ?? (await prepareProof(a, projectId)).versionId;
  const file = (
    await pool().query(
      "SELECT m.object_key,m.sha256 FROM book_versions v JOIN media m ON m.id=v.pdf_media_id WHERE v.id=$1 AND v.project_id=$2",
      [vid, projectId],
    )
  ).rows[0];
  assert(file, 404, "Épreuve introuvable.");
  const bytes = await getObject(file.object_key);
  assert(hash(bytes) === file.sha256, 503, "Épreuve indisponible.");
  return bytes;
}
