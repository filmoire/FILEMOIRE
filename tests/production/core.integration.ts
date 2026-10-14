import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import Stripe from "stripe";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { readFile, writeFile } from "node:fs/promises";
import { Secret, TOTP } from "otpauth";
import {
  configureTests,
  resetTests,
  account,
  book,
  answer,
  pendingOrder,
  newestEmailToken,
} from "./helpers";
import { pool } from "../../src/server/db";
import {
  requestLogin,
  consumeLogin,
  currentAccount,
  mfaSetup,
  verifyMfa,
} from "../../src/server/auth";
import { hash, id, seal, unseal, sameOrigin } from "../../src/server/security";
import {
  applyStripeEvent,
  stripeWebhook,
  checkoutTotal,
  createCheckout,
  refundOrder,
} from "../../src/server/payments";
import {
  accessProject,
  projectView,
  updateProject,
  invite,
  acceptInvite,
  revokeMember,
  resendNarratorInvite,
  listProjects,
  preview,
  bookHash,
  createPersonalProject,
} from "../../src/server/projects";
import {
  beginUpload,
  uploadPart,
  finishUpload,
  uploadStatus,
  readMedia,
} from "../../src/server/media";
import { configureAudioLink, listen } from "../../src/server/audio";
import { claimJob, enqueue, finishJob, type Job } from "../../src/server/jobs";
import { scheduleDue, runJob } from "../../src/server/worker";
import { requestPrint, updatePrint } from "../../src/server/printing";
import { prepareProof } from "../../src/server/proofs";
import { exportArchive } from "../../src/server/export";
import tar from "tar-stream";
import { renderProof } from "../../src/server/pdf";
import type { Project } from "../../src/lib/types";

const stripeCalls = vi.hoisted(() => ({
  checkouts: [] as { params: unknown; options: { idempotencyKey: string } }[],
  refunds: [] as { idempotencyKey: string }[],
}));
vi.mock("stripe", async (original) => {
  const actual = await original<typeof import("stripe")>();
  return {
    ...actual,
    default: class extends actual.default {
      constructor(...args: ConstructorParameters<typeof actual.default>) {
        super(...args);
        this.checkout.sessions.create = vi.fn(async (params, options) => {
          stripeCalls.checkouts.push({
            params,
            options: options as { idempotencyKey: string },
          });
          return {
            id:
              "cs_fixture_" +
              (options as { idempotencyKey: string }).idempotencyKey,
            url: "https://checkout.stripe.com/test-fixture",
          };
        }) as unknown as typeof this.checkout.sessions.create;
        this.refunds.create = vi.fn(async (_params, options) => {
          stripeCalls.refunds.push(options as { idempotencyKey: string });
          return { id: "re_fixture", status: "succeeded" };
        }) as unknown as typeof this.refunds.create;
      }
    },
  };
});
beforeAll(() => configureTests());
beforeEach(async () => {
  await resetTests();
  process.env.PRINT_ENABLED = "false";
  process.env.PRINT_SPEC_APPROVED = "false";
});
afterAll(async () => {
  await pool().end();
});
const status = (s: number) => expect.objectContaining({ status: s });
const toJob = (r: { id: string; kind: string; payload: string }): Job => ({
  id: r.id,
  kind: r.kind,
  payload: unseal(r.payload),
  attempts: 1,
  lock: id(),
});
async function change(b: Awaited<ReturnType<typeof book>>, cmd: unknown) {
  const r = await accessProject(pool(), b.narrator, b.projectId);
  return updateProject(b.narrator, b.projectId, r.revision, cmd);
}
async function imageUpload(b: Awaited<ReturnType<typeof book>>, mid: string) {
  const bytes = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#64314b" },
  })
    .jpeg()
    .toBuffer();
  const u = await beginUpload(b.narrator, b.projectId, {
    memoryId: mid,
    kind: "photo",
    bytes: bytes.length,
    mime: "image/jpeg",
    caption: "Photo privée",
  });
  await uploadPart(b.narrator, u.id, 0, bytes);
  await finishUpload(b.narrator, u.id);
  return { u, bytes };
}
function wav() {
  const samples = 8000;
  const b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF");
  b.writeUInt32LE(36 + samples * 2, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 2, 40);
  return b;
}

