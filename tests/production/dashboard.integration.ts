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
  dashboardOverview,
  dashboardRecords,
  ownProposals,
} from "../../src/server/dashboard";
import {
  editorialLibrary,
  journeyLibrary,
  saveEditorialQuestion,
} from "../../src/server/question-library";
import { id } from "../../src/server/security";

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
