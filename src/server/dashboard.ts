import type { Account } from "./auth";
import { requireAdmin } from "./auth";
import { pool } from "./db";
import { accessProject, projectView } from "./projects";
import { unseal } from "./security";
import type { Project } from "@/lib/types";
import { supportList } from "./support";
import type { checkoutSchema } from "./payments";
import type { z } from "zod";
import { isLowRes } from "@/lib/rules";

/** Explicit operational allowlist: never send the encrypted manuscript or media URLs. */
function projectMetadata(payload: string) {
  const p = unseal<Project>(payload);
  return {
    narrator: [p.narrator.firstName, p.narrator.lastName]
      .filter(Boolean)
      .join(" "),
    packageCode: p.packageCode,
    invitation: p.invitation.status,
    answered: p.questions.filter((q) => q.status === "repondue").length,
    questions: p.questions.length,
    lowResolution: p.photos.filter(
      (photo) => photo.inBook && !!photo.chapterId && isLowRes(photo),
    ).length,
    photoCount: p.photos.filter((photo) => photo.inBook && !!photo.chapterId)
      .length,
    orderId: p.orderId,
  };
}
function orderMetadata(payload: string) {
  const order = unseal<z.infer<typeof checkoutSchema>>(payload);
  return {
    packageCode: order.packageCode,
    recipient: [order.recipient.firstName, order.recipient.lastName]
      .filter(Boolean)
      .join(" "),
    theme: order.theme,
    giftBox: order.giftBox,
    extraCopies: order.extraCopies,
    deliveryDate: order.deliveryDate,
  };
}
export async function buyerOrders(account: Account) {
  const { rows } = await pool().query(
    "SELECT id,total,currency,status,created_at,payload FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC,id",
    [account.id],
  );
  return rows.map(({ payload, ...row }) => ({
    ...row,
    ...orderMetadata(payload),
  }));
}

