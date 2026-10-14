import { z } from "zod";
import type { Project } from "@/lib/types";
import { pkg } from "@/lib/catalog";
import type { Account } from "./auth";
import { pool, transaction } from "./db";
import { accessProject, saveProject } from "./projects";
import {
  assert,
  id,
  hash,
  secret,
  hashCode,
  checkCode,
  rateLimit,
  unseal,
} from "./security";
import { getObject } from "./storage";
import { config } from "./config";
export async function configureAudioLink(
  a: Account,
  projectId: string,
  input: unknown,
) {
  const v = z
    .object({
      audioId: z.string().uuid(),
      enabled: z.boolean(),
      code: z.string().min(8).max(80),
      expiresAt: z.string().datetime().nullable().default(null),
    })
    .strict()
    .parse(input);
  return transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "narrator" && !row.deletion_at, 403, "Accès refusé.");
    const p = unseal<Project>(row.payload);
    assert(
      row.kind === "personal" || pkg(p.packageCode).qr,
      403,
      "QR audio non inclus.",
    );
    const audio = p.audios.find((x) => x.id === v.audioId);
    assert(
      audio && audio.transcript.status === "validee",
      409,
      "Validez d’abord la transcription.",
    );
    assert(
      !v.expiresAt || new Date(v.expiresAt).getTime() > Date.now(),
      400,
      "Expiration invalide.",
    );
    if (!audio.qr.token) {
      assert(
        !["approuve", "preparation", "impression", "expedie", "livre"].includes(
          p.book.status,
        ),
        409,
        "Retirez la validation pour ajouter un QR.",
      );
      audio.qr.token = secret();
    }
    audio.qr.enabled = v.enabled;
    await db.query(
      "INSERT INTO audio_links(id,project_id,audio_id,token_hash,code_hash,enabled,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(project_id,audio_id) DO UPDATE SET code_hash=EXCLUDED.code_hash,enabled=EXCLUDED.enabled,expires_at=EXCLUDED.expires_at",
      [
        id(),
        p.id,
        audio.id,
        hash(audio.qr.token),
        hashCode(v.code),
        v.enabled,
        v.expiresAt,
      ],
    );
    await saveProject(db, a, row, p);
    return { url: `${config().APP_ORIGIN}/ecoute#token=${audio.qr.token}` };
  });
}
export async function listen(token: string, code: string) {
  await rateLimit(`audio:${hash(token)}`, 10, 300);
  const { rows } = await pool().query(
    "SELECT l.*,p.payload,p.deletion_at,m.object_key,m.mime FROM audio_links l JOIN projects p ON p.id=l.project_id JOIN media m ON m.id=l.audio_id::uuid WHERE token_hash=$1 AND enabled=true AND (expires_at IS NULL OR expires_at>now())",
    [hash(token)],
  );
  const link = rows[0];
  assert(
    link && !link.deletion_at && checkCode(code, link.code_hash),
    403,
    "Lien ou code invalide.",
  );
  const p = unseal<Project>(link.payload);
  const audio = p.audios.find((x) => x.id === link.audio_id);
  const m = p.memories.find((x) => x.id === audio?.memoryId);
  assert(
    audio?.qr.enabled && m?.inBook && m.status === "terminee",
    403,
    "Écoute désactivée.",
  );
  return { bytes: await getObject(link.object_key), mime: link.mime };
}
