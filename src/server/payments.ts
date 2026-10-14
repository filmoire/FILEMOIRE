import Stripe from "stripe";
import { z } from "zod";
import {
  pkg,
  EXTRA_COPY_PRICE,
  GIFT_BOX_PRICE,
  buildLibrary,
} from "@/lib/catalog";
import { projectFromOrder } from "@/lib/factory";
import type { Order } from "@/lib/types";
import type { Account } from "./auth";
import { pool, transaction, type DB } from "./db";
import { config, configured } from "./config";
import { assert, audit, hash, id, seal, secret, unseal } from "./security";
import { enqueue } from "./jobs";
import { giftDeliveryTime } from "./time";
const stripe = () => new Stripe(configured("STRIPE_SECRET_KEY"));
export const checkoutSchema = z
  .object({
    requestKey: z.string().uuid(),
    packageCode: z.enum(["essentiel", "heritage", "voix"]),
    theme: z.enum([
      "vie",
      "migration",
      "metier",
      "couple",
      "parentalite",
      "recettes",
      "retraite",
    ]),
    recipient: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((x) => x.toLowerCase()),
        relation: z.string().trim().min(1).max(100),
      })
      .strict(),
    message: z.string().max(2000),
    deliveryDate: z.string().date(),
    giftBox: z.boolean(),
    extraCopies: z.number().int().min(0).max(10),
    termsVersion: z.literal("2026-10-13"),
    accepted: z.literal(true),
  })
  .strict();
