import type { Account } from "./auth";
import type { Project } from "@/lib/types";
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
    const p = unseal<Project>(row.payload),
      contentHash = bookHash(p);
    const existing = (
      await db.query(
        "SELECT id,pdf_media_id FROM book_versions WHERE project_id=$1 AND revision=$2 AND content_hash=$3",
        [projectId, row.revision, contentHash],
      )
    ).rows[0];
    if (existing?.pdf_media_id)
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
        "INSERT INTO book_versions(id,project_id,revision,content_hash,payload,pdf_media_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(project_id,revision) DO UPDATE SET pdf_media_id=EXCLUDED.pdf_media_id RETURNING id",
        [id(), projectId, row.revision, contentHash, row.payload, mediaId],
      )
    ).rows[0];
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
