import tar from "tar-stream";
import { Readable } from "node:stream";
import type { Account } from "./auth";
import type { Project } from "@/lib/types";
import { accessProject } from "./projects";
import { pool } from "./db";
import { assert, audit, hash, unseal } from "./security";
import { getObject } from "./storage";
export async function exportArchive(a: Account, projectId: string) {
  const row = await accessProject(pool(), a, projectId);
  assert(row.role === "narrator", 403, "Accès refusé.");
  const p = unseal<Project>(row.payload);
  const ids = [...p.photos.map((p) => p.id), ...p.audios.map((a) => a.id)];
  const files = (
    await pool().query(
      "SELECT id,object_key,mime,sha256 FROM media WHERE project_id=$1 AND id=ANY($2::uuid[])",
      [projectId, ids],
    )
  ).rows;
  await audit(pool(), a.id, projectId, "project.exported");
  const archive = tar.pack();
  const add = (name: string, bytes: Buffer) =>
    new Promise<void>((resolve, reject) =>
      archive.entry({ name, size: bytes.length, mode: 0o600 }, bytes, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  void (async () => {
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
    };
    await add(
      "project.json",
      Buffer.from(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            revision: row.revision,
            project: p,
          },
          null,
          2,
        ),
      ),
    );
    await add(
      "README.txt",
      Buffer.from(
        "Filémoire export. project.json contains your story and metadata. Media files are named by their IDs. Keep this archive private; audio access links may appear in the metadata.",
      ),
    );
    for (const file of files) {
      const bytes = await getObject(file.object_key);
      assert(hash(bytes) === file.sha256, 503, "Fichier indisponible.");
      await add(`media/${file.id}.${extensions[file.mime] ?? "bin"}`, bytes);
    }
    archive.finalize();
  })().catch(() =>
    archive.destroy(new Error("Export interrupted. Retry the download.")),
  );
  return new Response(
    Readable.toWeb(Readable.from(archive)) as ReadableStream<Uint8Array>,
    {
      headers: {
        "Content-Type": "application/x-tar",
        "Content-Disposition": 'attachment; filename="filemoire-export.tar"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
