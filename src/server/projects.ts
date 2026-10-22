import { z } from "zod";
import type { Project, Memory, Visibility } from "@/lib/types";
import {
  composeBook,
  isLocked,
  applySuggestion,
  sortedChapters,
} from "@/lib/rules";
import { DAY } from "@/lib/utils";
import { createProject, startJourney } from "@/lib/factory";
import { journeyLibrary } from "./question-library";
import type { Account } from "./auth";
import { pool, transaction, type DB } from "./db";
import { assert, audit, hash, id, seal, secret, unseal } from "./security";
import { enqueue } from "./jobs";
import { config, personalDraftsEnabled } from "./config";

export type ProjectRow = {
  id: string;
  kind: "purchased" | "personal";
  buyer_id: string;
  narrator_email: string;
  title: string;
  revision: number;
  payload: string;
  status: string;
  deletion_at: Date | null;
  role: "buyer" | "narrator" | "editor" | "contributor" | "support";
  can_suggest: boolean;
};

const personalSchema = z
  .object({
    requestKey: z.string().uuid(),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).default(""),
    title: z.string().trim().min(1).max(100),
    theme: z.enum([
      "vie",
      "migration",
      "metier",
      "couple",
      "parentalite",
      "recettes",
      "retraite",
    ]),
    consentVersion: z.literal("2026-10-13"),
    accepted: z.literal(true),
  })
  .strict();

