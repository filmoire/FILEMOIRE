import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
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
import { applyStripeEvent } from "../../src/server/payments";
import {
  accessProject,
  acceptInvite,
  cancelNarratorInvite,
  createPersonalProject,
  invite,
  projectView,
  updateProject,
} from "../../src/server/projects";
import {
  buyerOrders,
  dashboardOverview,
  dashboardRecords,
  ownProposals,
} from "../../src/server/dashboard";
import {
  editorialLibrary,
  journeyLibrary,
  saveEditorialQuestion,
} from "../../src/server/question-library";
import {
  contact,
  updateSupportStatus,
  replySupport,
} from "../../src/server/support";
import { id, seal, unseal } from "../../src/server/security";

beforeAll(() => {
  configureTests();
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
});
beforeEach(resetTests);
afterAll(() => pool().end());

describe("dashboard privacy and data", () => {
  it("rejects operations access without both admin and MFA and never returns narrative payloads", async () => {
    const b = await book();
    await answer(b, "DO-NOT-EXPOSE-NARRATIVE");
    const admin = { ...(await account()), admin: true, mfa: true };
    await expect(dashboardOverview(b.buyer)).rejects.toThrow();
    await expect(
      dashboardRecords({ ...admin, mfa: false }, "projets", 1, ""),
    ).rejects.toThrow();
    const data = await dashboardRecords(admin, "projets", 1, "");
    expect(data.total).toBe(1);
    expect(data.rows[0].activated).toBe(true);
    expect(data.rows[0].support_access).toBe(false);
    expect(JSON.stringify(data)).not.toMatch(
      /DO-NOT-EXPOSE|payload|narrator_email/,
    );
    const totals = await dashboardOverview(admin);
    expect(totals.paid).toBe(1);
    expect(totals.accepted).toBe(1);
  });
  it("paginates and clamps empty filtered pages without accepting SQL from a filter", async () => {
    const admin = { ...(await account()), admin: true, mfa: true };
    for (let i = 0; i < 27; i++) await pendingOrder(admin, await account());
    const first = await dashboardRecords(admin, "commandes", 1, "pending"),
      second = await dashboardRecords(admin, "commandes", 999, "pending");
    expect(first.rows).toHaveLength(25);
    expect(first.total).toBe(27);
    expect(second.page).toBe(2);
    expect(second.rows).toHaveLength(2);
    expect(first.rows.some((r) => second.rows.some((s) => s.id === r.id))).toBe(
      false,
    );
    const empty = await dashboardRecords(
      admin,
      "commandes",
      50,
      "' OR true --",
    );
    expect(empty).toMatchObject({ total: 0, page: 1, rows: [] });
  });
  it("cancels only an owned pending narrator invitation and invalidates the original token", async () => {
    const buyer = await account(),
      narrator = await account(),
      stranger = await account();
    const order = await pendingOrder(buyer, narrator);
    await applyStripeEvent(order.event);
    const token = await newestEmailToken(narrator.email);
    const projectId = (
      await pool().query("SELECT id FROM projects WHERE order_id=$1", [
        order.orderId,
      ])
    ).rows[0].id;
    await expect(cancelNarratorInvite(stranger, projectId)).rejects.toThrow();
    await cancelNarratorInvite(buyer, projectId);
    expect(
      projectView(await accessProject(pool(), buyer, projectId)).project
        .invitation.status,
    ).toBe("revoquee");
    await expect(acceptInvite(narrator, token)).rejects.toThrow();
    const accepted = await book();
    await expect(
      cancelNarratorInvite(accepted.buyer, accepted.projectId),
    ).rejects.toThrow(/déjà accepté/);
  });
  it("shows only stable-author proposal metadata while the target is currently shared", async () => {
    const b = await book();
    let view = await answer(b, "PRIVATE OLD TEXT");
    const editor = await account(),
      other = await account();
    for (const a of [editor, other]) {
      await invite(b.narrator, b.projectId, {
        name: a.name,
        email: a.email,
        role: "editor",
      });
      await acceptInvite(a, await newestEmailToken(a.email));
    }
    let row = await accessProject(pool(), b.narrator, b.projectId);
    view = await updateProject(b.narrator, b.projectId, row.revision, {
      type: "memory",
      memoryId: view.project.memories[0].id,
      visibility: "editeur",
    });
    await updateProject(editor, b.projectId, view.revision, {
      type: "suggest",
      memoryId: view.project.memories[0].id,
      text: "SENSITIVE CORRECTION",
      note: "PRIVATE NOTE",
    });
    const proposals = await ownProposals(editor);
    expect(proposals).toHaveLength(1);
    expect(JSON.stringify(proposals)).not.toMatch(/PRIVATE|SENSITIVE/);
    expect(await ownProposals(other)).toEqual([]);
    row = await accessProject(pool(), b.narrator, b.projectId);
    await updateProject(b.narrator, b.projectId, row.revision, {
      type: "memory",
      memoryId: view.project.memories[0].id,
      visibility: "moi",
    });
    expect(await ownProposals(editor)).toEqual([]);
  });
  it("saves editorial revisions, rejects stale edits and preserves existing book questions", async () => {
    const b = await book(),
      admin = { ...(await account()), admin: true, mfa: true };
    const original = (await editorialLibrary())[0];
    const input = {
      id: original.id,
      revision: original.revision,
      text: "Quel souvenir vous ramène au jardin ?",
      help: "Prenez votre temps.",
      chapter: original.chapter,
      status: "validee",
    };
    await expect(saveEditorialQuestion(b.buyer, input)).rejects.toThrow();
    await saveEditorialQuestion(admin, input);
    await expect(saveEditorialQuestion(admin, input)).rejects.toThrow(
      /a changé/,
    );
    expect(
      (await journeyLibrary()).find((q) => q.id === original.id)?.text,
    ).toBe(input.text);
    expect(
      projectView(await accessProject(pool(), b.narrator, b.projectId)).project
        .questions[0].text,
    ).toBe(b.view.project.questions[0].text);
    const personal = await createPersonalProject(admin, {
      requestKey: id(),
      firstName: "Test",
      title: "New book",
      theme: "vie",
      consentVersion: "2026-10-13",
      accepted: true,
    });
    expect(personal.project.questions[0].text).toBe(input.text);
  });
  it("keeps a new editorial draft out of future journeys until explicitly approved", async () => {
    const admin = { ...(await account()), admin: true, mfa: true };
    const input = {
      revision: 0,
      text: "Un souvenir particulier de votre jardin ?",
      help: "",
      chapter: "origines",
      status: "a_valider",
    };
    const saved = await saveEditorialQuestion(admin, input);
    expect((await editorialLibrary()).some((q) => q.id === saved.id)).toBe(
      true,
    );
    expect((await journeyLibrary()).some((q) => q.id === saved.id)).toBe(false);
    await saveEditorialQuestion(admin, {
      ...input,
      id: saved.id,
      revision: saved.revision,
      status: "validee",
    });
    expect((await journeyLibrary()).some((q) => q.id === saved.id)).toBe(true);
  });
});

