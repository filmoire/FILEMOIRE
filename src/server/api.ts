import { z, ZodError } from "zod";
import type { Project } from "@/lib/types";
import {
  currentAccount,
  requireAccount,
  consumeLogin,
  requestLogin,
  setSession,
  logout,
  mfaSetup,
  verifyMfa,
  requireAdmin,
} from "./auth";
import {
  acceptInvite,
  accessProject,
  invite,
  listProjects,
  preview,
  projectView,
  revokeMember,
  updateProject,
  saveProject,
  resendNarratorInvite,
  createPersonalProject,
} from "./projects";
import {
  beginUpload,
  finishUpload,
  readMedia,
  uploadPart,
  uploadStatus,
} from "./media";
import { createCheckout, refundOrder, stripeWebhook } from "./payments";
import { configureAudioLink, listen } from "./audio";
import { requestPrint, updatePrint } from "./printing";
import { prepareProof, proofBytes } from "./proofs";
import { pool, transaction } from "./db";
import {
  assert,
  audit,
  HttpError,
  id,
  rateLimit,
  sameOrigin,
  unseal,
} from "./security";
import { enqueue } from "./jobs";
import {
  config,
  personalDraftsEnabled,
  transcriptionConfigured,
} from "./config";
import { PACKAGES, EXTRA_COPY_PRICE, GIFT_BOX_PRICE } from "@/lib/catalog";
import { exportArchive } from "./export";
import { contact, supportList, replySupport } from "./support";
const uuid = (s: string) => z.string().uuid().parse(s);
async function bodyBytes(req: Request, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      assert(size <= limit, 413, "Requête trop volumineuse.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
async function json(req: Request) {
  assert(
    req.headers.get("content-type")?.includes("application/json"),
    415,
    "JSON requis.",
  );
  try {
    return JSON.parse((await bodyBytes(req, 256 * 1024)).toString());
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "JSON invalide.");
  }
}
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const binary = (bytes: Buffer, mime: string, attachment?: string) =>
  new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(attachment
        ? { "Content-Disposition": `attachment; filename="${attachment}"` }
        : {}),
    },
  });