export async function createPersonalProject(a: Account, input: unknown) {
  assert(
    personalDraftsEnabled(),
    403,
    "La création de manuscrits personnels n’est pas ouverte.",
  );
  const v = personalSchema.parse(input);
  const digest = hash(JSON.stringify(v));
  return transaction(async (db) => {
    // Serialize per account: retries cannot create duplicate books or exceed the quota.
    await db.query("SELECT id FROM accounts WHERE id=$1 FOR UPDATE", [a.id]);
    const existing = (
      await db.query(
        "SELECT id,creation_hash FROM projects WHERE buyer_id=$1 AND creation_key=$2",
        [a.id, v.requestKey],
      )
    ).rows[0];
    if (existing) {
      assert(
        existing.creation_hash === digest,
        409,
        "Cette demande a déjà été utilisée pour un autre manuscrit.",
      );
      return projectView(await accessProject(db, a, existing.id));
    }
    const count = (
      await db.query(
        "SELECT count(*) FROM projects WHERE buyer_id=$1 AND kind='personal'",
        [a.id],
      )
    ).rows[0];
    assert(
      Number(count.count) < 5,
      409,
      "Vous pouvez conserver cinq manuscrits personnels. Supprimez un livre avant d’en créer un autre.",
    );
    const now = Date.now();
    const p = createProject(
      {
        orderId: null,
        recipient: {
          firstName: v.firstName,
          lastName: v.lastName,
          email: a.email,
          relation: "Moi-même",
        },
        buyerName: [v.firstName, v.lastName].filter(Boolean).join(" "),
        packageCode: "essentiel",
        theme: v.theme,
        length: 52,
        deliveryDate: new Date(now).toISOString().slice(0, 10),
        extraCopies: 0,
      },
      await journeyLibrary(db),
      now,
    );
    p.id = id();
    p.book.cover.title = v.title;
    p.invitation = {
      ...p.invitation,
      token: "",
      status: "acceptee",
      acceptedAt: now,
    };
    p.onboarded = true;
    p.consentAt = now;
    p.cadenceDays = 0;
    p.privacy.reminders = "aucune";
    p.privacy.buyerSeesProgress = false;
    p.print.copies = 0;
    startJourney(p, now);
    p.questions.forEach((q) => {
      q.status = "disponible";
    });
    await db.query(
      "INSERT INTO projects(id,buyer_id,narrator_email,title,payload,kind,creation_key,creation_hash) VALUES($1,$2,$3,$4,$5,'personal',$6,$7)",
      [p.id, a.id, a.email, v.title, seal(p), v.requestKey, digest],
    );
    await db.query(
      "INSERT INTO memberships(project_id,account_id,role) VALUES($1,$2,'narrator')",
      [p.id, a.id],
    );
    await db.query("UPDATE accounts SET name=$2 WHERE id=$1 AND name=''", [
      a.id,
      p.buyerName,
    ]);
    await db.query(
      "INSERT INTO consent_records(id,account_id,project_id,purpose,version,accepted) VALUES($1,$2,$3,'personal-manuscript',$4,true)",
      [id(), a.id, p.id, v.consentVersion],
    );
    await audit(db, a.id, p.id, "project.created");
    return projectView(await accessProject(db, a, p.id));
  });
}
export async function accessProject(
  db: DB,
  a: Account,
  projectId: string,
  lock = false,
): Promise<ProjectRow> {
  const { rows } = await db.query(
    `SELECT p.*,m.role AS member_role,m.can_suggest,g.expires_at AS support_until FROM projects p LEFT JOIN memberships m ON m.project_id=p.id AND m.account_id=$2 AND m.revoked_at IS NULL LEFT JOIN support_grants g ON g.project_id=p.id AND g.account_id=$2 WHERE p.id=$1 ${lock ? "FOR UPDATE OF p" : ""}`,
    [projectId, a.id],
  );
  const row = rows[0];
  assert(row, 404, "Livre introuvable.");
  const role =
    row.member_role ??
    (row.buyer_id === a.id
      ? "buyer"
      : a.admin &&
          a.mfa &&
          row.support_until &&
          new Date(row.support_until).getTime() > Date.now()
        ? "support"
        : undefined);
  assert(role, 404, "Livre introuvable.");
  return { ...row, role };
}
export function readable(m: Memory, role: ProjectRow["role"]) {
  return (
    role === "narrator" ||
    (m.status === "terminee" &&
      m.inBook &&
      (role === "support" ||
        m.visibility === "famille" ||
        (role === "editor" && m.visibility === "editeur")))
  );
}
export function projectView(row: ProjectRow) {
  const p = unseal<Project>(row.payload);
  p.kind = row.kind;
  const role = row.role;
  p.invitation.token = "";
  if (role !== "narrator") {
    p.memories = p.memories
      .filter((m) => readable(m, role))
      .map((m) => ({ ...m, draft: undefined, revisions: [] }));
    const mids = new Set(p.memories.map((m) => m.id));
    p.photos = p.photos.filter(
      (x) => x.inBook && !!x.memoryId && mids.has(x.memoryId),
    );
    p.audios = p.audios
      .filter((x) => mids.has(x.memoryId))
      .map((audio) => ({
        ...audio,
        // A shared recording does not publish a draft transcription. Keep this
        // boundary on the server, including for temporary support access.
        transcript:
          audio.transcript.status === "validee"
            ? audio.transcript
            : { status: audio.transcript.status, text: "", simulated: false },
      }));
    p.editors = [];
    p.narrator.email = "";
    p.privacy = {
      defaultVisibility: "moi",
      buyerSeesProgress: p.privacy.buyerSeesProgress,
      reminders: "aucune",
      marketing: false,
    };
    // Earlier suggestion text can contain content since made private or edited.
    p.suggestions = [];
    p.print.address = undefined;
    if (role === "buyer" && !p.privacy.buyerSeesProgress) p.questions = [];
  }
  p.audios = p.audios.map((audio) => ({
    ...audio,
    blobKey: undefined,
    src: `/api/v1/media/${audio.id}`,
    qr: { ...audio.qr, token: role === "narrator" ? audio.qr.token : "" },
  }));
  p.photos = p.photos.map((photo) => ({
    ...photo,
    blobKey: undefined,
    src: `/api/v1/media/${photo.id}`,
  }));
  return {
    id: row.id,
    revision: row.revision,
    role,
    canSuggest: row.can_suggest,
    project: p,
    deletionAt: row.deletion_at,
  };
}
export async function listProjects(a: Account) {
  const { rows } = await pool().query(
    `SELECT DISTINCT p.id FROM projects p LEFT JOIN memberships m ON m.project_id=p.id LEFT JOIN support_grants g ON g.project_id=p.id AND g.account_id=$1 WHERE p.buyer_id=$1 OR (m.account_id=$1 AND m.revoked_at IS NULL) OR ($2 AND g.expires_at>now()) ORDER BY p.id`,
    [a.id, a.admin && a.mfa],
  );
  return Promise.all(
    rows.map(async (r) => {
      const row = await accessProject(pool(), a, r.id);
      if (row.role === "support")
        await audit(pool(), a.id, r.id, "support.read");
      return projectView(row);
    }),
  );
}
const text = z.string().trim().min(1).max(100000);
const target = z.string().min(1).max(100);
const visibility = z.enum(["moi", "editeur", "famille"]);
const address = z
  .object({
    name: z.string().trim().min(2).max(100),
    line1: z.string().trim().min(3).max(200),
    postalCode: z.string().trim().min(2).max(20),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().length(2),
  })
  .strict();
