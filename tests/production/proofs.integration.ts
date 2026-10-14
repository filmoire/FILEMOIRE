import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { configureTests, resetTests, book, answer } from "./helpers";
import { pool } from "../../src/server/db";
import {
  accessProject,
  updateProject,
  bookHash,
} from "../../src/server/projects";
import { prepareProof, proofBytes } from "../../src/server/proofs";
import { seal, unseal } from "../../src/server/security";
import type { Project } from "../../src/lib/types";

beforeAll(() => configureTests());
beforeEach(() => resetTests());
afterAll(() => pool().end());

describe("immutable approved PDF artifacts", () => {
  it("keeps approved PDF bytes and provenance after a composition change and preference revision", async () => {
    const b = await book();
    const view = await answer(b);
    const proof = await prepareProof(b.narrator, b.projectId);
    const originalBytes = await proofBytes(b.narrator, b.projectId);
    const approved = await updateProject(
      b.narrator,
      b.projectId,
      view.revision,
      {
        type: "approve",
        contentHash: proof.contentHash,
        address: {
          name: "Camille Test",
          line1: "1 rue du Test",
          postalCode: "75001",
          city: "Paris",
          country: "FR",
        },
      },
    );
    // Model a formerly valid composition fingerprint after a renderer/rules upgrade.
    const original = (
      await pool().query(
        "UPDATE book_versions SET content_hash=$2 WHERE project_id=$1 AND approved_at IS NOT NULL RETURNING *",
        [b.projectId, "historical-composition-hash"],
      )
    ).rows[0];
    expect(await prepareProof(b.narrator, b.projectId)).toEqual({
      versionId: original.id,
      contentHash: original.content_hash,
      revision: original.revision,
      mediaId: original.pdf_media_id,
    });
    expect(await proofBytes(b.narrator, b.projectId)).toEqual(originalBytes);
    expect(await proofBytes(b.narrator, b.projectId, original.id)).toEqual(
      originalBytes,
    );
    await updateProject(b.narrator, b.projectId, approved.revision, {
      type: "preferences",
      defaultVisibility: "moi",
      buyerSeesProgress: false,
      reminders: "aucune",
      marketing: false,
      cadenceDays: 7,
    });
    expect(await proofBytes(b.narrator, b.projectId)).toEqual(originalBytes);
    expect(
      (
        await pool().query("SELECT * FROM book_versions WHERE id=$1", [
          original.id,
        ])
      ).rows[0],
    ).toEqual(original);
  });
  it("fails safely when an approved PDF association is missing", async () => {
    const b = await book();
    const view = await answer(b);
    const proof = await prepareProof(b.narrator, b.projectId);
    await updateProject(b.narrator, b.projectId, view.revision, {
      type: "approve",
      contentHash: proof.contentHash,
      address: {
        name: "Camille Test",
        line1: "1 rue du Test",
        postalCode: "75001",
        city: "Paris",
        country: "FR",
      },
    });
    await pool().query(
      "UPDATE book_versions SET pdf_media_id=NULL WHERE project_id=$1 AND approved_at IS NOT NULL",
      [b.projectId],
    );
    const before = (
      await pool().query("SELECT id FROM media WHERE project_id=$1", [
        b.projectId,
      ])
    ).rows;
    await expect(prepareProof(b.narrator, b.projectId)).rejects.toMatchObject({
      status: 503,
    });
    expect(
      (
        await pool().query("SELECT id FROM media WHERE project_id=$1", [
          b.projectId,
        ])
      ).rows,
    ).toEqual(before);
  });
  it("updates an unapproved proof's hash and snapshot when composition changes", async () => {
    const b = await book();
    await answer(b);
    const old = await prepareProof(b.narrator, b.projectId);
    const row = await accessProject(pool(), b.narrator, b.projectId);
    const p = unseal<Project>(row.payload);
    p.book.cover.title = "Nouveau rendu";
    // Same revision, as when updated composition rules affect persisted content.
    await pool().query("UPDATE projects SET payload=$2 WHERE id=$1", [
      b.projectId,
      seal(p),
    ]);
    const current = await prepareProof(b.narrator, b.projectId);
    expect(current.versionId).toBe(old.versionId);
    expect(current.contentHash).toBe(bookHash(p));
    expect(current.mediaId).not.toBe(old.mediaId);
    const saved = (
      await pool().query("SELECT * FROM book_versions WHERE id=$1", [
        current.versionId,
      ])
    ).rows[0];
    expect(saved.content_hash).toBe(current.contentHash);
    expect(unseal<Project>(saved.payload).book.cover.title).toBe(
      "Nouveau rendu",
    );
    expect(saved.approved_at).toBeNull();
    expect(await prepareProof(b.narrator, b.projectId)).toEqual(current);
  });
});
