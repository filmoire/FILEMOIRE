import { z } from "zod";
import { transaction } from "./db";
import { assert, seal, unseal } from "./security";
import { enqueue } from "./jobs";
import { config } from "./config";
import { renderEmail } from "./email-templates";

export const withdrawalSchema = z
  .object({
    requestKey: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    orderReference: z.string().trim().min(3).max(100),
    language: z.enum(["fr", "en"]),
    confirmed: z.literal(true),
  })
  .strict();

// A declaration is accepted without an account or a reason. It never discloses
// whether an order exists, cancels someone else's order or triggers a refund.
// Operations must verify the declared identity and applicable rights separately.
export async function requestWithdrawal(input: unknown) {
  const v = withdrawalSchema.parse(input);
  const declaration =
    v.language === "en"
      ? `I notify Intertrad that I withdraw from the contract identified by: ${v.orderReference}.`
      : `Je notifie à Intertrad ma décision de me rétracter du contrat identifié par : ${v.orderReference}.`;
  const payload = {
    topic: "retractation",
    name: v.name,
    email: v.email,
    orderReference: v.orderReference,
    language: v.language,
    message: declaration,
  };
  return transaction(async (db) => {
    const inserted = await db.query(
      "INSERT INTO support_requests(id,payload) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING id,created_at",
      [v.requestKey, seal(payload)],
    );
    let row = inserted.rows[0];
    if (!row) {
      row = (
        await db.query(
          "SELECT id,created_at,payload FROM support_requests WHERE id=$1",
          [v.requestKey],
        )
      ).rows[0];
      assert(
        row && JSON.stringify(unseal(row.payload)) === JSON.stringify(payload),
        409,
        "Cette référence de demande est déjà utilisée. Recommencez le formulaire.",
      );
    }
    const receivedAt = new Date(row.created_at).toISOString();
    const receipt = renderEmail(
      {
        kind: "withdrawal-receipt",
        name: v.name,
        email: v.email,
        reference: row.id,
        orderReference: v.orderReference,
        receivedAt,
        declaration,
        language: v.language,
      },
      config().APP_ORIGIN,
    );
    // Same transaction as the recorded declaration; retries never send a second
    // acknowledgement. The receipt remains available as a downloaded text file.
    await enqueue(
      db,
      "email",
      { to: v.email, ...receipt },
      `withdrawal:${row.id}`,
    );
    return {
      id: row.id as string,
      receivedAt,
      text: receipt.text,
      emailStatus: "queued" as const,
    };
  });
}