export const commandSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("answer"),
        questionId: target,
        text: z.string().trim().max(100000),
        visibility: visibility.default("moi"),
        draft: z.boolean().default(false),
      })
      .strict(),
    z
      .object({
        type: z.literal("memory"),
        memoryId: target,
        text: text.optional(),
        visibility: visibility.optional(),
        inBook: z.boolean().optional(),
        chapterId: target.optional(),
      })
      .strict(),
    z.object({ type: z.literal("delete-memory"), memoryId: target }).strict(),
    z
      .object({
        type: z.literal("question"),
        questionId: target,
        action: z.enum(["skip", "postpone", "open"]),
        days: z.number().int().min(1).max(90).default(7),
      })
      .strict(),
    z
      .object({
        type: z.literal("preferences"),
        cadenceDays: z.number().int().min(0).max(30),
        reminders: z.enum(["douces", "aucune"]),
        buyerSeesProgress: z.boolean(),
        defaultVisibility: visibility,
        marketing: z.boolean(),
      })
      .strict(),
    z
      .object({
        type: z.literal("onboard"),
        consentVersion: z.literal("2026-10-13"),
        accepted: z.literal(true),
      })
      .strict(),
    z
      .object({
        type: z.literal("cover"),
        title: z.string().trim().min(1).max(100),
        subtitle: z.string().max(200),
        dedication: z.string().max(3000),
        template: z.enum(["prune", "creme", "terre"]),
      })
      .strict(),
    z
      .object({
        type: z.literal("chapters"),
        chapters: z
          .array(
            z
              .object({ id: target, title: z.string().trim().min(1).max(100) })
              .strict(),
          )
          .min(1)
          .max(30),
      })
      .strict(),
    z
      .object({
        type: z.literal("suggest"),
        memoryId: target,
        text,
        note: z.string().max(1000).default(""),
      })
      .strict(),
    z
      .object({
        type: z.literal("decide"),
        suggestionId: target,
        accept: z.boolean(),
      })
      .strict(),
    z
      .object({
        type: z.literal("transcript"),
        audioId: target,
        text,
        approved: z.boolean(),
      })
      .strict(),
    z
      .object({
        type: z.literal("photo"),
        photoId: target,
        caption: z.string().max(1000),
        date: z.string().max(100),
        people: z.string().max(500),
        inBook: z.boolean(),
        order: z.number().int().min(0).max(1000),
      })
      .strict(),
    z
      .object({
        type: z.literal("approve"),
        contentHash: z.string().length(64),
        address: address.optional(),
      })
      .strict(),
    z.object({ type: z.literal("reopen") }).strict(),
    z
      .object({
        type: z.literal("delete-project"),
        confirm: z.literal("DELETE"),
      })
      .strict(),
    z.object({ type: z.literal("cancel-deletion") }).strict(),
  ])
  .superRefine((command, ctx) => {
    if (command.type === "answer" && !command.draft && !command.text)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "Ajoutez votre récit avant de valider la réponse.",
      });
  });