describe("designer controls persist to the backend", () => {
  it("keeps a purchased gift discoverable when its buyer is also invited as an editor", async () => {
    const b = await book();
    await invite(b.narrator, b.projectId, {
      name: b.buyer.name,
      email: b.buyer.email,
      role: "editor",
    });
    await acceptInvite(b.buyer, await newestEmailToken(b.buyer.email));
    const view = projectView(await accessProject(pool(), b.buyer, b.projectId));
    expect(view.role).toBe("editor");
    expect(view.purchasedByAccount).toBe(true);
    expect(
      projectView(await accessProject(pool(), b.narrator, b.projectId))
        .purchasedByAccount,
    ).toBe(false);
  });

  it("returns complete order details only to their buyer and a safe operational projection", async () => {
    const b = await book();
    const admin = { ...(await account()), admin: true, mfa: true };
    const orders = await buyerOrders(b.buyer);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      recipient: "Camille Test",
      packageCode: "voix",
      extraCopies: 0,
      giftBox: false,
    });
    expect(await buyerOrders(b.narrator)).toEqual([]);
    const rows = await dashboardRecords(admin, "commandes", 1, "paid");
    expect(rows.rows[0]).toMatchObject({
      invitation: "acceptee",
      packageCode: "voix",
      buyer: "Test participant",
    });
    expect(JSON.stringify(rows)).not.toMatch(
      /Gift fixture|requestKey|recipient.*email|payload/,
    );
  });
  it("updates support statuses with MFA, rejects stale writes, and counts work in progress", async () => {
    const admin = { ...(await account()), admin: true, mfa: true };
    const ticket = await contact({
      name: "Local tester",
      email: "local@example.test",
      topic: "devis",
      message: "Please quote for an extra family copy.",
    });
    const change = { expectedStatus: "open", status: "in_progress" };
    await expect(
      updateSupportStatus({ ...admin, mfa: false }, ticket.id, change),
    ).rejects.toThrow();
    await updateSupportStatus(admin, ticket.id, change);
    await expect(updateSupportStatus(admin, ticket.id, change)).rejects.toThrow(
      /a changé/,
    );
    expect((await dashboardOverview(admin)).openSupport).toBe(1);
    expect(
      (await dashboardRecords(admin, "support", 1, "in_progress")).rows[0],
    ).toMatchObject({ id: ticket.id, status: "in_progress", can_reply: true });
    await replySupport(admin, ticket.id, {
      text: "A saved response for the local test queue.",
    });
    expect((await dashboardOverview(admin)).openSupport).toBe(0);
    await updateSupportStatus(admin, ticket.id, {
      expectedStatus: "replied",
      status: "closed",
    });
    expect(
      (await dashboardRecords(admin, "support", 1, "closed")).rows[0].can_reply,
    ).toBe(false);
    await expect(
      updateSupportStatus(admin, ticket.id, {
        expectedStatus: "closed",
        status: "replied",
      }),
    ).rejects.toThrow();
  });
  it("keeps disabled questions out of new journeys without changing existing snapshots", async () => {
    const b = await book();
    const admin = { ...(await account()), admin: true, mfa: true };
    const q = (await editorialLibrary())[0];
    const input = {
      id: q.id,
      revision: q.revision,
      text: q.text,
      help: q.help,
      chapter: q.chapter,
      status: q.status,
      active: false,
    };
    const saved = await saveEditorialQuestion(admin, input);
    expect((await journeyLibrary()).some((item) => item.id === q.id)).toBe(
      false,
    );
    await saveEditorialQuestion(admin, {
      ...input,
      revision: saved.revision,
      active: undefined,
      text: "A changed but still disabled question?",
    });
    expect(
      (await editorialLibrary()).find((item) => item.id === q.id)?.active,
    ).toBe(false);
    expect(
      projectView(await accessProject(pool(), b.narrator, b.projectId)).project
        .questions[0].text,
    ).toBe(q.text);
  });
  it("lists approved books without exposing their manuscript, photos or delivery address", async () => {
    const b = await book();
    const admin = { ...(await account()), admin: true, mfa: true };
    const row = await accessProject(pool(), b.narrator, b.projectId);
    const project = unseal<import("../../src/lib/types").Project>(row.payload);
    project.book.status = "approuve";
    project.book.dedication = "PRIVATE DEDICATION";
    project.photos.push({
      id: id(),
      width: 200,
      height: 200,
      inBook: true,
      chapterId: project.chapters[0].id,
      caption: "PRIVATE CAPTION",
      date: "",
      people: "",
      order: 0,
      createdAt: Date.now(),
    });
    await pool().query(
      "UPDATE projects SET payload=$2,status='approuve' WHERE id=$1",
      [b.projectId, seal(project)],
    );
    const data = await dashboardRecords(admin, "validation", 1, "");
    expect(data.rows[0]).toMatchObject({
      id: b.projectId,
      narrator: "Camille Test",
      lowResolution: 1,
      photoCount: 1,
    });
    expect(JSON.stringify(data)).not.toMatch(
      /PRIVATE|caption|dedication|payload|address/,
    );
  });
});
