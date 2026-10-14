import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { pool } from "../../src/server/db";
import { id, seal, unseal } from "../../src/server/security";
import {
  applyStripeEvent,
  checkoutSchema,
  checkoutTotal,
} from "../../src/server/payments";
import {
  acceptInvite,
  accessProject,
  projectView,
  updateProject,
} from "../../src/server/projects";
import type { Account } from "../../src/server/auth";

export function configureTests() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "TEST_DATABASE_URL must point at an isolated filemoire_test database.",
    );
  const parsed = new URL(url);
  if (
    parsed.pathname !== "/filemoire_test" ||
    !["localhost", "127.0.0.1", "db"].includes(parsed.hostname)
  )
    throw new Error("Refusing to reset a non-test database.");
  process.env.DATABASE_URL = url;
  process.env.DATA_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
  process.env.STORAGE_DRIVER = "local";
  process.env.LOCAL_STORAGE_DIR = ".production-test/media";
  process.env.APP_MODE = "live";
  process.env.NEXT_PUBLIC_APP_MODE = "live";
  process.env.APP_ORIGIN ??= "http://localhost:3300";
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture_only";
  process.env.PRINT_ENABLED = "false";
  process.env.PRINT_SPEC_APPROVED = "false";
}
export async function resetTests() {
  await pool().query(
    "TRUNCATE accounts,orders,projects,jobs,login_tokens,webhook_events,rate_limits,service_heartbeats,support_requests CASCADE",
  );
}
export async function account(
  email = `person-${id()}@example.test`,
): Promise<Account> {
  const a = {
    id: id(),
    email,
    name: "Test participant",
    admin: false,
    mfa: false,
  };
  await pool().query("INSERT INTO accounts(id,email,name) VALUES($1,$2,$3)", [
    a.id,
    a.email,
    a.name,
  ]);
  return a;
}
export async function pendingOrder(
  buyer: Account,
  recipient: Account,
  packageCode: "essentiel" | "heritage" | "voix" = "voix",
) {
  const input = checkoutSchema.parse({
    requestKey: id(),
    packageCode,
    theme: "vie",
    recipient: {
      firstName: "Camille",
      lastName: "Test",
      email: recipient.email,
      relation: "Parent",
    },
    message: "Gift fixture",
    deliveryDate: new Date().toISOString().slice(0, 10),
    giftBox: false,
    extraCopies: 0,
    termsVersion: "2026-10-13",
    accepted: true,
  });
  const orderId = id();
  await pool().query(
    "INSERT INTO orders(id,buyer_id,request_key,total,payload,status) VALUES($1,$2,$3,$4,$5,'pending')",
    [orderId, buyer.id, input.requestKey, checkoutTotal(input), seal(input)],
  );
  const event = {
    id: `evt_${id()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${id()}`,
        metadata: { orderId },
        payment_status: "paid",
        amount_total: checkoutTotal(input),
        currency: "eur",
        payment_intent: `pi_${id()}`,
      },
    },
  } as unknown as Stripe.Event;
  return { orderId, event, input };
}
export async function newestEmailToken(email: string) {
  const rows = (
    await pool().query(
      "SELECT payload FROM jobs WHERE kind='email' ORDER BY created_at DESC",
    )
  ).rows;
  const message = rows
    .map((r) => unseal<{ to: string; text: string }>(r.payload))
    .find((r) => r.to === email && r.text.includes("#token="));
  if (!message) throw new Error("No queued email fixture");
  return message.text.match(/#token=([\w-]+)/)![1];
}
export async function book(
  packageCode: "essentiel" | "heritage" | "voix" = "voix",
) {
  const buyer = await account(),
    narrator = await account();
  const pending = await pendingOrder(buyer, narrator, packageCode);
  await applyStripeEvent(pending.event);
  const projectId = await acceptInvite(
    narrator,
    await newestEmailToken(narrator.email),
  );
  let view = projectView(await accessProject(pool(), narrator, projectId));
  view = await updateProject(narrator, projectId, view.revision, {
    type: "onboard",
    consentVersion: "2026-10-13",
    accepted: true,
  });
  return { buyer, narrator, projectId, view, ...pending };
}
export async function answer(
  b: Awaited<ReturnType<typeof book>>,
  text = "Un souvenir test, privé et précieux.",
) {
  const row = await accessProject(pool(), b.narrator, b.projectId);
  const view = projectView(row);
  return updateProject(b.narrator, b.projectId, row.revision, {
    type: "answer",
    questionId: view.project.questions[0].id,
    text,
    visibility: "moi",
    draft: false,
  });
}