export type Command = z.infer<typeof commandSchema>;
export function bookHash(p: Project) {
  // Only rendered content belongs in the approval fingerprint. Preferences,
  // drafts and revision history must not invalidate an already reviewed proof.
  const chapters = composeBook(p, { kind: "narrateur" }).map(
    ({ chapter, memories, photos }) => ({
      title: chapter.title,
      memories: memories.map((m) => ({
        question: m.question,
        paragraphs: m.paras,
        audio: m.audio?.qr.token ?? null,
      })),
      photos: photos.map((ph) => ({
        id: ph.id,
        memoryId: ph.memoryId,
        caption: ph.caption,
        date: ph.date,
        people: ph.people,
      })),
    }),
  );
  return hash(
    JSON.stringify({
      chapters,
      cover: p.book.cover,
      dedication: p.book.dedication,
      narrator: p.narrator.firstName + " " + p.narrator.lastName,
    }),
  );
}
export async function saveProject(
  db: DB,
  a: Account,
  row: ProjectRow,
  p: Project,
) {
  await db.query(
    "INSERT INTO book_versions(id,project_id,revision,content_hash,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id,revision) DO NOTHING",
    [id(), row.id, row.revision, bookHash(unseal(row.payload)), row.payload],
  );
  const payload = seal(p);
  await db.query(
    "UPDATE projects SET payload=$2,revision=revision+1,title=$3,status=$4,updated_at=now() WHERE id=$1",
    [row.id, payload, p.book.cover.title, p.book.status],
  );
  await audit(db, a.id, row.id, "project.updated");
  return { ...row, payload, revision: row.revision + 1 };
}
export async function updateProject(
  a: Account,
  projectId: string,
  revision: number,
  input: unknown,
) {
  const cmd = commandSchema.parse(input);
  return transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(
      row.revision === revision,
      409,
      "Le livre a changé. Rechargez avant de réessayer.",
    );
    const p = unseal<Project>(row.payload);
    const now = Date.now();
    if (cmd.type === "suggest")
      assert(
        (row.role === "editor" || row.role === "contributor") &&
          row.can_suggest,
        403,
        "Propositions non autorisées.",
      );
    else
      assert(
        row.role === "narrator",
        403,
        "Seul le narrateur peut modifier ce livre.",
      );
    assert(
      !row.deletion_at || cmd.type === "cancel-deletion",
      409,
      "La suppression est programmée.",
    );
    const nonEditorial = ["preferences", "delete-project", "cancel-deletion"];
    assert(
      !isLocked(p) || cmd.type === "reopen" || nonEditorial.includes(cmd.type),
      409,
      "Retirez la validation avant toute modification.",
    );
    if (cmd.type === "answer") {
      assert(
        p.onboarded,
        409,
        "Confirmez d’abord les conditions de votre espace.",
      );
      const q = p.questions.find((q) => q.id === cmd.questionId);
      assert(q, 404, "Question introuvable.");
      assert(
        q.availableAt <= now && (!q.postponedUntil || q.postponedUntil <= now),
        409,
        "Cette question n’est pas encore disponible.",
      );
      let m = p.memories.find((m) => m.questionId === q.id);
      if (!m) {
        m = {
          id: id(),
          questionId: q.id,
          chapterId: p.chapters.find((c) => c.key === q.chapter)!.id,
          text: "",
          status: "brouillon",
          visibility: cmd.visibility,
          inBook: true,
          approvedByNarrator: false,
          createdAt: now,
          updatedAt: now,
          revisions: [],
        };
        p.memories.push(m);
      }
      if (cmd.draft) {
        m.draft = cmd.text;
        q.status = "brouillon";
      } else {
        if (m.text)
          m.revisions.push({ at: now, by: a.name || a.email, text: m.text });
        m.text = cmd.text;
        m.draft = undefined;
        m.status = "terminee";
        m.visibility = cmd.visibility;
        q.status = "repondue";
      }
      m.updatedAt = now;
      m.approvedByNarrator = false;
    } else if (cmd.type === "memory") {
      const m = p.memories.find((m) => m.id === cmd.memoryId);
      assert(m, 404, "Souvenir introuvable.");
      if (cmd.text !== undefined) {
        m.revisions.push({ at: now, by: a.name || a.email, text: m.text });
        m.text = cmd.text;
        m.approvedByNarrator = false;
      }
      if (cmd.visibility !== undefined) m.visibility = cmd.visibility;
      if (cmd.inBook !== undefined) m.inBook = cmd.inBook;
      if (cmd.chapterId) {
        assert(
          p.chapters.some((c) => c.id === cmd.chapterId),
          400,
          "Chapitre introuvable.",
        );
        m.chapterId = cmd.chapterId;
        p.photos
          .filter((ph) => ph.memoryId === m.id)
          .forEach((ph) => {
            ph.chapterId = cmd.chapterId;
          });
      }
      m.updatedAt = now;
    } else if (cmd.type === "delete-memory") {
      const m = p.memories.find((x) => x.id === cmd.memoryId);
      assert(m, 404, "Souvenir introuvable.");
      const aids = p.audios.filter((x) => x.memoryId === m.id).map((x) => x.id);
      for (const aid of aids)
        await enqueue(
          db,
          "delete-media",
          { mediaId: aid },
          `delete-media:${aid}`,
        );
      await db.query(
        "DELETE FROM audio_links WHERE project_id=$1 AND audio_id=ANY($2::text[])",
        [row.id, aids],
      );
      p.audios = p.audios.filter((x) => x.memoryId !== m.id);
      p.memories = p.memories.filter((x) => x.id !== m.id);
      p.suggestions = p.suggestions.filter((x) => x.targetId !== m.id);
      p.photos
        .filter((x) => x.memoryId === m.id)
        .forEach((x) => {
          x.memoryId = undefined;
          x.inBook = false;
        });
      const q = p.questions.find((q) => q.id === m.questionId);
      if (q) q.status = "disponible";
    } else if (cmd.type === "question") {
      const q = p.questions.find((q) => q.id === cmd.questionId);
      assert(q, 404, "Question introuvable.");
      if (cmd.action === "skip") q.status = "passee";
      else if (cmd.action === "postpone") {
        q.status = "reportee";
        q.postponedUntil = now + cmd.days * DAY;
      } else {
        q.status = "disponible";
        q.availableAt = now;
        q.postponedUntil = undefined;
      }
    } else if (cmd.type === "preferences") {
      p.privacy = {
        ...p.privacy,
        defaultVisibility: cmd.defaultVisibility,
        buyerSeesProgress: cmd.buyerSeesProgress,
        reminders: cmd.reminders,
        marketing: cmd.marketing,
      };
      p.cadenceDays = cmd.cadenceDays;
      p.questions
        .filter((q) => q.status === "verrouillee")
        .forEach((q, i) => {
          q.availableAt = cmd.cadenceDays
            ? now + (i + 1) * cmd.cadenceDays * DAY
            : Number.MAX_SAFE_INTEGER;
        });
      await db.query(
        "INSERT INTO consent_records(id,account_id,project_id,purpose,version,accepted) VALUES($1,$2,$3,$4,$5,$6)",
        [id(), a.id, row.id, "marketing", "2026-10-13", cmd.marketing],
      );
    } else if (cmd.type === "onboard") {
      p.onboarded = true;
      p.consentAt = now;
      await db.query(
        "INSERT INTO consent_records(id,account_id,project_id,purpose,version,accepted) VALUES($1,$2,$3,$4,$5,true)",
        [id(), a.id, row.id, "service", cmd.consentVersion],
      );
    } else if (cmd.type === "cover") {
      p.book.cover = {
        title: cmd.title,
        subtitle: cmd.subtitle,
        template: cmd.template,
      };
      p.book.dedication = cmd.dedication;
    } else if (cmd.type === "chapters") {
      assert(
        cmd.chapters.length === p.chapters.length &&
          new Set(cmd.chapters.map((c) => c.id)).size === p.chapters.length &&
          cmd.chapters.every((c) => p.chapters.some((x) => x.id === c.id)),
        400,
        "Ordre de chapitres invalide.",
      );
      p.chapters = cmd.chapters.map((c, i) => ({
        ...p.chapters.find((x) => x.id === c.id)!,
        title: c.title,
        order: i,
      }));
    } else if (cmd.type === "suggest") {
      const m = p.memories.find((m) => m.id === cmd.memoryId);
      assert(m && readable(m, row.role), 404, "Souvenir introuvable.");
      p.suggestions.push({
        id: id(),
        kind: "texte",
        targetId: m.id,
        before: m.text,
        after: cmd.text,
        note: cmd.note,
        author: a.name || a.email,
        authorId: a.id,
        status: "en_attente",
        createdAt: now,
      });
    } else if (cmd.type === "decide") {
      const s = p.suggestions.find((s) => s.id === cmd.suggestionId);
      assert(s && s.status === "en_attente", 409, "Proposition déjà traitée.");
      if (cmd.accept) {
        const m = p.memories.find((m) => m.id === s.targetId);
        assert(
          m && m.text === s.before,
          409,
          "Le texte a changé depuis cette proposition.",
        );
        applySuggestion(p, s, now);
      }
      s.status = cmd.accept ? "acceptee" : "refusee";
      s.decidedAt = now;
    } else if (cmd.type === "transcript") {
      const audio = p.audios.find((x) => x.id === cmd.audioId);
      assert(audio, 404, "Enregistrement introuvable.");
      audio.transcript = {
        text: cmd.text,
        status: cmd.approved ? "validee" : "a_relire",
        simulated: false,
        validatedAt: cmd.approved ? now : undefined,
      };
    } else if (cmd.type === "photo") {
      const ph = p.photos.find((x) => x.id === cmd.photoId);
      assert(ph, 404, "Photo introuvable.");
      Object.assign(ph, {
        caption: cmd.caption,
        date: cmd.date,
        people: cmd.people,
        inBook: cmd.inBook,
        order: cmd.order,
      });
    } else if (cmd.type === "approve") {
      assert(
        row.kind === "personal" || cmd.address,
        400,
        "Une adresse de livraison est requise pour ce livre.",
      );
      assert(
        p.onboarded &&
          p.memories.some((m) => m.status === "terminee" && m.inBook),
        409,
        "Ajoutez un souvenir et confirmez votre consentement.",
      );
      assert(
        !p.suggestions.some((s) => s.status === "en_attente"),
        409,
        "Traitez les propositions en attente.",
      );
      assert(
        !p.audios.some(
          (a) => a.qr.enabled && a.transcript.status !== "validee",
        ),
        409,
        "Validez les transcriptions des QR audio.",
      );
      assert(
        cmd.contentHash === bookHash(p),
        409,
        "Prévisualisez la dernière version avant de valider.",
      );
      const proof = (
        await db.query(
          "SELECT pdf_media_id FROM book_versions WHERE project_id=$1 AND content_hash=$2 AND pdf_media_id IS NOT NULL ORDER BY revision DESC LIMIT 1",
          [row.id, cmd.contentHash],
        )
      ).rows[0];
      assert(
        proof,
        409,
        "Téléchargez et relisez l’épreuve PDF avant de valider.",
      );
      p.book.status = "approuve";
      p.book.approvedAt = now;
      p.print.address = cmd.address;
      await db.query(
        "INSERT INTO book_versions(id,project_id,revision,content_hash,payload,approved_by,approved_at,pdf_media_id) VALUES($1,$2,$3,$4,$5,$6,now(),$7)",
        [
          id(),
          row.id,
          row.revision + 1,
          bookHash(p),
          seal(p),
          a.id,
          proof.pdf_media_id,
        ],
      );
    } else if (cmd.type === "reopen") {
      assert(
        p.book.status === "approuve",
        409,
        "Une commande d’impression en cours ne peut pas être modifiée.",
      );
      p.book.status = "brouillon";
      p.book.approvedAt = undefined;
    } else if (cmd.type === "delete-project") {
      assert(
        !["preparation", "impression", "expedie"].includes(p.book.status),
        409,
        "Contactez le support pour arrêter la production en cours.",
      );
      const at = new Date(now + config().DELETION_GRACE_DAYS * DAY);
      await db.query("UPDATE projects SET deletion_at=$2 WHERE id=$1", [
        row.id,
        at,
      ]);
      row.deletion_at = at;
      p.deletionRequestedAt = now;
      await enqueue(
        db,
        "delete-project",
        { projectId: row.id, requestedAt: now },
        `delete-project:${row.id}:${now}`,
        at,
      );
    } else if (cmd.type === "cancel-deletion") {
      assert(
        row.deletion_at && new Date(row.deletion_at).getTime() > now,
        409,
        "Le délai d’annulation est terminé. La suppression peut déjà avoir commencé.",
      );
      await db.query("UPDATE projects SET deletion_at=NULL WHERE id=$1", [
        row.id,
      ]);
      row.deletion_at = null;
      p.deletionRequestedAt = undefined;
    }
    return projectView(await saveProject(db, a, row, p));
  });
}
const inviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((x) => x.toLowerCase()),
    name: z.string().trim().min(1).max(100),
    role: z.enum(["editor", "contributor"]),
    canSuggest: z.boolean().default(true),
  })
  .strict();