export async function handleApi(req: Request, path: string[]) {
  const requestId = id();
  try {
    assert(process.env.APP_MODE === "live", 404, "Page introuvable.");
    const method = req.method;
    const key = path.join("/");
    if (key === "catalog" && method === "GET")
      return reply({
        packages: PACKAGES.filter((p) => !p.quoteOnly),
        extraCopyPrice: EXTRA_COPY_PRICE,
        giftBoxPrice: GIFT_BOX_PRICE,
        ordersOpen:
          process.env.CHECKOUT_ENABLED === "true" &&
          process.env.LEGAL_APPROVED === "true" &&
          process.env.COMMERCIAL_APPROVED === "true",
        cutoff: process.env.ORDER_CUTOFF_AT || null,
      });
    if (key === "health" && method === "GET") {
      config();
      await pool().query("SELECT 1");
      return reply({ status: "ok" });
    }
    if (key === "stripe/webhook" && method === "POST") {
      await stripeWebhook(
        (await bodyBytes(req, 1024 * 1024)).toString(),
        req.headers.get("stripe-signature"),
      );
      return reply({ received: true });
    }
    if (method !== "GET" && method !== "HEAD") sameOrigin(req);
    if (key === "contact" && method === "POST") {
      const header = process.env.TRUSTED_CLIENT_IP_HEADER;
      await rateLimit(
        `contact:${header ? (req.headers.get(header) ?? "unknown") : "shared"}`,
        header ? 5 : 100,
        3600,
      );
      return reply(await contact(await json(req)), 201);
    }
    if (key === "auth/request" && method === "POST") {
      const ipHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
      const ip = ipHeader ? (req.headers.get(ipHeader) ?? "unknown") : "shared";
      await rateLimit(`auth-ip:${ip}`, ipHeader ? 20 : 200, 900);
      const v = z
        .object({
          email: z
            .string()
            .trim()
            .email()
            .max(254)
            .transform((x) => x.toLowerCase()),
        })
        .strict()
        .parse(await json(req));
      await requestLogin(v.email);
      return reply(
        {
          message:
            "Un lien de connexion a été demandé. Consultez votre messagerie.",
        },
        202,
      );
    }
    if (key === "auth/consume" && method === "POST") {
      const v = z
        .object({ token: z.string().min(32).max(100) })
        .strict()
        .parse(await json(req));
      await rateLimit(`consume:${v.token.slice(0, 8)}`, 10, 300);
      const r = await consumeLogin(v.token);
      await setSession(r.session);
      return reply({ account: r.account });
    }
    if (key === "audio/listen" && method === "POST") {
      const v = z
        .object({
          token: z.string().min(32).max(100),
          code: z.string().min(8).max(80),
        })
        .strict()
        .parse(await json(req));
      const r = await listen(v.token, v.code);
      return binary(r.bytes, r.mime);
    }
    if (key === "me" && method === "GET")
      return reply({
        account: await currentAccount(),
        personalDraftsEnabled: personalDraftsEnabled(),
      });
    const a = await requireAccount();
    await rateLimit(`account:${a.id}`, 600, 60);
    if (key === "auth/logout" && method === "POST") {
      await logout();
      return reply({ ok: true });
    }
    if (key === "auth/mfa/setup" && method === "POST")
      return reply(await mfaSetup(a));
    if (key === "auth/mfa/verify" && method === "POST") {
      await verifyMfa(
        a,
        z
          .object({ code: z.string().regex(/^\d{6}$/) })
          .strict()
          .parse(await json(req)).code,
      );
      return reply({ ok: true });
    }
    if (key === "projects" && method === "GET")
      return reply({ projects: await listProjects(a) });
    if (key === "projects" && method === "POST") {
      await rateLimit(`create-project:${a.id}`, 20, 3600);
      return reply(await createPersonalProject(a, await json(req)), 201);
    }
    if (key === "checkout" && method === "POST")
      return reply(await createCheckout(a, await json(req)));
    if (key === "orders" && method === "GET") {
      const { rows } = await pool().query(
        "SELECT id,total,currency,status,created_at FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC",
        [a.id],
      );
      return reply({ orders: rows });
    }
    if (key === "invitations/accept" && method === "POST") {
      const v = z
        .object({ token: z.string().min(32).max(100) })
        .strict()
        .parse(await json(req));
      return reply({ projectId: await acceptInvite(a, v.token) });
    }
    if (path[0] === "uploads" && path[1]) {
      const uid = uuid(path[1]);
      if (path.length === 2 && method === "GET")
        return reply(await uploadStatus(a, uid));
      if (path[2] === "complete" && path.length === 3 && method === "POST")
        return reply(await finishUpload(a, uid));
      if (path[2] && path.length === 3 && method === "PUT") {
        await uploadPart(
          a,
          uid,
          Number(path[2]),
          await bodyBytes(req, 4 * 1024 * 1024),
        );
        return reply({ ok: true });
      }
    }
    if (path[0] === "media" && path.length === 2 && method === "GET") {
      const r = await readMedia(a, uuid(path[1]));
      return binary(r.bytes, r.mime);
    }
    if (path[0] === "projects" && path[1]) {
      const pid = uuid(path[1]);
      const sub = path.slice(2).join("/");
      if (!sub && method === "GET") {
        const row = await accessProject(pool(), a, pid);
        if (row.role === "support")
          await audit(pool(), a.id, pid, "support.read");
        return reply(projectView(row));
      }
      if (sub === "commands" && method === "POST") {
        const v = z
          .object({
            revision: z.number().int().positive(),
            command: z.unknown(),
          })
          .strict()
          .parse(await json(req));
        return reply(await updateProject(a, pid, v.revision, v.command));
      }
      if (sub === "narrator-invitation" && method === "POST") {
        await rateLimit(`resend:${pid}`, 5, 86400);
        await resendNarratorInvite(a, pid);
        return reply({ ok: true });
      }
      if (sub === "invitations" && method === "POST") {
        await rateLimit(`invite:${pid}`, 20, 3600);
        await invite(a, pid, await json(req));
        return reply({ ok: true }, 201);
      }
      if (sub === "members" && method === "GET") {
        const row = await accessProject(pool(), a, pid);
        assert(row.role === "narrator", 403, "Accès refusé.");
        const members = await pool().query(
          "SELECT a.id,a.email,a.name,m.role,m.revoked_at FROM memberships m JOIN accounts a ON a.id=m.account_id WHERE m.project_id=$1",
          [pid],
        );
        const invitations = await pool().query(
          "SELECT id,email,name,role,accepted_at,revoked_at,expires_at FROM invitations WHERE project_id=$1",
          [pid],
        );
        return reply({ members: members.rows, invitations: invitations.rows });
      }
      if (sub === "members/revoke" && method === "POST") {
        const v = z
          .object({ accountId: z.string().uuid() })
          .strict()
          .parse(await json(req));
        await revokeMember(a, pid, v.accountId);
        return reply({ ok: true });
      }
      if (sub === "invitations/revoke" && method === "POST") {
        const v = z
          .object({ invitationId: z.string().uuid() })
          .strict()
          .parse(await json(req));
        await transaction(async (db) => {
          const row = await accessProject(db, a, pid, true);
          assert(
            row.role === "narrator" || row.role === "buyer",
            403,
            "Accès refusé.",
          );
          await db.query(
            "UPDATE invitations SET revoked_at=now() WHERE id=$1 AND project_id=$2 AND accepted_at IS NULL",
            [v.invitationId, pid],
          );
        });
        return reply({ ok: true });
      }
      if (sub === "uploads" && method === "POST")
        return reply(await beginUpload(a, pid, await json(req)), 201);
      if (sub === "audio-links" && method === "POST")
        return reply(await configureAudioLink(a, pid, await json(req)));
      if (sub === "preview" && method === "GET")
        return reply({
          ...(await preview(a, pid)),
          ...(await prepareProof(a, pid)),
        });
      if (sub === "proof" && method === "GET") {
        const row = await accessProject(pool(), a, pid);
        assert(row.role === "narrator", 403, "Accès refusé.");
        return binary(
          await proofBytes(
            a,
            pid,
            new URL(req.url).searchParams.get("version") ?? undefined,
          ),
          "application/pdf",
          "filemoire-epreuve.pdf",
        );
      }
      if (sub === "print" && method === "POST")
        return reply(await requestPrint(a, pid, await json(req)), 201);
      if (sub === "export" && method === "GET")
        return await exportArchive(a, pid);
      if (sub === "audit" && method === "GET") {
        const row = await accessProject(pool(), a, pid);
        assert(row.role === "narrator", 403, "Accès refusé.");
        return reply({
          events: (
            await pool().query(
              "SELECT action,created_at FROM audit_events WHERE project_id=$1 ORDER BY created_at DESC LIMIT 200",
              [pid],
            )
          ).rows,
        });
      }
      if (sub === "support-access" && method === "POST") {
        const v = z
          .object({
            email: z
              .string()
              .email()
              .transform((x) => x.toLowerCase()),
            hours: z.number().int().min(0).max(24),
            reason: z.string().min(5).max(500),
          })
          .strict()
          .parse(await json(req));
        await transaction(async (db) => {
          const row = await accessProject(db, a, pid, true);
          assert(row.role === "narrator", 403, "Accès refusé.");
          assert(
            (process.env.ADMIN_EMAILS ?? "")
              .split(",")
              .map((x) => x.trim().toLowerCase())
              .includes(v.email),
            400,
            "Compte de support inconnu.",
          );
          const target = (
            await db.query("SELECT id FROM accounts WHERE email=$1", [v.email])
          ).rows[0];
          assert(target, 404, "Compte de support introuvable.");
          await db.query(
            "INSERT INTO support_grants(project_id,account_id,expires_at,reason) VALUES($1,$2,now()+$3*interval '1 hour',$4) ON CONFLICT(project_id,account_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,reason=EXCLUDED.reason",
            [pid, target.id, v.hours, v.reason],
          );
          await audit(
            db,
            a.id,
            pid,
            v.hours ? "support.granted" : "support.revoked",
          );
        });
        return reply({ ok: true });
      }
      if (sub === "transcription/retry" && method === "POST") {
        assert(
          transcriptionConfigured(),
          503,
          "La transcription automatique n’est pas configurée. Vous pouvez saisir le texte de votre enregistrement.",
        );
        const v = z
          .object({ audioId: z.string().uuid() })
          .strict()
          .parse(await json(req));
        await transaction(async (db) => {
          const row = await accessProject(db, a, pid, true);
          assert(
            row.role === "narrator" && !row.deletion_at,
            403,
            "Accès refusé.",
          );
          const p = unseal<Project>(row.payload);
          assert(
            p.audios.some(
              (x) => x.id === v.audioId && x.transcript.status === "echec",
            ),
            409,
            "Aucune transcription en échec.",
          );
          await enqueue(
            db,
            "transcribe",
            { projectId: pid, audioId: v.audioId },
            `transcribe-retry:${v.audioId}:${id()}`,
          );
          p.audios.find((x) => x.id === v.audioId)!.transcript.status =
            "en_cours";
          await saveProject(db, a, row, p);
        });
        return reply({ ok: true });
      }
    }
    if (key === "admin/support" && method === "GET")
      return reply({ tickets: await supportList(a) });
    if (
      path[0] === "admin" &&
      path[1] === "support" &&
      path.length === 3 &&
      method === "POST"
    ) {
      await replySupport(a, uuid(path[2]), await json(req));
      return reply({ ok: true });
    }
    if (key === "admin/operations" && method === "GET") {
      requireAdmin(a);
      const [jobs, prints, orders] = await Promise.all([
        pool().query(
          "SELECT id,kind,state,attempts,run_at,last_error FROM jobs WHERE state<>'done' ORDER BY run_at LIMIT 100",
        ),
        pool().query(
          "SELECT id,project_id,status,tracking,incident,created_at FROM print_orders ORDER BY created_at DESC LIMIT 100",
        ),
        pool().query(
          "SELECT id,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 100",
        ),
      ]);
      return reply({
        jobs: jobs.rows,
        prints: prints.rows,
        orders: orders.rows,
      });
    }
    if (
      path[0] === "admin" &&
      path[1] === "print" &&
      path.length === 3 &&
      method === "POST"
    ) {
      await updatePrint(a, uuid(path[2]), await json(req));
      return reply({ ok: true });
    }
    if (
      path[0] === "admin" &&
      path[1] === "refund" &&
      path.length === 3 &&
      method === "POST"
    ) {
      const v = z
        .object({ requestKey: z.string().uuid() })
        .strict()
        .parse(await json(req));
      return reply(await refundOrder(a, uuid(path[2]), v.requestKey));
    }
    if (
      path[0] === "admin" &&
      path[1] === "retry-job" &&
      path.length === 3 &&
      method === "POST"
    ) {
      requireAdmin(a);
      await pool().query(
        "UPDATE jobs SET state='pending',attempts=0,run_at=now() WHERE id=$1 AND state='failed'",
        [uuid(path[2])],
      );
      await audit(pool(), a.id, null, "job.retried");
      return reply({ ok: true });
    }
    throw new HttpError(404, "Page introuvable.");
  } catch (e) {
    const status =
      e instanceof HttpError ? e.status : e instanceof ZodError ? 400 : 503;
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: "api_failed",
          requestId,
          path: path.join("/"),
          errorType: e instanceof Error ? e.name : "unknown",
        }),
      );
    return reply(
      {
        error:
          e instanceof HttpError
            ? e.message
            : e instanceof ZodError
              ? "Vérifiez les champs du formulaire."
              : "Service temporairement indisponible.",
        requestId,
      },
      status,
    );
  }
}
