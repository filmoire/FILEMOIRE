import { EmailProviderError, sendEmail } from "./email";
import type { Project } from "@/lib/types";
import { refreshQuestions } from "@/lib/rules";
import { claimJob, enqueue, finishJob, type Job } from "./jobs";
import { pool, transaction } from "./db";
import { config, configured } from "./config";
import { assert, seal, unseal, id, hash } from "./security";
import { deleteObject, getObject } from "./storage";
import { deleteMedia } from "./media";

export async function runJob(job: Job) {
  if (job.kind === "email") {
    if (job.payload.loginTokenHash) {
      const valid = await pool().query(
        "SELECT 1 FROM login_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()",
        [job.payload.loginTokenHash],
      );
      if (!valid.rowCount) return;
    }
    if (job.payload.projectId) {
      const row = (
        await pool().query(
          "SELECT payload,deletion_at FROM projects WHERE id=$1",
          [job.payload.projectId],
        )
      ).rows[0];
      if (!row || row.deletion_at) return;
      const p = unseal<Project>(row.payload);
      if (job.payload.questionId) {
        const q = p.questions.find((q) => q.id === job.payload.questionId);
        if (
          !q ||
          !["disponible", "brouillon"].includes(q.status) ||
          p.cadenceDays === 0
        )
          return;
        if (job.payload.reminder && p.privacy.reminders !== "douces") return;
      }
      if (job.payload.invitationHash) {
        const invitation = (
          await pool().query(
            "SELECT 1 FROM invitations WHERE token_hash=$1 AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at>now()",
            [job.payload.invitationHash],
          )
        ).rowCount;
        if (!invitation) return;
      }
    }
    await sendEmail({
      id: job.id,
      to: String(job.payload.to),
      subject: String(job.payload.subject),
      text: String(job.payload.text),
    });
    if (job.payload.projectId && job.payload.invitationHash)
      await transaction(async (db) => {
        const invitation = (
          await db.query(
            "SELECT role FROM invitations WHERE token_hash=$1 AND revoked_at IS NULL AND accepted_at IS NULL",
            [job.payload.invitationHash],
          )
        ).rows[0];
        if (invitation?.role !== "narrator") return;
        const row = (
          await db.query(
            "SELECT payload FROM projects WHERE id=$1 FOR UPDATE",
            [job.payload.projectId],
          )
        ).rows[0];
        if (!row) return;
        const p = unseal<Project>(row.payload);
        if (!p.startedAt) {
          p.invitation.status = "envoyee";
          p.invitation.sentAt = Date.now();
          await db.query(
            "UPDATE projects SET payload=$2,revision=revision+1 WHERE id=$1",
            [p.id, seal(p)],
          );
        }
      });
  } else if (job.kind === "transcribe") {
    const audioId = String(job.payload.audioId),
      projectId = String(job.payload.projectId);
    const { rows } = await pool().query(
      "SELECT m.object_key,m.mime FROM media m JOIN projects p ON p.id=m.project_id WHERE m.id=$1 AND m.project_id=$2 AND p.deletion_at IS NULL",
      [audioId, projectId],
    );
    if (!rows[0]) return;
    const form = new FormData();
    const ext =
      (
        {
          "audio/mpeg": "mp3",
          "audio/wav": "wav",
          "audio/ogg": "ogg",
          "audio/webm": "webm",
          "audio/mp4": "m4a",
        } as Record<string, string>
      )[rows[0].mime] ?? "audio";
    form.append(
      "file",
      new Blob([new Uint8Array(await getObject(rows[0].object_key))], {
        type: rows[0].mime,
      }),
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
    });
    assert(response.ok, 502, "Transcription provider failed");
    const result = await response.json();
    assert(
      typeof result.text === "string" && result.text.length <= 100000,
      502,
      "Invalid transcription response",
    );
    await transaction(async (db) => {
      const r = await db.query(
        "SELECT * FROM projects WHERE id=$1 AND deletion_at IS NULL FOR UPDATE",
        [projectId],
      );
      if (!r.rows[0]) return;
      const p = unseal<Project>(r.rows[0].payload);
      const audio = p.audios.find((x) => x.id === audioId);
      if (audio && audio.transcript.status === "en_cours") {
        audio.transcript = {
          text: result.text,
          status: "a_relire",
          simulated: false,
        };
        await db.query(
          "UPDATE projects SET payload=$2,revision=revision+1,updated_at=now() WHERE id=$1",
          [projectId, seal(p)],
        );
      }
    });
  } else if (job.kind === "delete-media")
    await deleteMedia(String(job.payload.mediaId));
  else if (job.kind === "cleanup-upload") {
    for (let i = 0; i < Number(job.payload.parts); i++)
      await deleteObject(`uploads/${String(job.payload.uploadId)}/${i}`);
  } else if (job.kind === "delete-project") {
    await transaction(async (db) => {
      const { rows } = await db.query(
        "SELECT * FROM projects WHERE id=$1 FOR UPDATE",
        [job.payload.projectId],
      );
      if (
        !rows[0] ||
        !rows[0].deletion_at ||
        new Date(rows[0].deletion_at).getTime() > Date.now()
      )
        return;
      const p = unseal<Project>(rows[0].payload);
      if (p.deletionRequestedAt !== job.payload.requestedAt) return;
      const files = await db.query(
        "SELECT object_key FROM media WHERE project_id=$1",
        [p.id],
      );
      for (const file of files.rows) await deleteObject(file.object_key);
      const uploads = await db.query(
        "SELECT id,parts FROM uploads WHERE project_id=$1",
        [p.id],
      );
      for (const u of uploads.rows)
        for (const part of Object.keys(u.parts))
          await deleteObject(`uploads/${u.id}/${part}`);
      // Remove queued payloads that can contain the deleted story or invitation, including sent email bodies.
      const jobs = await db.query(
        "SELECT id,payload FROM jobs WHERE id<>$1 AND kind IN ('email','transcribe','print','delete-project')",
        [job.id],
      );
      for (const j of jobs.rows) {
        const payload = unseal<Record<string, unknown>>(j.payload);
        // Recipient addresses and message text are not project ownership.
        // The same narrator may participate in several independent books.
        if (payload.projectId === p.id)
          await db.query("DELETE FROM jobs WHERE id=$1", [j.id]);
      }
      await db.query("DELETE FROM projects WHERE id=$1", [p.id]);
      await db.query(
        "INSERT INTO audit_events(id,action) VALUES($1,'project.deleted')",
        [id()],
      );
    });
  } else if (job.kind === "print") {
    assert(
      process.env.PRINT_ENABLED === "true" &&
        process.env.PRINT_SPEC_APPROVED === "true",
      503,
      "Printing disabled",
    );
    const { rows } = await pool().query(
      "SELECT po.*,v.payload,p.deletion_at,m.object_key,m.sha256,o.payload AS order_payload FROM print_orders po JOIN book_versions v ON v.id=po.version_id JOIN projects p ON p.id=po.project_id JOIN media m ON m.id=v.pdf_media_id JOIN orders o ON o.id=p.order_id WHERE po.id=$1",
      [job.payload.printId],
    );
    const order = rows[0];
    if (!order || order.provider_id) return;
    assert(!order.deletion_at, 409, "Deletion requested");
    const p = unseal<Project>(order.payload);
    assert(
      hash(await getObject(order.object_key)) === order.sha256,
      503,
      "Approved proof integrity failure",
    );
    const form = new FormData();
    form.append(
      "pdf",
      new Blob([new Uint8Array(await getObject(order.object_key))], {
        type: "application/pdf",
      }),
      "book.pdf",
    );
    form.append(
      "order",
      JSON.stringify({
        id: order.id,
        copies: p.print.copies,
        giftBox: unseal<{ giftBox: boolean }>(order.order_payload).giftBox,
        address: p.print.address,
        specVersion: job.payload.specVersion,
        versionId: order.version_id,
      }),
    );
    const response = await fetch(configured("PRINT_API_URL"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configured("PRINT_API_KEY")}`,
        "Idempotency-Key": order.id,
      },
      body: form,
      signal: AbortSignal.timeout(120000),
    });
    assert(response.ok, 502, "Print provider failed");
    const result = await response.json();
    assert(
      typeof result.id === "string" && result.id.length < 200,
      502,
      "Invalid print response",
    );
    await pool().query(
      "UPDATE print_orders SET provider_id=$2,status='submitted' WHERE id=$1",
      [order.id, result.id],
    );
  } else throw new Error("Unsupported job type");
}
export async function processOne() {
  const job = await claimJob();
  if (!job) return false;
  try {
    await runJob(job);
    await finishJob(job);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "job_failed",
        jobId: job.id,
        kind: job.kind,
        attempt: job.attempts,
        ...(error instanceof EmailProviderError
          ? { providerStatus: error.status, retryable: error.retryable }
          : {}),
      }),
    );
    await finishJob(
      job,
      true,
      error instanceof EmailProviderError && !error.retryable,
    );
    if (job.kind === "transcribe" && job.attempts >= 5)
      await transaction(async (db) => {
        const r = await db.query(
          "SELECT * FROM projects WHERE id=$1 FOR UPDATE",
          [job.payload.projectId],
        );
        if (!r.rows[0]) return;
        const p = unseal<Project>(r.rows[0].payload);
        const audio = p.audios.find((x) => x.id === job.payload.audioId);
        if (audio?.transcript.status === "en_cours") {
          audio.transcript.status = "echec";
          await db.query(
            "UPDATE projects SET payload=$2,revision=revision+1 WHERE id=$1",
            [p.id, seal(p)],
          );
        }
      });
  }
  return true;
}
export async function scheduleDue() {
  await pool().query(
    "INSERT INTO service_heartbeats(name) VALUES('worker') ON CONFLICT(name) DO UPDATE SET seen_at=now()",
  );
  const ids = (
    await pool().query(
      "SELECT id FROM projects WHERE deletion_at IS NULL AND status NOT IN ('approuve','preparation','impression','expedie','livre')",
    )
  ).rows;
  for (const { id: projectId } of ids)
    await transaction(async (db) => {
      const r = await db.query(
        "SELECT * FROM projects WHERE id=$1 AND deletion_at IS NULL FOR UPDATE",
        [projectId],
      );
      if (!r.rows[0]) return;
      const p = unseal<Project>(r.rows[0].payload);
      if (!p.startedAt || !p.onboarded) return;
      const now = Date.now();
      const opened = refreshQuestions(p, now);
      let changed = opened.length > 0;
      if (p.cadenceDays > 0)
        for (const q of p.questions.filter((q) =>
          ["disponible", "brouillon"].includes(q.status),
        )) {
          const next =
            q.availableAt +
            (q.remindersSent === 0 ? 0 : q.remindersSent * 3 * 86400000);
          if (
            q.remindersSent < 3 &&
            now >= next &&
            (q.remindersSent === 0 || p.privacy.reminders === "douces")
          ) {
            await enqueue(
              db,
              "email",
              {
                projectId: p.id,
                questionId: q.id,
                reminder: q.remindersSent > 0,
                to: p.narrator.email,
                subject: q.remindersSent
                  ? "Un souvenir, à votre rythme"
                  : "Votre prochaine question Filémoire",
                text: `${q.text}\nRépondez à votre rythme : ${config().APP_ORIGIN}/espace\nVous pouvez désactiver les rappels dans vos préférences.`,
              },
              `question:${p.id}:${q.id}:${q.remindersSent}`,
            );
            q.remindersSent++;
            changed = true;
          }
        }
      if (changed)
        await db.query(
          "UPDATE projects SET payload=$2,revision=revision+1 WHERE id=$1",
          [p.id, seal(p)],
        );
    });
  await pool().query("DELETE FROM sessions WHERE expires_at<now()");
  await pool().query("DELETE FROM login_tokens WHERE expires_at<now()");
  await pool().query("DELETE FROM rate_limits WHERE expires_at<now()");
  await pool().query(
    "UPDATE jobs SET payload=$1 WHERE state='done' AND created_at<now()-interval '7 days'",
    [seal({})],
  );
  const expired = await pool().query(
    "SELECT id,parts FROM uploads WHERE expires_at<now()",
  );
  for (const u of expired.rows) {
    for (const part of Object.keys(u.parts))
      await deleteObject(`uploads/${u.id}/${part}`);
    await pool().query("DELETE FROM uploads WHERE id=$1", [u.id]);
  }
}