describe("accounts and access control", () => {
  it("consumes login links once and rejects expired links", async () => {
    const email = "login@example.test";
    await requestLogin(email);
    const token = await newestEmailToken(email);
    const login = await consumeLogin(token);
    expect((await currentAccount(login.session))?.email).toBe(email);
    await expect(consumeLogin(token)).rejects.toMatchObject(status(400));
    await pool().query(
      "UPDATE sessions SET expires_at=now()-interval '1 second'",
    );
    expect(await currentAccount(login.session)).toBeNull();
  });
  it("throttles authentication requests without logging the address", async () => {
    for (let i = 0; i < 5; i++) await requestLogin("limited@example.test");
    await expect(requestLogin("limited@example.test")).rejects.toMatchObject(
      status(429),
    );
    expect(
      (await pool().query("SELECT key FROM rate_limits")).rows[0].key,
    ).not.toContain("@");
  });
  it("requires a fresh admin MFA code and rejects replay", async () => {
    const a = await account("operator@example.test");
    a.admin = true;
    await requestLogin(a.email);
    const login = await consumeLogin(await newestEmailToken(a.email));
    const setup = await mfaSetup(a);
    const secret = new URL(setup.uri).searchParams.get("secret")!;
    const code = new TOTP({ secret: Secret.fromBase32(secret) }).generate();
    await verifyMfa(a, code, login.session);
    expect((await currentAccount(login.session))?.mfa).toBe(true);
    await expect(verifyMfa(a, code, login.session)).rejects.toMatchObject(
      status(400),
    );
  });
  it("enforces exact same-origin mutations", () => {
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3300/api/v1", {
          headers: { origin: "https://attacker.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3300/api/v1", {
          headers: { origin: process.env.APP_ORIGIN! },
        }),
      ),
    ).not.toThrow();
  });
  it("isolates tenants and excludes private memories, photos, draft and history", async () => {
    const b = await book();
    const v = await answer(b, "Secret unique privé");
    const mid = v.project.memories[0].id;
    await imageUpload(b, mid);
    const outsider = await account();
    await expect(
      accessProject(pool(), outsider, b.projectId),
    ).rejects.toMatchObject(status(404));
    const buyer = projectView(
      await accessProject(pool(), b.buyer, b.projectId),
    );
    expect(JSON.stringify(buyer)).not.toContain("Secret unique");
    expect(buyer.project.photos).toHaveLength(0);
    await change(b, { type: "memory", memoryId: mid, visibility: "famille" });
    const shared = projectView(
      await accessProject(pool(), b.buyer, b.projectId),
    );
    expect(shared.project.memories[0].revisions).toEqual([]);
    expect(shared.project.memories[0].draft).toBeUndefined();
    expect(shared.project.photos).toHaveLength(1);
    await expect(
      updateProject(b.buyer, b.projectId, shared.revision, {
        type: "memory",
        memoryId: mid,
        text: "overwrite",
      }),
    ).rejects.toMatchObject(status(403));
  });
  it("supports arbitrary editors, recipient-bound tokens, revocation and stale suggestions", async () => {
    const b = await book();
    const v = await answer(b);
    const mid = v.project.memories[0].id;
    await change(b, { type: "memory", memoryId: mid, visibility: "editeur" });
    const editor = await account("custom.editor@example.test");
    await invite(b.narrator, b.projectId, {
      name: "Alice",
      email: editor.email,
      role: "editor",
      canSuggest: true,
    });
    const token = await newestEmailToken(editor.email);
    await expect(acceptInvite(b.buyer, token)).rejects.toMatchObject(
      status(400),
    );
    await acceptInvite(editor, token);
    let row = await accessProject(pool(), editor, b.projectId);
    expect(projectView(row).project.memories).toHaveLength(1);
    const suggested = await updateProject(editor, b.projectId, row.revision, {
      type: "suggest",
      memoryId: mid,
      text: "Proposition",
      note: "",
    });
    await change(b, {
      type: "memory",
      memoryId: mid,
      text: "Version modifiée",
    });
    const nv = projectView(
      await accessProject(pool(), b.narrator, b.projectId),
    );
    await expect(
      change(b, {
        type: "decide",
        suggestionId: nv.project.suggestions[0].id,
        accept: true,
      }),
    ).rejects.toMatchObject(status(409));
    expect(suggested.project.suggestions).toHaveLength(0);
    await revokeMember(b.narrator, b.projectId, editor.id);
    await expect(
      accessProject(pool(), editor, b.projectId),
    ).rejects.toMatchObject(status(404));
  });
  it("uses optimistic concurrency to prevent lost changes", async () => {
    const b = await book();
    const results = await Promise.allSettled([
      updateProject(b.narrator, b.projectId, b.view.revision, {
        type: "cover",
        title: "One",
        subtitle: "",
        dedication: "",
        template: "prune",
      }),
      updateProject(b.narrator, b.projectId, b.view.revision, {
        type: "cover",
        title: "Two",
        subtitle: "",
        dedication: "",
        template: "prune",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
});
describe("payments and jobs", () => {
  it("fulfills signed payment events once, including concurrent duplicates", async () => {
    const buyer = await account(),
      narrator = await account();
    const o = await pendingOrder(buyer, narrator);
    const body = JSON.stringify(o.event);
    const stripe = new Stripe("sk_test_fixture");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    await stripeWebhook(body, signature);
    await Promise.all([
      applyStripeEvent(o.event),
      applyStripeEvent({ ...o.event, id: "evt_retry" }),
    ]);
    expect((await pool().query("SELECT * FROM projects")).rowCount).toBe(1);
    expect(
      (await pool().query("SELECT * FROM jobs WHERE dedupe_key LIKE 'gift:%'"))
        .rowCount,
    ).toBe(1);
    await expect(stripeWebhook(body, "invalid")).rejects.toMatchObject(
      status(400),
    );
  });
  it("rejects a paid amount mismatch atomically", async () => {
    const o = await pendingOrder(await account(), await account());
    (o.event.data.object as Stripe.Checkout.Session).amount_total = 1;
    await expect(applyStripeEvent(o.event)).rejects.toMatchObject(status(400));
    expect((await pool().query("SELECT * FROM projects")).rowCount).toBe(0);
    expect((await pool().query("SELECT * FROM webhook_events")).rowCount).toBe(
      0,
    );
    expect(checkoutTotal(o.input)).toBeGreaterThan(1);
  });
  it("claims jobs once across workers, retries with a lease and ignores stale completion", async () => {
    await enqueue(pool(), "email", { to: "local@example.test" }, "one");
    const jobs = await Promise.all([claimJob(), claimJob()]);
    expect(jobs.filter(Boolean)).toHaveLength(1);
    const job = jobs.find(Boolean)!;
    await finishJob({ ...job, lock: id() });
    expect((await pool().query("SELECT state FROM jobs")).rows[0].state).toBe(
      "running",
    );
    await finishJob(job, true);
    const r = (await pool().query("SELECT state,run_at FROM jobs")).rows[0];
    expect(r.state).toBe("pending");
    expect(new Date(r.run_at).getTime()).toBeGreaterThan(Date.now());
  });
  it("schedules initial questions once and suppresses queued reminders after opt-out", async () => {
    const b = await book();
    await scheduleDue();
    await scheduleDue();
    const jobs = await pool().query(
      "SELECT * FROM jobs WHERE dedupe_key LIKE 'question:%'",
    );
    expect(jobs.rowCount).toBe(1);
    const job = toJob(jobs.rows[0]);
    await change(b, {
      type: "preferences",
      cadenceDays: 0,
      reminders: "aucune",
      buyerSeesProgress: false,
      defaultVisibility: "moi",
      marketing: false,
    });
    delete process.env.SMTP_URL;
    await expect(
      runJob({ ...job, payload: { ...job.payload, reminder: true } }),
    ).resolves.toBeUndefined();
  });
});
describe("media, books and lifecycle", () => {
  it("resumes uploads, rejects altered parts and conceals a hidden memory’s photo", async () => {
    const b = await book();
    const v = await answer(b);
    const mid = v.project.memories[0].id;
    const { u, bytes } = await imageUpload(b, mid);
    expect((await uploadStatus(b.narrator, u.id)).status).toBe("complete");
    await finishUpload(b.narrator, u.id);
    expect((await readMedia(b.narrator, u.id)).bytes.length).toBeGreaterThan(0);
    const stored = await readFile(
      `${process.env.LOCAL_STORAGE_DIR}/media/${b.projectId}/${u.id}`,
    );
    expect(stored.subarray(0, 2).equals(bytes.subarray(0, 2))).toBe(false);
    await change(b, { type: "memory", memoryId: mid, visibility: "famille" });
    await readMedia(b.buyer, u.id);
    await change(b, { type: "memory", memoryId: mid, inBook: false });
    expect((await preview(b.narrator, b.projectId)).book).toHaveLength(0);
    await expect(readMedia(b.buyer, u.id)).rejects.toMatchObject(status(404));
    const pending = await beginUpload(b.narrator, b.projectId, {
      memoryId: mid,
      kind: "photo",
      bytes: 4,
      mime: "image/jpeg",
    });
    await uploadPart(b.narrator, pending.id, 0, Buffer.from("abcd"));
    await expect(
      uploadPart(b.narrator, pending.id, 0, Buffer.from("efgh")),
    ).rejects.toMatchObject(status(409));
    await expect(finishUpload(b.narrator, pending.id)).rejects.toThrow();
  });
  it("validates real audio bytes, protects QR playback and lets the narrator revoke it", async () => {
    const b = await book();
    const v = await answer(b);
    const bytes = wav();
    const u = await beginUpload(b.narrator, b.projectId, {
      memoryId: v.project.memories[0].id,
      kind: "audio",
      bytes: bytes.length,
      mime: "audio/wav",
    });
    await uploadPart(b.narrator, u.id, 0, bytes);
    await finishUpload(b.narrator, u.id);
    await change(b, {
      type: "transcript",
      audioId: u.id,
      text: "Souvenir relu",
      approved: true,
    });
    const link = await configureAudioLink(b.narrator, b.projectId, {
      audioId: u.id,
      enabled: true,
      code: "family-code-123",
      expiresAt: null,
    });
    const token = link.url.split("#token=")[1];
    await expect(listen(token, "wrong-code")).rejects.toMatchObject(
      status(403),
    );
    expect((await listen(token, "family-code-123")).mime).toBe("audio/wav");
    await configureAudioLink(b.narrator, b.projectId, {
      audioId: u.id,
      enabled: false,
      code: "family-code-123",
      expiresAt: null,
    });
    await expect(listen(token, "family-code-123")).rejects.toMatchObject(
      status(403),
    );
  });
  it("generates a paginated PDF, approves a fixed version and prevents editing after print request", async () => {
    const b = await book();
    const v = await answer(b, "Un récit suffisamment long. ".repeat(350));
    await imageUpload(b, v.project.memories[0].id);
    const row = await accessProject(pool(), b.narrator, b.projectId);
    const p = unseal<Project>(row.payload);
    const pdf = await renderProof(p);
    await writeFile("artifacts/production/review-proof.pdf", pdf);
    expect((await PDFDocument.load(pdf)).getPageCount() % 4).toBe(0);
    await prepareProof(b.narrator, b.projectId);
    const before = bookHash(p);
    p.privacy.marketing = !p.privacy.marketing;
    expect(bookHash(p)).toBe(before);
    await change(b, {
      type: "approve",
      contentHash: before,
      address: {
        name: "Camille Test",
        line1: "1 rue du Test",
        postalCode: "75001",
        city: "Paris",
        country: "FR",
      },
    });
    await expect(
      change(b, {
        type: "memory",
        memoryId: v.project.memories[0].id,
        text: "after approval",
      }),
    ).rejects.toMatchObject(status(409));
    process.env.PRINT_ENABLED = "true";
    process.env.PRINT_SPEC_APPROVED = "true";
    process.env.PRINT_SPEC_VERSION = "test-only";
    const approved = await accessProject(pool(), b.narrator, b.projectId);
    const request = { revision: approved.revision, requestKey: id() };
    const print = await requestPrint(b.narrator, b.projectId, request);
    expect((await requestPrint(b.narrator, b.projectId, request)).id).toBe(
      print.id,
    );
    expect((await pool().query("SELECT * FROM print_orders")).rowCount).toBe(1);
    await expect(change(b, { type: "reopen" })).rejects.toMatchObject(
      status(409),
    );
    await expect(
      updatePrint({ ...b.narrator, admin: true, mfa: true }, print.id, {
        status: "livre",
      }),
    ).rejects.toMatchObject(status(409));
  });
  it("cancels deletion safely, then deletes project media and content versions after the grace period", async () => {
    const b = await book();
    const v = await answer(b);
    const { u } = await imageUpload(b, v.project.memories[0].id);
    await change(b, { type: "delete-project", confirm: "DELETE" });
    let row = (
      await pool().query(
        "SELECT * FROM jobs WHERE kind='delete-project' ORDER BY created_at DESC",
      )
    ).rows[0];
    await change(b, { type: "cancel-deletion" });
    await runJob(toJob(row));
    expect((await pool().query("SELECT * FROM projects")).rowCount).toBe(1);
    await change(b, { type: "delete-project", confirm: "DELETE" });
    row = (
      await pool().query(
        "SELECT * FROM jobs WHERE kind='delete-project' ORDER BY created_at DESC",
      )
    ).rows[0];
    await pool().query(
      "UPDATE projects SET deletion_at=now()-interval '1 second'",
    );
    await runJob(toJob(row));
    expect((await pool().query("SELECT * FROM projects")).rowCount).toBe(0);
    expect((await pool().query("SELECT * FROM book_versions")).rowCount).toBe(
      0,
    );
    await expect(
      readFile(`${process.env.LOCAL_STORAGE_DIR}/media/${b.projectId}/${u.id}`),
    ).rejects.toThrow();
    expect((await pool().query("SELECT * FROM orders")).rowCount).toBe(1);
  });
});

it("keeps checkout retry parameters stable and prevents refund/print races", async () => {
  process.env.CHECKOUT_ENABLED = "true";
  process.env.LEGAL_APPROVED = "true";
  process.env.COMMERCIAL_APPROVED = "true";
  const buyer = await account(),
    recipient = await account();
  const order = await pendingOrder(buyer, recipient);
  stripeCalls.checkouts.length = 0;
  const first = await createCheckout(buyer, order.input);
  const second = await createCheckout(buyer, order.input);
  expect(first).toEqual(second);
  expect(stripeCalls.checkouts[0]).toEqual(stripeCalls.checkouts[1]);
  await pool().query(
    "UPDATE orders SET created_at=now()-interval '25 hours' WHERE id=$1",
    [order.orderId],
  );
  await expect(createCheckout(buyer, order.input)).rejects.toMatchObject({
    status: 409,
  });
  const b = await book();
  await answer(b);
  const proof = await prepareProof(b.narrator, b.projectId);
  await change(b, {
    type: "approve",
    contentHash: proof.contentHash,
    address: {
      name: "Test Person",
      line1: "1 rue du Test",
      city: "Paris",
      postalCode: "75001",
      country: "FR",
    },
  });
  stripeCalls.refunds.length = 0;
  const admin = { ...b.buyer, admin: true, mfa: true };
  await refundOrder(admin, b.orderId, id());
  await refundOrder(admin, b.orderId, id());
  expect(stripeCalls.refunds[0]).toEqual(stripeCalls.refunds[1]);
  process.env.PRINT_ENABLED = "true";
  process.env.PRINT_SPEC_APPROVED = "true";
  process.env.PRINT_SPEC_VERSION = "fixture";
  const row = await accessProject(pool(), b.narrator, b.projectId);
  await expect(
    requestPrint(b.narrator, b.projectId, {
      revision: row.revision,
      requestKey: id(),
    }),
  ).rejects.toMatchObject({ status: 409 });
  process.env.CHECKOUT_ENABLED = "false";
});

it("renews a gift invitation and invalidates the earlier link", async () => {
  const buyer = await account(),
    narrator = await account();
  const o = await pendingOrder(buyer, narrator);
  await applyStripeEvent(o.event);
  const projectId = (
    await pool().query("SELECT id FROM projects WHERE order_id=$1", [o.orderId])
  ).rows[0].id;
  const old = await newestEmailToken(narrator.email);
  await resendNarratorInvite(buyer, projectId);
  const fresh = await newestEmailToken(narrator.email);
  expect(fresh).not.toBe(old);
  await expect(acceptInvite(narrator, old)).rejects.toMatchObject({
    status: 400,
  });
  expect(await acceptInvite(narrator, fresh)).toBe(projectId);
});
it("audits temporary support reads and removes them after expiry", async () => {
  const b = await book();
  await answer(b, "Private support fixture");
  const admin = { ...(await account()), admin: true, mfa: true };
  expect(await listProjects(admin)).toHaveLength(0);
  await pool().query(
    "INSERT INTO support_grants(project_id,account_id,expires_at,reason) VALUES($1,$2,now()+interval '1 hour','test requested help')",
    [b.projectId, admin.id],
  );
  expect((await listProjects(admin))[0].project.memories[0].text).toBe(
    "Private support fixture",
  );
  expect(
    (
      await pool().query(
        "SELECT * FROM audit_events WHERE actor_id=$1 AND action='support.read'",
        [admin.id],
      )
    ).rowCount,
  ).toBe(1);
  await pool().query(
    "UPDATE support_grants SET expires_at=now()-interval '1 second'",
  );
  expect(await listProjects(admin)).toHaveLength(0);
});
it("exports a readable archive containing private story metadata and its media", async () => {
  const b = await book();
  const v = await answer(b);
  const { u } = await imageUpload(b, v.project.memories[0].id);
  const response = await exportArchive(b.narrator, b.projectId);
  const bytes = Buffer.from(await response.arrayBuffer());
  const entries: string[] = [];
  const extract = tar.extract();
  await new Promise<void>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      entries.push(header.name);
      stream.on("end", next);
      stream.resume();
    });
    extract.on("finish", resolve);
    extract.on("error", reject);
    extract.end(bytes);
  });
  expect(entries).toContain("project.json");
  expect(entries).toContain(`media/${u.id}.jpg`);
  await expect(exportArchive(b.buyer, b.projectId)).rejects.toMatchObject({
    status: 403,
  });
});
it("transcribes through the adapter while retaining the original recording for review", async () => {
  process.env.TRANSCRIPTION_URL = "https://transcription.example.test";
  process.env.TRANSCRIPTION_API_KEY = "fixture";
  process.env.TRANSCRIPTION_MODEL = "fixture";
  const b = await book();
  const v = await answer(b);
  const bytes = wav();
  const u = await beginUpload(b.narrator, b.projectId, {
    memoryId: v.project.memories[0].id,
    kind: "audio",
    bytes: bytes.length,
    mime: "audio/wav",
  });
  await uploadPart(b.narrator, u.id, 0, bytes);
  await finishUpload(b.narrator, u.id);
  const job = (await pool().query("SELECT * FROM jobs WHERE kind='transcribe'"))
    .rows[0];
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json({ text: "Transcription fixture to review" }),
    );
  try {
    await runJob(toJob(job));
    const result = projectView(
      await accessProject(pool(), b.narrator, b.projectId),
    );
    expect(result.project.audios[0].transcript.status).toBe("a_relire");
    expect(result.project.audios[0].transcript.text).toBe(
      "Transcription fixture to review",
    );
    expect((await readMedia(b.narrator, u.id)).bytes).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledOnce();
  } finally {
    fetchMock.mockRestore();
    delete process.env.TRANSCRIPTION_URL;
    delete process.env.TRANSCRIPTION_API_KEY;
    delete process.env.TRANSCRIPTION_MODEL;
  }
});