export async function invite(a: Account, projectId: string, input: unknown) {
  const v = inviteSchema.parse(input);
  const token = secret();
  await transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(
      row.role === "narrator" && !row.deletion_at,
      403,
      "Invitation non autorisée.",
    );
    assert(v.email !== a.email, 400, "Invitez une autre personne.");
    assert(
      Number(
        (
          await db.query(
            "SELECT count(*) FROM invitations WHERE project_id=$1 AND revoked_at IS NULL",
            [projectId],
          )
        ).rows[0].count,
      ) < 20,
      409,
      "Limite de 20 invitations atteinte.",
    );
    await db.query(
      "UPDATE invitations SET revoked_at=now() WHERE project_id=$1 AND email=$2 AND accepted_at IS NULL",
      [projectId, v.email],
    );
    await db.query(
      "INSERT INTO invitations(id,project_id,token_hash,email,name,role,can_suggest,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '30 days')",
      [id(), projectId, hash(token), v.email, v.name, v.role, v.canSuggest],
    );
    await enqueue(
      db,
      "email",
      {
        projectId,
        invitationHash: hash(token),
        to: v.email,
        subject: "Votre invitation Filémoire",
        text: `Vous êtes invité à aider pour un livre familial. Connectez-vous avec ${v.email}, puis acceptez : ${config().APP_ORIGIN}/rejoindre#token=${token}`,
      },
      `invite:${hash(token)}`,
    );
    await audit(db, a.id, projectId, "invitation.created");
  });
}
export async function acceptInvite(a: Account, token: string) {
  return transaction(async (db) => {
    const { rows } = await db.query(
      "SELECT * FROM invitations WHERE token_hash=$1 FOR UPDATE",
      [hash(token)],
    );
    const inv = rows[0];
    assert(
      inv &&
        inv.email === a.email &&
        !inv.revoked_at &&
        !inv.accepted_at &&
        new Date(inv.expires_at).getTime() > Date.now(),
      400,
      "Invitation invalide, expirée ou destinée à une autre adresse.",
    );
    const result = await db.query(
      "SELECT * FROM projects WHERE id=$1 FOR UPDATE",
      [inv.project_id],
    );
    const row = result.rows[0];
    assert(row && !row.deletion_at, 404, "Livre introuvable.");
    const p = unseal<Project>(row.payload);
    if (inv.role === "narrator") {
      assert(!p.startedAt, 409, "Invitation déjà acceptée.");
      startJourney(p, Date.now());
      p.invitation.status = "acceptee";
      p.invitation.acceptedAt = Date.now();
    }
    await db.query(
      "INSERT INTO memberships(project_id,account_id,role,can_suggest) VALUES($1,$2,$3,$4) ON CONFLICT(project_id,account_id) DO UPDATE SET role=EXCLUDED.role,can_suggest=EXCLUDED.can_suggest,revoked_at=NULL",
      [row.id, a.id, inv.role, inv.can_suggest],
    );
    await db.query(
      "UPDATE accounts SET name=CASE WHEN name='' THEN $2 ELSE name END WHERE id=$1",
      [a.id, inv.name],
    );
    await db.query("UPDATE invitations SET accepted_at=now() WHERE id=$1", [
      inv.id,
    ]);
    await db.query(
      "UPDATE projects SET payload=$2,revision=revision+1 WHERE id=$1",
      [row.id, seal(p)],
    );
    await audit(db, a.id, row.id, "invitation.accepted");
    return row.id as string;
  });
}
export async function revokeMember(
  a: Account,
  projectId: string,
  memberId: string,
) {
  await transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "narrator", 403, "Accès refusé.");
    assert(
      memberId !== a.id,
      400,
      "Vous ne pouvez pas retirer votre propre accès.",
    );
    await db.query(
      "UPDATE memberships SET revoked_at=now() WHERE project_id=$1 AND account_id=$2",
      [projectId, memberId],
    );
    await db.query(
      "UPDATE invitations SET revoked_at=now() WHERE project_id=$1 AND email=(SELECT email FROM accounts WHERE id=$2)",
      [projectId, memberId],
    );
    await audit(db, a.id, projectId, "member.revoked");
  });
}
export async function preview(a: Account, projectId: string) {
  const row = await accessProject(pool(), a, projectId);
  assert(row.role === "narrator", 403, "Aperçu final réservé au narrateur.");
  const p = unseal<Project>(row.payload);
  return {
    revision: row.revision,
    contentHash: bookHash(p),
    chapters: sortedChapters(p),
    book: composeBook(p, { kind: "narrateur" }),
    cover: p.book.cover,
    dedication: p.book.dedication,
  };
}
export const parseVisibility = (v: unknown): Visibility => visibility.parse(v);

