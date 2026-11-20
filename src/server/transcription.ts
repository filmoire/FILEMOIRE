import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Project } from "@/lib/types";
import type { Account } from "./auth";
import { configured, transcriptionConfigured } from "./config";
import { transaction } from "./db";
import { accessProject, saveProject } from "./projects";
import { assert, id, unseal } from "./security";
import { enqueue } from "./jobs";

export async function requestTranscription(
  a: Account,
  projectId: string,
  audioId: string,
) {
  assert(
    transcriptionConfigured(),
    503,
    "La transcription automatique n’est pas configurée. Vous pouvez saisir le texte de votre enregistrement.",
  );
  await transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "narrator" && !row.deletion_at, 403, "Accès refusé.");
    const p = unseal<Project>(row.payload);
    assert(
      !["approuve", "preparation", "impression", "expedie", "livre"].includes(
        p.book.status,
      ),
      409,
      "Le livre est verrouillé.",
    );
    const audio = p.audios.find((x) => x.id === audioId);
    assert(
      audio &&
        (audio.transcript.status === "echec" ||
          (audio.transcript.manual &&
            audio.transcript.status === "a_relire" &&
            !audio.transcript.text.trim())),
      409,
      "Cette transcription est déjà en cours ou contient un texte à conserver.",
    );
    await enqueue(
      db,
      "transcribe",
      { projectId, audioId },
      `transcribe-retry:${audioId}:${id()}`,
    );
    audio.transcript = { text: "", status: "en_cours", simulated: false };
    await saveProject(db, a, row, p);
  });
}

/** The original stays encrypted in storage; only the provider copy is compressed. */
export async function transcribeAudio(bytes: Buffer, mime: string) {
  let dir: string | undefined;
  try {
    let body: Uint8Array = new Uint8Array(bytes);
    let type = mime;
    let ext =
      (
        {
          "audio/mpeg": "mp3",
          "audio/wav": "wav",
          "audio/ogg": "ogg",
          "audio/webm": "webm",
          "audio/mp4": "m4a",
        } as Record<string, string>
      )[mime] ?? "audio";
    // Groq Free accepts 25 MB. 48 kbps mono keeps a permitted one-hour
    // recording below that limit. Network protocols are disabled in ffmpeg.
    if (bytes.length > 24_000_000) {
      dir = await mkdtemp(path.join(tmpdir(), "filemoire-transcription-"));
      const input = path.join(dir, "original");
      const output = path.join(dir, "speech.mp3");
      await writeFile(input, bytes, { mode: 0o600 });
      await promisify(execFile)(
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
          input,
          "-map",
          "0:a:0",
          "-vn",
          "-ar",
          "16000",
          "-ac",
          "1",
          "-c:a",
          "libmp3lame",
          "-b:a",
          "48k",
          "-threads",
          "1",
          output,
        ],
        { timeout: 180000, maxBuffer: 65536 },
      );
      body = new Uint8Array(await readFile(output));
      type = "audio/mpeg";
      ext = "mp3";
    }
    assert(
      body.length <= 24_000_000,
      413,
      "Transcription audio exceeds provider limit",
    );
    const form = new FormData();
    form.append(
      "file",
      new Blob([body as Uint8Array<ArrayBuffer>], { type }),
      `recording.${ext}`,
    );
    form.append("model", configured("TRANSCRIPTION_MODEL"));
    form.append("response_format", "json");
    const response = await fetch(configured("TRANSCRIPTION_URL"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configured("TRANSCRIPTION_API_KEY")}`,
      },
      body: form,
      signal: AbortSignal.timeout(180000),
      redirect: "error",
    });
    assert(response.ok, 502, "Transcription provider failed");
    const result = await response.json();
    assert(
      typeof result.text === "string" &&
        !!result.text.trim() &&
        result.text.length <= 100000,
      502,
      "Invalid transcription response",
    );
    return result.text as string;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}
