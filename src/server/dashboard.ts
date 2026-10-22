import type { Account } from "./auth";
import { requireAdmin } from "./auth";
import { pool } from "./db";
import { accessProject, projectView } from "./projects";
import { unseal } from "./security";
import type { Project } from "@/lib/types";
import { supportList } from "./support";

export async function dashboardOverview(account: Account) {
  requireAdmin(account);
  const [orders, projects, prints, support, jobs] = await Promise.all([
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
      "SELECT count(*)::int AS count FROM support_requests WHERE status='open'",
    ),
    pool().query(
      "SELECT id,kind,state,attempts FROM jobs WHERE state='failed' ORDER BY run_at,id LIMIT 25",
    ),
  ]);
  return {
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
  const table = tables[section];
  if (!table) return { rows: [], total: 0, page: 1 };
  const where = status ? " WHERE status=$1" : "";
  const values = status ? [status] : [];
  const total = Number(
    (await pool().query(`SELECT count(*) FROM ${table}${where}`, values))
      .rows[0].count,
  );
  const current = Math.max(1, Math.min(page, Math.ceil(total / limit) || 1));
  const fields =
    section === "commandes"
      ? "id,total,currency,status,created_at"
      : section === "projets"
        ? `id,status,kind,created_at,EXISTS(SELECT 1 FROM memberships m WHERE m.project_id=projects.id AND m.role='narrator' AND m.revoked_at IS NULL) AS activated,EXISTS(SELECT 1 FROM support_grants g WHERE g.project_id=projects.id AND g.account_id=$${values.length + 3} AND g.expires_at>now()) AS support_access`
        : section === "impression"
          ? "id,project_id,status,tracking,incident,created_at"
          : "id,payload,status,created_at";
  const { rows } = await pool().query(
    `SELECT ${fields} FROM ${table}${where} ORDER BY created_at DESC,id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [
      ...values,
      limit,
      (current - 1) * limit,
      ...(section === "projets" ? [account.id] : []),
    ],
  );
  return {
    rows:
      section === "support"
        ? rows.map(({ payload, ...row }) => ({
            ...row,
            ...unseal<
              Pick<
                Awaited<ReturnType<typeof supportList>>[number],
                "name" | "email" | "topic" | "message"
              >
            >(payload),
          }))
        : rows,
    total,
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
          createdAt: suggestion.createdAt,
          status: suggestion.status,
        });
    }
  }
  return proposals.sort((a, b) => b.createdAt - a.createdAt);
}