export async function resendNarratorInvite(a: Account, projectId: string) {
  await transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "buyer" && !row.deletion_at, 403, "Accès refusé.");
    const p = unseal<Project>(row.payload);
    assert(!p.startedAt, 409, "Le narrateur a déjà accepté son invitation.");
    const token = secret(),
      now = Date.now();
    await db.query(
      "UPDATE invitations SET revoked_at=now() WHERE project_id=$1 AND role='narrator' AND accepted_at IS NULL",
      [projectId],
    );
    await db.query(
      "INSERT INTO invitations(id,project_id,token_hash,email,name,role,expires_at) VALUES($1,$2,$3,$4,$5,'narrator',now()+interval '30 days')",
      [
        id(),
        projectId,
        hash(token),
        p.narrator.email,
        `${p.narrator.firstName} ${p.narrator.lastName}`,
      ],
    );
    await enqueue(
      db,
      "email",
      {
        projectId,
        invitationHash: hash(token),
        to: p.narrator.email,
        subject: "Votre invitation Filémoire",
        text: `Un livre de souvenirs vous attend. Connectez-vous avec ${p.narrator.email}, puis acceptez votre invitation : ${config().APP_ORIGIN}/rejoindre#token=${token}`,
      },
      `narrator-invite:${hash(token)}`,
    );
    p.invitation = {
      token: "",
      status: "programmee",
      sendAt: now,
      expiresAt: now + 30 * DAY,
    };
    await saveProject(db, a, row, p);
    await audit(db, a.id, projectId, "narrator.invitation.resent");
  });
}

export async function cancelNarratorInvite(a: Account, projectId: string) {
  await transaction(async (db) => {
    // Match acceptInvite's invitation-before-project lock order.
    await db.query(
      "SELECT id FROM invitations WHERE project_id=$1 AND role='narrator' ORDER BY id FOR UPDATE",
      [projectId],
    );
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "buyer" && !row.deletion_at, 403, "Accès refusé.");
    const p = unseal<Project>(row.payload);
    assert(!p.startedAt, 409, "Le narrateur a déjà accepté son invitation.");
    await db.query(
      "UPDATE invitations SET revoked_at=now() WHERE project_id=$1 AND role='narrator' AND accepted_at IS NULL",
      [projectId],
    );
    p.invitation.status = "revoquee";
    await saveProject(db, a, row, p);
    await audit(db, a.id, projectId, "narrator.invitation.cancelled");
  });
}
