import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  newestEmailToken,
  account,
  book,
  pendingOrder,
} from "./helpers";
import { requestLogin, consumeLogin } from "../../src/server/auth";
import { handleApi } from "../../src/server/api";
import { processOne, scheduleDue } from "../../src/server/worker";
import { pool } from "../../src/server/db";
import { enqueue } from "../../src/server/jobs";
import { randomUUID } from "node:crypto";
import { seal, unseal } from "../../src/server/security";
import { invite, resendNarratorInvite } from "../../src/server/projects";
import { applyStripeEvent } from "../../src/server/payments";
import { contact, replySupport } from "../../src/server/support";
import type { Project } from "../../src/lib/types";

beforeAll(configureTests);
beforeEach(async () => {
  await resetTests();
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("EMAIL_FROM", "Filémoire <sender@example.test>");
  vi.stubEnv("RESEND_API_KEY", "test-key-never-sent");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(closeTestDatabase);

async function delivery(receipt: string) {
  const response = await handleApi(
    new Request(`http://localhost:3300/api/v1/auth/delivery/${receipt}`),
    ["auth", "delivery", receipt],
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}

it("preserves provider idempotency for jobs queued before HTML templates existed", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "legacy-provider-confirmation" }));
  vi.stubGlobal("fetch", fetch);
  await enqueue(
    pool(),
    "email",
    {
      to: "legacy@example.test",
      subject: "Original subject",
      text: "Original body",
    },
    "legacy-email",
  );
  await processOne();
  const sent = JSON.parse(fetch.mock.calls[0][1].body);
  expect(sent).toEqual({
    from: "Filémoire <sender@example.test>",
    to: ["legacy@example.test"],
    subject: "Original subject",
    text: "Original body",
  });
});

it("reports queued, then provider-accepted mail, and keeps the link single-use", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "provider-confirmation" }));
  vi.stubGlobal("fetch", fetch);
  const response = await handleApi(
    new Request("http://localhost:3300/api/v1/auth/request", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3300",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "delivery@example.test" }),
    }),
    ["auth", "request"],
  );
  expect(response.status).toBe(202);
  const request = await response.json();
  expect(request.status).toBe("pending");
  expect(request.receipt).toMatch(/^[\da-f-]{36}$/);
  expect(await delivery(request.receipt)).toEqual({ status: "pending" });
  await processOne();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await delivery(request.receipt)).toEqual({ status: "sent" });
  const token = await newestEmailToken("delivery@example.test");
  const sent = JSON.parse(fetch.mock.calls[0][1].body);
  expect(sent.html).toContain(`http://localhost:3300/acces#token=${token}`);
  expect(sent.html).toContain('alt="Filémoire"');
  expect(sent.text).toContain(`#token=${token}`);
  expect(sent.html).toContain("15 minutes");
  expect(JSON.stringify(request)).not.toContain(token);
  await consumeLogin(token);
  expect(await delivery(request.receipt)).toEqual({ status: "expired" });
  await expect(consumeLogin(token)).rejects.toMatchObject({ status: 400 });
});

it("shows permanent Resend rejection instead of success and does not retry it", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response("private email and token", { status: 403 }),
    );
  vi.stubGlobal("fetch", fetch);
  const receipt = await requestLogin("blocked@example.test");
  await processOne();
  expect(await delivery(receipt!)).toEqual({ status: "failed" });
  expect(await processOne()).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledWith(
    expect.stringContaining('"providerStatus":403'),
  );
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /private|blocked@example|test-key/,
  );
});

it("retains retries for temporary rate limits without claiming success", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 429 })),
  );
  const receipt = await requestLogin("retry@example.test");
  await processOne();
  expect(await delivery(receipt!)).toEqual({ status: "pending" });
});

it("does not send expired login links or expose unrelated queue payloads", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const receipt = await requestLogin("expired@example.test");
  await pool().query(
    "UPDATE login_tokens SET expires_at=now()-interval '1 minute'",
  );
  await pool().query(
    "UPDATE jobs SET created_at=now()-interval '16 minutes' WHERE id=$1",
    [receipt],
  );
  await processOne();
  expect(fetch).not.toHaveBeenCalled();
  expect(await delivery(receipt!)).toEqual({ status: "expired" });
  expect(await delivery(randomUUID())).toEqual({ status: "expired" });
  const unrelated = await enqueue(
    pool(),
    "email",
    { to: "private@example.test", text: "private narrative" },
    "invitation-test",
  );
  expect(await delivery(unrelated!)).toEqual({ status: "expired" });
});

it("queues designed gifts, receipts, family invites, questions, reminders and support replies from their real commands", async () => {
  const b = await book();
  await invite(b.narrator, b.projectId, {
    email: "editor@example.test",
    name: "Editor <test>",
    role: "editor",
  });
  await scheduleDue();
  const row = (
    await pool().query("SELECT payload FROM projects WHERE id=$1", [
      b.projectId,
    ])
  ).rows[0];
  const project = unseal<Project>(row.payload);
  project.privacy.reminders = "douces";
  project.questions[0].availableAt = Date.now() - 4 * 86400000;
  await pool().query("UPDATE projects SET payload=$2 WHERE id=$1", [
    b.projectId,
    seal(project),
  ]);
  await scheduleDue();
  const ticket = await contact({
    name: "Rose",
    email: "support@example.test",
    topic: "question",
    message: "Comment ajouter une photo ?",
  });
  await replySupport({ ...b.buyer, admin: true, mfa: true }, ticket.id, {
    text: "Voici notre réponse <test>.",
  });
  const jobs = (
    await pool().query("SELECT payload FROM jobs WHERE kind='email'")
  ).rows.map((r) =>
    unseal<{ subject: string; html: string; text: string }>(r.payload),
  );
  for (const subject of [
    "Un livre de souvenirs vous attend",
    "Votre commande Filémoire est confirmée",
    "Votre invitation Filémoire",
    "Votre prochaine question Filémoire",
    "Un souvenir, à votre rythme",
    "Votre demande Filémoire",
  ]) {
    const email = jobs.find((j) => j.subject === subject);
    expect(email, subject).toBeDefined();
    expect(email!.html).toContain('alt="Filémoire"');
    expect(email!.html).toContain("<!doctype html>");
    expect(email!.text).toContain("http://localhost:3300/");
    expect(email!.html).not.toContain("<test>");
  }
});

it("renders a replacement invitation without reusing its revoked token", async () => {
  const buyer = await account(),
    narrator = await account();
  const pending = await pendingOrder(buyer, narrator);
  await applyStripeEvent(pending.event);
  const oldToken = await newestEmailToken(narrator.email);
  const projectId = (
    await pool().query("SELECT id FROM projects WHERE order_id=$1", [
      pending.orderId,
    ])
  ).rows[0].id;
  await resendNarratorInvite(buyer, projectId);
  const token = await newestEmailToken(narrator.email);
  expect(token).not.toBe(oldToken);
  const row = (
    await pool().query(
      "SELECT payload FROM jobs WHERE dedupe_key LIKE 'narrator-invite:%'",
    )
  ).rows[0];
  const email = unseal<{ html: string; text: string }>(row.payload);
  expect(email.html).toContain(`/rejoindre#token=${token}`);
  expect(email.html).not.toContain(oldToken);
  expect(email.text).toContain("remplace la précédente");
});