export function checkoutTotal(input: z.infer<typeof checkoutSchema>) {
  return (
    pkg(input.packageCode).price! +
    (input.giftBox ? GIFT_BOX_PRICE : 0) +
    input.extraCopies * EXTRA_COPY_PRICE
  );
}
export async function createCheckout(a: Account, input: unknown) {
  const v = checkoutSchema.parse(input);
  assert(
    process.env.CHECKOUT_ENABLED === "true",
    503,
    "Les commandes ne sont pas encore ouvertes.",
  );
  assert(
    process.env.LEGAL_APPROVED === "true" &&
      process.env.COMMERCIAL_APPROVED === "true",
    503,
    "Les conditions de lancement attendent leur validation.",
  );
  assert(
    !process.env.ORDER_CUTOFF_AT ||
      Date.now() < new Date(process.env.ORDER_CUTOFF_AT).getTime(),
    409,
    "La date limite de commande est dépassée.",
  );
  assert(
    new Date(v.deliveryDate + "T12:00:00Z").getTime() > Date.now() - DAY_MS,
    400,
    "Choisissez une date actuelle ou future.",
  );
  const order = await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(76001014)");
    const existing = await db.query(
      "SELECT * FROM orders WHERE buyer_id=$1 AND request_key=$2 FOR UPDATE",
      [a.id, v.requestKey],
    );
    if (existing.rows[0]) {
      assert(
        JSON.stringify(unseal(existing.rows[0].payload)) === JSON.stringify(v),
        409,
        "Cette demande a déjà été utilisée avec d’autres détails.",
      );
      assert(
        existing.rows[0].status === "pending",
        409,
        "Commande déjà traitée.",
      );
      assert(
        Date.now() - new Date(existing.rows[0].created_at).getTime() <
          23 * 3600000,
        409,
        "Cette tentative de paiement a expiré. Recommencez depuis le formulaire.",
      );
      return existing.rows[0];
    }
    const count = await db.query(
      "SELECT count(*) FROM orders WHERE status='paid' OR (status='pending' AND created_at>now()-interval '24 hours')",
    );
    assert(
      Number(count.rows[0].count) < config().COHORT_LIMIT,
      409,
      "La cohorte actuelle est complète.",
    );
    const row = (
      await db.query(
        "INSERT INTO orders(id,buyer_id,request_key,total,payload,status) VALUES($1,$2,$3,$4,$5,'pending') RETURNING *",
        [id(), a.id, v.requestKey, checkoutTotal(v), seal(v)],
      )
    ).rows[0];
    await db.query(
      "INSERT INTO consent_records(id,account_id,purpose,version,accepted) VALUES($1,$2,'purchase-terms',$3,true)",
      [id(), a.id, v.termsVersion],
    );
    return row;
  });
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: a.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: order.total,
            product_data: {
              name: pkg(v.packageCode).name,
              description: `${pkg(v.packageCode).questions} questions, ${1 + v.extraCopies} exemplaire(s)${v.giftBox ? ", coffret cadeau" : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config().APP_ORIGIN}/espace?commande=${order.id}`,
      cancel_url: `${config().APP_ORIGIN}/offrir`,
      // Keep request parameters identical across retries; Stripe defaults to a
      // 24-hour session. An explicit moving expires_at breaks idempotency.
    },
    { idempotencyKey: `checkout:${order.id}` },
  );
  await pool().query(
    "UPDATE orders SET checkout_id=$2 WHERE id=$1 AND checkout_id IS NULL",
    [order.id, session.id],
  );
  assert(session.url, 502, "Paiement indisponible.");
  return { url: session.url, orderId: order.id };
}
const DAY_MS = 86400000;
async function fulfill(db: DB, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const orderId = z.string().uuid().parse(session.metadata?.orderId);
  const { rows } = await db.query(
    "SELECT o.*,a.email AS buyer_email,a.name AS buyer_name FROM orders o JOIN accounts a ON a.id=o.buyer_id WHERE o.id=$1 FOR UPDATE OF o",
    [orderId],
  );
  const row = rows[0];
  assert(row, 400, "Unknown payment order");
  assert(
    session.amount_total === row.total && session.currency === "eur",
    400,
    "Payment amount mismatch",
  );
  assert(
    !row.checkout_id || row.checkout_id === session.id,
    400,
    "Checkout mismatch",
  );
  if (row.status === "paid" || row.status === "refunded") return;
  assert(
    row.status === "pending" || row.status === "expired",
    409,
    "Invalid order state",
  );
  const v = checkoutSchema.parse(unseal(row.payload));
  const now = Date.now();
  const order: Order = {
    id: row.id,
    ref: `FM-${row.id.slice(0, 8).toUpperCase()}`,
    buyerName: row.buyer_name || row.buyer_email,
    buyerEmail: row.buyer_email,
    ...v,
    length: pkg(v.packageCode).questions!,
    total: row.total,
    status: "payee",
    payments: [],
    createdAt: now,
  };
  const p = projectFromOrder(order, buildLibrary(), now);
  p.id = id();
  p.invitation.token = "";
  const token = secret();
  const sendAt = new Date(
    Math.max(
      now,
      giftDeliveryTime(v.deliveryDate, config().APP_TIMEZONE).getTime(),
    ),
  );
  p.invitation.sendAt = sendAt.getTime();
  p.invitation.expiresAt = sendAt.getTime() + 30 * DAY_MS;
  p.invitation.status = "programmee";
  p.invitation.sentAt = undefined;
  await db.query(
    "UPDATE orders SET status='paid',checkout_id=$2,payment_id=$3 WHERE id=$1",
    [
      row.id,
      session.id,
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
    ],
  );
  await db.query(
    "INSERT INTO projects(id,order_id,buyer_id,narrator_email,title,payload) VALUES($1,$2,$3,$4,$5,$6)",
    [
      p.id,
      row.id,
      row.buyer_id,
      v.recipient.email,
      p.book.cover.title,
      seal(p),
    ],
  );
  await db.query(
    "INSERT INTO invitations(id,project_id,token_hash,email,name,role,expires_at) VALUES($1,$2,$3,$4,$5,'narrator',$6)",
    [
      id(),
      p.id,
      hash(token),
      v.recipient.email,
      `${v.recipient.firstName} ${v.recipient.lastName}`,
      new Date(sendAt.getTime() + 30 * DAY_MS),
    ],
  );
  await enqueue(
    db,
    "email",
    {
      projectId: p.id,
      invitationHash: hash(token),
      to: v.recipient.email,
      subject: "Un livre de souvenirs vous attend",
      text: `${order.buyerName} vous offre Filémoire.\n${v.message}\nConnectez-vous avec ${v.recipient.email}, puis acceptez votre invitation : ${config().APP_ORIGIN}/rejoindre#token=${token}`,
    },
    `gift:${row.id}`,
    sendAt,
  );
  await enqueue(
    db,
    "email",
    {
      to: row.buyer_email,
      subject: "Votre commande Filémoire est confirmée",
      text: `Commande ${order.ref}. Montant payé : ${(row.total / 100).toFixed(2)} EUR. Retrouvez votre commande dans ${config().APP_ORIGIN}/espace`,
    },
    `receipt:${row.id}`,
  );
  await audit(db, row.buyer_id, p.id, "payment.fulfilled");
}
export async function applyStripeEvent(event: Stripe.Event) {
  await transaction(async (db) => {
    const inserted = await db.query(
      "INSERT INTO webhook_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
      [event.id],
    );
    if (!inserted.rowCount) return;
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    )
      await fulfill(db, event.data.object as Stripe.Checkout.Session);
    if (event.type === "checkout.session.expired")
      await db.query(
        "UPDATE orders SET status='expired' WHERE checkout_id=$1 AND status='pending'",
        [(event.data.object as Stripe.Checkout.Session).id],
      );
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.refunded)
        await db.query(
          "UPDATE orders SET status='refunded' WHERE payment_id=$1",
          [
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id,
          ],
        );
    }
  });
}
export async function stripeWebhook(body: string, signature: string | null) {
  assert(signature, 400, "Missing signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      configured("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    assert(false, 400, "Invalid webhook signature");
  }
  await applyStripeEvent(event);
}
export async function refundOrder(
  a: Account,
  orderId: string,
  _requestKey: string,
) {
  assert(
    a.admin && a.mfa,
    403,
    "Authentification administrateur renforcée requise.",
  );
  const row = await transaction(async (db) => {
    const r = (
      await db.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [orderId])
    ).rows[0];
    assert(
      r?.status === "paid" && r.payment_id,
      409,
      "Commande non remboursable.",
    );
    assert(
      !r.production_committed,
      409,
      "Arrêtez la production avec le support avant remboursement.",
    );
    await db.query("UPDATE orders SET refund_requested=true WHERE id=$1", [
      orderId,
    ]);
    return r;
  });
  const refund = await stripe().refunds.create(
    { payment_intent: row.payment_id },
    { idempotencyKey: `refund:${orderId}` },
  );
  await audit(pool(), a.id, null, "refund.requested");
  return { id: refund.id, status: refund.status };
}
