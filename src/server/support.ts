import { z } from "zod";
import type { Account } from "./auth";
import { requireAdmin } from "./auth";
import { pool, transaction } from "./db";
import { id, seal, unseal, assert, audit } from "./security";
import { enqueue } from "./jobs";
export const contactSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((x) => x.toLowerCase()),
    topic: z.enum(["question", "devis"]),
    message: z.string().trim().min(10).max(5000),
  })
  .strict();
export async function contact(input: unknown) {
  const v = contactSchema.parse(input);
  const ticketId = id();
  await pool().query("INSERT INTO support_requests(id,payload) VALUES($1,$2)", [
    ticketId,
    seal(v),
  ]);
  return { id: ticketId };
}
export async function supportList(a: Account) {
  requireAdmin(a);
  return (
    await pool().query(
      "SELECT * FROM support_requests ORDER BY created_at DESC LIMIT 100",
    )
  ).rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    ...unseal<z.infer<typeof contactSchema>>(r.payload),
  }));
}
export async function replySupport(
  a: Account,
  ticketId: string,
  input: unknown,
) {
  requireAdmin(a);
  const v = z
    .object({ text: z.string().trim().min(5).max(5000) })
    .strict()
    .parse(input);
  await transaction(async (db) => {
    const r = (
      await db.query("SELECT * FROM support_requests WHERE id=$1 FOR UPDATE", [
        ticketId,
      ])
    ).rows[0];
    assert(
      r && !r.reply && ["open", "in_progress"].includes(r.status),
      409,
      "Cette demande a déjà été traitée.",
    );
    const request = unseal<z.infer<typeof contactSchema>>(r.payload);
    await enqueue(
      db,
      "email",
      { to: request.email, subject: "Votre demande Filémoire", text: v.text },
      `support-reply:${ticketId}`,
    );
    await db.query(
      "UPDATE support_requests SET status='replied',reply=$2,replied_at=now() WHERE id=$1",
      [ticketId, seal(v.text)],
    );
    await audit(db, a.id, null, "support.replied");
  });
}

/** Compare-and-set prevents a stale operator tab from undoing another operator's work. */
export async function updateSupportStatus(
  a: Account,
  ticketId: string,
  input: unknown,
) {
  requireAdmin(a);
  const statuses = z.enum(["open", "in_progress", "replied", "closed"]);
  const value = z
    .object({
      expectedStatus: statuses,
      status: z.enum(["open", "in_progress", "closed"]),
    })
    .strict()
    .parse(input);
  await transaction(async (db) => {
    const result = await db.query(
      "UPDATE support_requests SET status=$3 WHERE id=$1 AND status=$2 RETURNING id",
      [ticketId, value.expectedStatus, value.status],
    );
    assert(
      result.rowCount === 1,
      409,
      "Cette demande a changé. Actualisez la liste avant de réessayer.",
    );
    await audit(db, a.id, null, "support.status_updated");
  });
}
