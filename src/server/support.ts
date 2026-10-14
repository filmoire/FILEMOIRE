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
    assert(r && r.status === "open", 409, "Cette demande a déjà été traitée.");
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
