import { z } from "zod";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Project } from "@/lib/types";
import { pkg } from "@/lib/catalog";
import type { Account } from "./auth";
import { pool, transaction } from "./db";
import { accessProject, readable, saveProject } from "./projects";
import { assert, hash, id, unseal, seal, audit } from "./security";
import { putObject, getObject, deleteObject } from "./storage";
import { enqueue } from "./jobs";
import { transcriptionConfigured } from "./config";
const CHUNK = 4 * 1024 * 1024;
const uploadSchema = z
  .object({
    memoryId: z.string().min(1).max(100),
    kind: z.enum(["photo", "audio"]),
    bytes: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
    mime: z.string().max(100),
    caption: z.string().max(1000).default(""),
  })
  .strict();
export async function beginUpload(
  a: Account,
  projectId: string,
  input: unknown,
) {
  const v = uploadSchema.parse(input);
  return transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(
      row.role === "narrator" && !row.deletion_at,
      403,
      "Import non autorisé.",
    );
    const p = unseal<Project>(row.payload);
    assert(
      p.book.status === "brouillon" || p.book.status.startsWith("relecture"),
      409,
      "Le livre est verrouillé.",
    );
    assert(
      p.memories.some((m) => m.id === v.memoryId),
      404,
      "Souvenir introuvable.",
    );
    assert(
      v.kind !== "audio" || row.kind === "personal" || pkg(p.packageCode).voice,
      403,
      "Audio non inclus dans cette formule.",
    );
    assert(
      v.kind !== "photo" || v.bytes <= 15 * 1024 * 1024,
      413,
      "Photo trop volumineuse.",
    );
    const used = await db.query(
      "SELECT COALESCE((SELECT SUM(bytes) FROM media WHERE project_id=$1),0)+COALESCE((SELECT SUM(bytes) FROM uploads WHERE project_id=$1 AND status='uploading' AND expires_at>now()),0) AS bytes",
      [projectId],
    );
    assert(
      Number(used.rows[0].bytes) + v.bytes <= 2 * 1024 ** 3,
      413,
      "Limite de stockage du livre atteinte.",
    );
    const uploadId = id();
    await db.query(
      "INSERT INTO uploads(id,project_id,owner_id,memory_id,kind,bytes,mime,caption) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        uploadId,
        projectId,
        a.id,
        v.memoryId,
        v.kind,
        v.bytes,
        v.mime,
        seal(v.caption),
      ],
    );
    return { id: uploadId, chunkSize: CHUNK };
  });
}