const manuscriptInput = () => ({
  requestKey: id(),
  firstName: "Camille",
  lastName: "Martin",
  title: "Mes souvenirs privés",
  theme: "vie",
  accepted: true,
  consentVersion: "2026-10-13",
});

it("creates one private personal manuscript without a purchase, even after concurrent retries", async () => {
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
  const owner = await account(),
    stranger = await account();
  const input = manuscriptInput();
  const [first, retry] = await Promise.all([
    createPersonalProject(owner, input),
    createPersonalProject(owner, input),
  ]);
  expect(first.id).toBe(retry.id);
  expect(first.project.kind).toBe("personal");
  expect(first.project.orderId).toBeNull();
  expect(first.role).toBe("narrator");
  expect(first.project.privacy.defaultVisibility).toBe("moi");
  expect(first.project.questions).toHaveLength(52);
  expect(first.project.questions.every((q) => q.status === "disponible")).toBe(
    true,
  );
  expect(
    (await pool().query("SELECT count(*) FROM orders")).rows[0].count,
  ).toBe("0");
  expect(
    (
      await pool().query(
        "SELECT accepted FROM consent_records WHERE project_id=$1",
        [first.id],
      )
    ).rows[0].accepted,
  ).toBe(true);
  expect(await listProjects(stranger)).toEqual([]);
  await expect(accessProject(pool(), stranger, first.id)).rejects.toMatchObject(
    status(404),
  );
  await expect(
    createPersonalProject(owner, { ...input, title: "Autre livre" }),
  ).rejects.toMatchObject(status(409));
  delete process.env.PERSONAL_DRAFTS_ENABLED;
});