export async function dashboardOverview(account: Account) {
  requireAdmin(account);
  const [orders, projects, prints, support, jobs, pendingSupport] =
    await Promise.all([
      pool().query(
        "SELECT count(*)::int AS count,coalesce(sum(total),0)::bigint AS total FROM orders WHERE status='paid'",
      ),
      pool().query(
        "SELECT count(*)::int AS count,count(*) FILTER (WHERE EXISTS(SELECT 1 FROM memberships m WHERE m.project_id=projects.id AND m.role='narrator' AND m.revoked_at IS NULL))::int AS accepted FROM projects WHERE kind='purchased'",
      ),
      pool().query(
        "SELECT count(*)::int AS count FROM print_orders WHERE status NOT IN ('livre','incident')",
      ),
      pool().query(
        "SELECT count(*)::int AS count FROM support_requests WHERE status IN ('open','in_progress')",
      ),
      pool().query(
        "SELECT id,kind,state,attempts FROM jobs WHERE state='failed' ORDER BY run_at,id LIMIT 25",
      ),
      pool().query(
        "SELECT id,payload,status FROM support_requests WHERE status IN ('open','in_progress') ORDER BY created_at,id LIMIT 3",
      ),
    ]);
  return {
    pendingSupport: pendingSupport.rows.map((r) => {
      const request = unseal<{ topic: string; message: string }>(r.payload);
      return {
        id: r.id,
        topic: request.topic,
        excerpt: request.message.slice(0, 120),
        status: r.status,
      };
    }),
    paid: orders.rows[0].count,
    revenue: Number(orders.rows[0].total),
    projects: projects.rows[0].count,
    accepted: projects.rows[0].accepted,
    production: prints.rows[0].count,
    openSupport: support.rows[0].count,
    jobs: jobs.rows,
  };
}
export async function dashboardRecords(
  account: Account,
  section: string,
  page: number,
  status: string,
) {
  requireAdmin(account);
  const limit = 25;
  // SQL identifiers are chosen from this closed map, never interpolated from request values.
  const tables: Record<string, string> = {
    commandes: "orders",
    projets: "projects",
    impression: "print_orders",
    support: "support_requests",
  };
  const table = section === "validation" ? "projects" : tables[section];
  if (!table) return { rows: [], total: 0, page: 1, allTotal: 0 };
  const where =
    section === "validation"
      ? " WHERE t.status='approuve' AND t.kind='purchased' AND t.deletion_at IS NULL AND NOT EXISTS(SELECT 1 FROM print_orders po WHERE po.project_id=t.id)"
      : status
        ? " WHERE t.status=$1"
        : "";
  const values = section !== "validation" && status ? [status] : [];
  const total = Number(
    (await pool().query(`SELECT count(*) FROM ${table} t${where}`, values))
      .rows[0].count,
  );
  const allTotal = Number(
    (await pool().query(`SELECT count(*) FROM ${table}`)).rows[0].count,
  );
  const current = Math.max(1, Math.min(page, Math.ceil(total / limit) || 1));
  const projectSection = section === "projets" || section === "validation";
  const fields =
    section === "commandes"
      ? "t.id,t.total,t.currency,t.status,t.created_at,t.payload,a.name AS buyer,p.payload AS project_payload"
      : projectSection
        ? `t.id,t.status,t.kind,t.created_at,t.payload,EXISTS(SELECT 1 FROM memberships m WHERE m.project_id=t.id AND m.role='narrator' AND m.revoked_at IS NULL) AS activated,EXISTS(SELECT 1 FROM support_grants g WHERE g.project_id=t.id AND g.account_id=$${values.length + 3} AND g.expires_at>now()) AS support_access`
        : section === "impression"
          ? "t.id,t.project_id,t.status,t.tracking,t.incident,t.created_at,p.payload AS project_payload,p.status AS book_status"
          : "t.id,t.payload,t.status,t.created_at,(t.reply IS NULL) AS can_reply";
  const join =
    section === "commandes"
      ? " LEFT JOIN accounts a ON a.id=t.buyer_id LEFT JOIN projects p ON p.order_id=t.id"
      : section === "impression"
        ? " JOIN projects p ON p.id=t.project_id"
        : "";
  const { rows } = await pool().query(
    `SELECT ${fields} FROM ${table} t${join}${where} ORDER BY t.created_at DESC,t.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [
      ...values,
      limit,
      (current - 1) * limit,
      ...(projectSection ? [account.id] : []),
    ],
  );
  return {
    rows: rows.map(({ payload, project_payload, ...row }) => {
      if (section === "support") {
        const ticket =
          unseal<
            Pick<
              Awaited<ReturnType<typeof supportList>>[number],
              "name" | "email" | "topic" | "message"
            >
          >(payload);
        return {
          ...row,
          name: ticket.name,
          email: ticket.email,
          topic: ticket.topic,
          message: ticket.message,
        };
      }
      if (section === "commandes")
        return {
          ...row,
          ...orderMetadata(payload),
          invitation: project_payload
            ? projectMetadata(project_payload).invitation
            : null,
        };
      return { ...row, ...projectMetadata(payload ?? project_payload) };
    }),
    total,
    allTotal,
    page: current,
  };
}

/** Only the author's safe status metadata, while the target remains readable now. */
export async function ownProposals(account: Account) {
  const { rows } = await pool().query(
    "SELECT p.id FROM projects p JOIN memberships m ON m.project_id=p.id WHERE m.account_id=$1 AND m.revoked_at IS NULL AND m.role IN ('editor','contributor') ORDER BY p.id",
    [account.id],
  );
  const proposals = [];
  for (const { id } of rows) {
    const row = await accessProject(pool(), account, id);
    const readableIds = new Set(
      projectView(row).project.memories.map((memory) => memory.id),
    );
    const project = unseal<Project>(row.payload);
    for (const suggestion of project.suggestions) {
      // Legacy display names cannot establish authorship and must not be matched.
      if (
        suggestion.authorId === account.id &&
        readableIds.has(suggestion.targetId)
      )
        proposals.push({
          id: suggestion.id,
          title: project.book.cover.title,
          kind: suggestion.kind,
          projectId: project.id,
          createdAt: suggestion.createdAt,
          status: suggestion.status,
        });
    }
  }
  return proposals.sort((a, b) => b.createdAt - a.createdAt);
}