export async function uploadPart(
  a: Account,
  uploadId: string,
  part: number,
  bytes: Buffer,
) {
  assert(
    Number.isInteger(part) &&
      part >= 0 &&
      part < 13 &&
      bytes.length <= CHUNK &&
      bytes.length > 0,
    400,
    "Fragment invalide.",
  );
  await transaction(async (db) => {
    const { rows } = await db.query(
      "SELECT * FROM uploads WHERE id=$1 AND owner_id=$2 FOR UPDATE",
      [uploadId, a.id],
    );
    const u = rows[0];
    assert(
      u &&
        u.status === "uploading" &&
        new Date(u.expires_at).getTime() > Date.now(),
      404,
      "Import introuvable ou expiré.",
    );
    await accessProject(db, a, u.project_id);
    const length = Math.min(CHUNK, Number(u.bytes) - part * CHUNK);
    assert(length === bytes.length, 400, "Taille du fragment incorrecte.");
    const digest = hash(bytes);
    assert(
      !u.parts[String(part)] || u.parts[String(part)] === digest,
      409,
      "Fragment déjà reçu avec un contenu différent.",
    );
    await putObject(`uploads/${u.id}/${part}`, bytes);
    await db.query("UPDATE uploads SET parts=parts||$2::jsonb WHERE id=$1", [
      u.id,
      JSON.stringify({ [part]: digest }),
    ]);
  });
}
export async function uploadStatus(a: Account, uploadId: string) {
  const { rows } = await pool().query(
    "SELECT project_id,status,parts,bytes FROM uploads WHERE id=$1 AND owner_id=$2 AND expires_at>now()",
    [uploadId, a.id],
  );
  assert(rows[0], 404, "Import introuvable.");
  await accessProject(pool(), a, rows[0].project_id);
  return {
    status: rows[0].status,
    parts: Object.keys(rows[0].parts).map(Number),
    bytes: Number(rows[0].bytes),
    chunkSize: CHUNK,
  };
}
export async function finishUpload(a: Account, uploadId: string) {
  return transaction(async (db) => {
    const { rows } = await db.query(
      "SELECT * FROM uploads WHERE id=$1 AND owner_id=$2 FOR UPDATE",
      [uploadId, a.id],
    );
    const u = rows[0];
    assert(u, 404, "Import introuvable.");
    const row = await accessProject(db, a, u.project_id, true);
    assert(
      row.role === "narrator" && !row.deletion_at,
      403,
      "Import non autorisé.",
    );
    if (u.status === "complete") return { id: u.id };
    assert(
      new Date(u.expires_at).getTime() > Date.now(),
      410,
      "Import expiré.",
    );
    const count = Math.ceil(Number(u.bytes) / CHUNK);
    assert(
      Object.keys(u.parts).length === count,
      409,
      "Des fragments sont manquants.",
    );
    const chunks: Buffer[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = await getObject(`uploads/${u.id}/${i}`);
      assert(hash(chunk) === u.parts[String(i)], 400, "Fragment corrompu.");
      chunks.push(chunk);
    }
    let bytes = Buffer.concat(chunks);
    assert(bytes.length === Number(u.bytes), 400, "Taille incorrecte.");
    let mime: string;
    let width = 0,
      height = 0,
      duration = 0;
    if (u.kind === "photo") {
      const decoded = sharp(bytes, {
        limitInputPixels: 40000000,
        failOn: "error",
      });
      const meta = await decoded.metadata();
      assert(
        ["jpeg", "png", "webp"].includes(meta.format ?? ""),
        400,
        "Format photo non pris en charge.",
      );
      const result = await decoded
        .rotate()
        .jpeg({ quality: 92 })
        .toBuffer({ resolveWithObject: true });
      bytes = result.data;
      width = result.info.width;
      height = result.info.height;
      mime = "image/jpeg";
    } else {
      const dir = await mkdtemp(path.join(tmpdir(), "filemoire-audio-"));
      try {
        const file = path.join(dir, "upload");
        await writeFile(file, bytes, { mode: 0o600 });
        const { stdout } = await promisify(execFile)(
          "ffprobe",
          [
            "-v",
            "error",
            "-protocol_whitelist",
            "file,pipe",
            "-format_whitelist",
            "wav,mp3,ogg,matroska,webm,mov",
            "-show_entries",
            "format=duration,format_name",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "json",
            file,
          ],
          { timeout: 15000, maxBuffer: 65536 },
        );
        const info = JSON.parse(stdout);
        duration = Number(info.format?.duration);
        if (!Number.isFinite(duration)) {
          // Browser WebM recordings often omit the container duration. Decode
          // locally with network protocols disabled and a strict duration cap.
          const result = await promisify(execFile)(
            "ffmpeg",
            [
              "-nostdin",
              "-v",
              "error",
              "-protocol_whitelist",
              "file,pipe",
              "-format_whitelist",
              "wav,mp3,ogg,matroska,webm,mov",
              "-i",
              file,
              "-map",
              "0:a:0",
              "-t",
              "3601",
              "-f",
              "null",
              "-",
              "-progress",
              "pipe:1",
            ],
            { timeout: 30000, maxBuffer: 131072 },
          );
          const times = [...result.stdout.matchAll(/out_time_us=(\d+)/g)];
          duration = Number(times.at(-1)?.[1]) / 1000000;
        }
        assert(
          duration > 0 &&
            duration <= 3600 &&
            info.streams?.every(
              (s: { codec_type: string }) => s.codec_type === "audio",
            ),
          400,
          "Enregistrement audio invalide (60 minutes maximum).",
        );
        const format = String(info.format.format_name);
        mime = format.includes("mp3")
          ? "audio/mpeg"
          : format.includes("wav")
            ? "audio/wav"
            : format.includes("ogg")
              ? "audio/ogg"
              : format.includes("webm")
                ? "audio/webm"
                : format.includes("mp4")
                  ? "audio/mp4"
                  : "";
        assert(mime, 400, "Format audio non pris en charge.");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    const p = unseal<Project>(row.payload);
    assert(
      !["approuve", "preparation", "impression", "expedie", "livre"].includes(
        p.book.status,
      ),
      409,
      "Le livre est verrouillé.",
    );
    const m = p.memories.find((m) => m.id === u.memory_id);
    assert(m, 409, "Le souvenir a été supprimé.");
    const key = `media/${p.id}/${u.id}`;
    await putObject(key, bytes);
    await db.query(
      "INSERT INTO media(id,project_id,owner_id,object_key,kind,mime,bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [u.id, p.id, a.id, key, u.kind, mime, bytes.length, hash(bytes)],
    );
    if (u.kind === "photo")
      p.photos.push({
        id: u.id,
        width,
        height,
        caption: unseal<string>(u.caption),
        date: "",
        people: "",
        chapterId: m.chapterId,
        memoryId: m.id,
        order: p.photos.length,
        inBook: true,
        createdAt: Date.now(),
      });
    else {
      const automatic = transcriptionConfigured();
      p.audios.push({
        id: u.id,
        memoryId: m.id,
        mime,
        durationSec: duration,
        createdAt: Date.now(),
        transcript: {
          status: automatic ? "en_cours" : "a_relire",
          text: "",
          simulated: false,
          manual: !automatic,
        },
        qr: { enabled: false, token: "" },
      });
      if (automatic)
        await enqueue(
          db,
          "transcribe",
          { projectId: p.id, audioId: u.id },
          `transcribe:${u.id}`,
        );
    }
    await saveProject(db, a, row, p);
    await db.query("UPDATE uploads SET status='complete' WHERE id=$1", [u.id]);
    await enqueue(
      db,
      "cleanup-upload",
      { uploadId: u.id, parts: count },
      `cleanup-upload:${u.id}`,
    );
    return { id: u.id };
  });
}
export async function readMedia(a: Account, mediaId: string) {
  const { rows } = await pool().query("SELECT * FROM media WHERE id=$1", [
    mediaId,
  ]);
  const media = rows[0];
  assert(media, 404, "Fichier introuvable.");
  const row = await accessProject(pool(), a, media.project_id);
  const p = unseal<Project>(row.payload);
  const item =
    media.kind === "photo"
      ? p.photos.find((x) => x.id === mediaId)
      : p.audios.find((x) => x.id === mediaId);
  const memory = p.memories.find((x) => x.id === item?.memoryId);
  assert(
    row.role === "narrator" ||
      (memory &&
        readable(memory, row.role) &&
        (!("inBook" in (item ?? {})) || (item as { inBook: boolean }).inBook)),
    404,
    "Fichier introuvable.",
  );
  if (row.role === "support")
    await audit(pool(), a.id, row.id, "support.media.read");
  return { bytes: await getObject(media.object_key), mime: media.mime };
}
export async function deleteMedia(mediaId: string) {
  const { rows } = await pool().query(
    "SELECT object_key FROM media WHERE id=$1",
    [mediaId],
  );
  if (rows[0]) {
    await deleteObject(rows[0].object_key);
    await pool().query("DELETE FROM media WHERE id=$1", [mediaId]);
  }
}