it("enforces the manuscript feature gate, consent and five-book account limit", async () => {
  const owner = await account();
  process.env.PERSONAL_DRAFTS_ENABLED = "false";
  await expect(
    createPersonalProject(owner, manuscriptInput()),
  ).rejects.toMatchObject(status(403));
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
  await expect(
    createPersonalProject(owner, { ...manuscriptInput(), accepted: false }),
  ).rejects.toThrow();
  const attempts = await Promise.allSettled(
    Array.from({ length: 7 }, () =>
      createPersonalProject(owner, manuscriptInput()),
    ),
  );
  expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  expect(attempts.filter((r) => r.status === "rejected")).toHaveLength(2);
  delete process.env.PERSONAL_DRAFTS_ENABLED;
});

it("saves personal stories, records audio without an AI provider and approves a digital PDF without a shipping address", async () => {
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
  delete process.env.TRANSCRIPTION_URL;
  const owner = await account();
  let view = await createPersonalProject(owner, manuscriptInput());
  view = await updateProject(owner, view.id, view.revision, {
    type: "answer",
    questionId: view.project.questions[0].id,
    text: "Au jardin, je retrouvais toute ma famille.",
    visibility: "moi",
  });
  const bytes = wav();
  const upload = await beginUpload(owner, view.id, {
    memoryId: view.project.memories[0].id,
    kind: "audio",
    bytes: bytes.length,
    mime: "audio/wav",
  });
  await uploadPart(owner, upload.id, 0, bytes);
  await finishUpload(owner, upload.id);
  view = projectView(await accessProject(pool(), owner, view.id));
  expect(view.project.audios[0].transcript).toMatchObject({
    status: "a_relire",
    text: "",
    manual: true,
    simulated: false,
  });
  expect(
    (await pool().query("SELECT count(*) FROM jobs WHERE kind='transcribe'"))
      .rows[0].count,
  ).toBe("0");
  expect((await readMedia(owner, upload.id)).bytes).toEqual(bytes);
  const proof = await prepareProof(owner, view.id);
  view = await updateProject(owner, view.id, view.revision, {
    type: "approve",
    contentHash: proof.contentHash,
  });
  expect(view.project.book.status).toBe("approuve");
  expect(view.project.print.address).toBeUndefined();
  process.env.PRINT_ENABLED = "true";
  process.env.PRINT_SPEC_APPROVED = "true";
  process.env.PRINT_SPEC_VERSION = "test-spec";
  try {
    await expect(
      requestPrint(owner, view.id, {
        revision: view.revision,
        requestKey: id(),
      }),
    ).rejects.toMatchObject(status(403));
    expect(
      (await pool().query("SELECT count(*) FROM print_orders")).rows[0].count,
    ).toBe("0");
  } finally {
    process.env.PRINT_ENABLED = "false";
    process.env.PRINT_SPEC_APPROVED = "false";
    delete process.env.PRINT_SPEC_VERSION;
    delete process.env.PERSONAL_DRAFTS_ENABLED;
  }
});
