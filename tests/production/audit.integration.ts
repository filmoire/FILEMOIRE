import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  configureTests,
  resetTests,
  account,
  book,
  answer,
  newestEmailToken,
} from "./helpers";
import { pool } from "../../src/server/db";
import {
  accessProject,
  projectView,
  updateProject,
  invite,
  acceptInvite,
} from "../../src/server/projects";
import { requestLogin, consumeLogin } from "../../src/server/auth";
import { id, seal, unseal } from "../../src/server/security";
import type { Project } from "../../src/lib/types";
import type { Account } from "../../src/server/auth";
import { handleApi } from "../../src/server/api";
import { runJob } from "../../src/server/worker";
import { enqueue } from "../../src/server/jobs";
import * as storage from "../../src/server/storage";

const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));
beforeAll(() => configureTests());
beforeEach(async () => {
  cookieJar.clear();
  await resetTests();
});
afterAll(async () => {
  await pool().end();
});

async function as(a: Account) {
  await requestLogin(a.email);
  cookieJar.set(
    "filemoire_session",
    (await consumeLogin(await newestEmailToken(a.email))).session,
  );
}
function request(
  path: string,
  method = "GET",
  value?: unknown,
  headers: Record<string, string> = {},
) {
  return handleApi(
    new Request(`http://localhost:3300/api/v1/${path}`, {
      method,
      headers: {
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
        ...headers,
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    }),
    path.split("/"),
  );
}

describe("audit privacy regressions", () => {
  it("deletes only the target project jobs, even when another recipient email contains the narrator address", async () => {
    const b = await book();
    const row = await accessProject(pool(), b.narrator, b.projectId);
    const p = unseal<Project>(row.payload);
    p.narrator.email = "ann@example.test";
    await pool().query("UPDATE projects SET payload=$2 WHERE id=$1", [
      b.projectId,
      seal(p),
    ]);
    const other = await book();
    const key = `foreign-gift:${id()}`;
    await enqueue(
      pool(),
      "email",
      {
        projectId: other.projectId,
        to: "joann@example.test",
        text: "Connectez-vous avec joann@example.test",
      },
      key,
      new Date(Date.now() + 86400000),
    );
    const deleted = await updateProject(b.narrator, b.projectId, row.revision, {
      type: "delete-project",
      confirm: "DELETE",
    });
    await pool().query(
      "UPDATE projects SET deletion_at=now()-interval '1 second' WHERE id=$1",
      [b.projectId],
    );
    await runJob({
      id: id(),
      kind: "delete-project",
      payload: {
        projectId: b.projectId,
        requestedAt: deleted.project.deletionRequestedAt,
      },
      attempts: 1,
      lock: id(),
    });
    expect(
      (await pool().query("SELECT id FROM jobs WHERE dedupe_key=$1", [key]))
        .rowCount,
    ).toBe(1);
    expect(
      (
        await pool().query("SELECT id FROM projects WHERE id=$1", [
          other.projectId,
        ])
      ).rowCount,
    ).toBe(1);
  });
  it("rejects cancellation after partial destructive cleanup and permits idempotent cleanup retry", async () => {
    const b = await book();
    for (let i = 0; i < 2; i++) {
      const mid = id(),
        key = `media/${b.projectId}/${mid}`;
      await storage.putObject(key, Buffer.from("synthetic media"));
      await pool().query(
        "INSERT INTO media(id,project_id,owner_id,object_key,kind,mime,bytes) VALUES($1,$2,$3,$4,'audio','audio/wav',15)",
        [mid, b.projectId, b.narrator.id, key],
      );
    }
    const deleted = await updateProject(
      b.narrator,
      b.projectId,
      b.view.revision,
      { type: "delete-project", confirm: "DELETE" },
    );
    await pool().query(
      "UPDATE projects SET deletion_at=now()-interval '1 second' WHERE id=$1",
      [b.projectId],
    );
    const job = {
      id: id(),
      kind: "delete-project",
      payload: {
        projectId: b.projectId,
        requestedAt: deleted.project.deletionRequestedAt,
      },
      attempts: 1,
      lock: id(),
    };
    const realDelete = storage.deleteObject;
    const mock = vi
      .spyOn(storage, "deleteObject")
      .mockImplementationOnce(realDelete)
      .mockRejectedValueOnce(new Error("synthetic storage interruption"));
    try {
      await expect(runJob(job)).rejects.toThrow(
        "synthetic storage interruption",
      );
    } finally {
      mock.mockRestore();
    }
    await expect(
      updateProject(b.narrator, b.projectId, deleted.revision, {
        type: "cancel-deletion",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await runJob(job);
    expect(
      (await pool().query("SELECT id FROM projects WHERE id=$1", [b.projectId]))
        .rowCount,
    ).toBe(0);
    expect(
      (
        await pool().query("SELECT id FROM media WHERE project_id=$1", [
          b.projectId,
        ])
      ).rowCount,
    ).toBe(0);
  });
  it("keeps editor-only memories out of contributor views and suggestions", async () => {
    const b = await book();
    const answered = await answer(b, "ONLY THE FAMILY EDITOR");
    const mid = answered.project.memories[0].id;
    await updateProject(b.narrator, b.projectId, answered.revision, {
      type: "memory",
      memoryId: mid,
      visibility: "editeur",
    });
    const contributor = await account();
    await invite(b.narrator, b.projectId, {
      email: contributor.email,
      name: "Contributor",
      role: "contributor",
    });
    await acceptInvite(contributor, await newestEmailToken(contributor.email));
    await as(contributor);
    const view = await (await request(`projects/${b.projectId}`)).json();
    expect(view.project.memories).toEqual([]);
    expect(
      JSON.stringify(await (await request("projects")).json()),
    ).not.toContain("ONLY THE FAMILY EDITOR");
    expect(
      (
        await request(`projects/${b.projectId}/commands`, "POST", {
          revision: view.revision,
          command: {
            type: "suggest",
            memoryId: mid,
            text: "Unauthorized rewrite",
          },
        })
      ).status,
    ).toBe(404);
  });
  it("never serializes an unapproved transcript to buyers, editors, contributors or support", async () => {
    const b = await book();
    let view = await answer(b, "Shared family story");
    const mid = view.project.memories[0].id;
    view = await updateProject(b.narrator, b.projectId, view.revision, {
      type: "memory",
      memoryId: mid,
      visibility: "famille",
    });
    const row = await accessProject(pool(), b.narrator, b.projectId);
    const p = unseal<Project>(row.payload);
    const audioId = id();
    p.audios.push({
      id: audioId,
      memoryId: mid,
      mime: "audio/wav",
      durationSec: 2,
      createdAt: Date.now(),
      transcript: {
        status: "a_relire",
        text: "PRIVATE UNAPPROVED TRANSCRIPT",
        simulated: false,
      },
      qr: { enabled: false, token: "" },
    });
    await pool().query("UPDATE projects SET payload=$2 WHERE id=$1", [
      b.projectId,
      seal(p),
    ]);
    const readers: Account[] = [b.buyer];
    for (const role of ["editor", "contributor"] as const) {
      const reader = await account(`${role}@example.test`);
      await invite(b.narrator, b.projectId, {
        email: reader.email,
        name: role,
        role,
      });
      await acceptInvite(reader, await newestEmailToken(reader.email));
      readers.push(reader);
    }
    const support = {
      ...(await account("support@example.test")),
      admin: true,
      mfa: true,
    };
    await pool().query(
      "INSERT INTO support_grants(project_id,account_id,expires_at,reason) VALUES($1,$2,now()+interval '1 hour','test grant')",
      [b.projectId, support.id],
    );
    for (const reader of [...readers, support]) {
      const result = projectView(
        await accessProject(pool(), reader, b.projectId),
      );
      expect(JSON.stringify(result)).not.toContain(
        "PRIVATE UNAPPROVED TRANSCRIPT",
      );
      expect(result.project.audios).toHaveLength(1);
    }
    await as(b.buyer);
    expect(
      JSON.stringify(await (await request(`projects/${b.projectId}`)).json()),
    ).not.toContain("PRIVATE UNAPPROVED TRANSCRIPT");
    expect(
      JSON.stringify(await (await request("projects")).json()),
    ).not.toContain("PRIVATE UNAPPROVED TRANSCRIPT");
    const narratorView = projectView(
      await accessProject(pool(), b.narrator, b.projectId),
    );
    expect(narratorView.project.audios[0].transcript.text).toBe(
      "PRIVATE UNAPPROVED TRANSCRIPT",
    );
    await updateProject(b.narrator, b.projectId, narratorView.revision, {
      type: "transcript",
      audioId,
      text: "Approved family transcript",
      approved: true,
    });
    expect(
      projectView(await accessProject(pool(), b.buyer, b.projectId)).project
        .audios[0].transcript.text,
    ).toBe("Approved family transcript");
  });
});

const protectedRoutes: [string, string][] = [
  ["auth/logout", "POST"],
  ["auth/mfa/setup", "POST"],
  ["auth/mfa/verify", "POST"],
  ["projects", "GET"],
  ["projects", "POST"],
  ["checkout", "POST"],
  ["orders", "GET"],
  ["invitations/accept", "POST"],
  ["uploads/ID", "GET"],
  ["uploads/ID/complete", "POST"],
  ["uploads/ID/0", "PUT"],
  ["media/ID", "GET"],
  ["projects/ID", "GET"],
  ["projects/ID/commands", "POST"],
  ["projects/ID/narrator-invitation", "POST"],
  ["projects/ID/invitations", "POST"],
  ["projects/ID/members", "GET"],
  ["projects/ID/members/revoke", "POST"],
  ["projects/ID/invitations/revoke", "POST"],
  ["projects/ID/uploads", "POST"],
  ["projects/ID/audio-links", "POST"],
  ["projects/ID/preview", "GET"],
  ["projects/ID/proof", "GET"],
  ["projects/ID/print", "POST"],
  ["projects/ID/export", "GET"],
  ["projects/ID/audit", "GET"],
  ["projects/ID/support-access", "POST"],
  ["projects/ID/transcription/retry", "POST"],
  ["admin/support", "GET"],
  ["admin/support/ID", "POST"],
  ["admin/operations", "GET"],
  ["admin/print/ID", "POST"],
  ["admin/refund/ID", "POST"],
  ["admin/retry-job/ID", "POST"],
];
describe("HTTP authentication and origin boundary", () => {
  it.each(protectedRoutes)(
    "rejects missing and invalid sessions: %s %s",
    async (template, method) => {
      const path = template.replace("ID", id());
      for (const token of [undefined, "invalid-session-token"]) {
        if (token) cookieJar.set("filemoire_session", token);
        const r = await request(
          path,
          method,
          method === "GET" ? undefined : {},
        );
        expect(r.status).toBe(401);
        expect(r.headers.get("cache-control")).toBe("no-store");
        expect(await r.json()).toMatchObject({
          error: "Connectez-vous pour continuer.",
          requestId: expect.any(String),
        });
      }
      if (method !== "GET") {
        expect(
          (
            await request(
              path,
              method,
              {},
              { origin: "https://untrusted.example" },
            )
          ).status,
        ).toBe(403);
      }
    },
  );
  it("expires an actual session and clears it on logout", async () => {
    await as(await account());
    expect((await (await request("me")).json()).account).not.toBeNull();
    expect((await request("auth/logout", "POST", {})).status).toBe(200);
    expect((await (await request("me")).json()).account).toBeNull();
    await as(await account());
    await pool().query(
      "UPDATE sessions SET expires_at=now()-interval '1 second'",
    );
    expect((await request("projects")).status).toBe(401);
  });
  it("keeps public discovery read-only and rejects malformed requests safely", async () => {
    expect((await (await request("catalog")).json()).packages).toHaveLength(3);
    expect((await (await request("health")).json()).status).toBe("ok");
    expect(
      (await request("auth/request", "POST", { email: "bad" })).status,
    ).toBe(400);
    expect(
      (
        await request("auth/request", "POST", {
          email: "a@example.test",
          admin: true,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "auth/request",
          "POST",
          {},
          { "content-type": "text/plain" },
        )
      ).status,
    ).toBe(415);
    expect(
      (await request("auth/request", "POST", { email: "x".repeat(270000) }))
        .status,
    ).toBe(413);
    const malformed = new Request("http://localhost:3300/api/v1/auth/request", {
      method: "POST",
      headers: {
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
      },
      body: "{",
    });
    expect((await handleApi(malformed, ["auth", "request"])).status).toBe(400);
    expect(
      (
        await request("audio/listen", "POST", {
          token: "x".repeat(43),
          code: "not-a-code",
        })
      ).status,
    ).toBe(403);
    expect((await request("stripe/webhook", "POST", {})).status).toBe(400);
  });
  it("does not leak dependency error messages or SQL", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = vi
      .spyOn(pool(), "query")
      .mockRejectedValueOnce(
        new Error("SECRET_DATABASE_PASSWORD SELECT * FROM accounts") as never,
      );
    try {
      const r = await request("health");
      expect(r.status).toBe(503);
      expect(JSON.stringify(await r.json())).not.toContain(
        "SECRET_DATABASE_PASSWORD",
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "SECRET_DATABASE_PASSWORD",
      );
    } finally {
      query.mockRestore();
      log.mockRestore();
    }
  });
});

describe("HTTP ownership, support and input validation", () => {
  it("rejects cross-family reads, writes, exports and private media lookup", async () => {
    const b = await book();
    const view = await answer(b, "PRIVATE FAMILY CONTENT");
    await as(await account());
    for (const suffix of [
      "",
      "/members",
      "/preview",
      "/proof",
      "/export",
      "/audit",
    ]) {
      const r = await request(`projects/${b.projectId}${suffix}`);
      expect(r.status).toBe(404);
      expect(JSON.stringify(await r.json())).not.toContain(
        "PRIVATE FAMILY CONTENT",
      );
    }
    expect(
      (
        await request(`projects/${b.projectId}/commands`, "POST", {
          revision: view.revision,
          command: { type: "reopen" },
        })
      ).status,
    ).toBe(404);
    expect((await request(`media/${id()}`)).status).toBe(404);
    expect((await request("projects/not-a-uuid")).status).toBe(400);
    expect((await request("projects/' OR 1=1--")).status).toBe(400);
    expect((await request("admin/operations")).status).toBe(403);
    expect((await request("admin/support")).status).toBe(403);
    expect((await request(`admin/retry-job/${id()}`, "POST", {})).status).toBe(
      403,
    );
  });
  it("creates a support request privately and requires MFA for a single queued reply", async () => {
    const input = {
      name: "Test user",
      email: "support-request@example.test",
      topic: "question",
      message: "Please help with my private book.",
    };
    const sent = await request("contact", "POST", input);
    expect(sent.status).toBe(201);
    const ticket = await sent.json();
    const raw = (
      await pool().query("SELECT payload FROM support_requests WHERE id=$1", [
        ticket.id,
      ])
    ).rows[0].payload;
    expect(raw).not.toContain(input.message);
    const admin = await account("audit-operator@example.test");
    await as(admin);
    process.env.ADMIN_EMAILS = admin.email;
    expect((await request("admin/support")).status).toBe(403);
    await pool().query(
      "UPDATE sessions SET mfa_verified_at=now() WHERE account_id=$1",
      [admin.id],
    );
    expect(
      (await (await request("admin/support")).json()).tickets[0],
    ).toMatchObject(input);
    expect(
      (
        await request(`admin/support/${ticket.id}`, "POST", {
          text: "Synthetic reply, queued only.",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`admin/support/${ticket.id}`, "POST", {
          text: "Duplicate reply",
        })
      ).status,
    ).toBe(409);
    expect(
      Number(
        (
          await pool().query("SELECT count(*) FROM jobs WHERE dedupe_key=$1", [
            `support-reply:${ticket.id}`,
          ])
        ).rows[0].count,
      ),
    ).toBe(1);
    delete process.env.ADMIN_EMAILS;
  });
  it("accepts an authorized project command, rejects stale and malformed commands", async () => {
    const b = await book();
    await as(b.narrator);
    const initial = await (await request(`projects/${b.projectId}`)).json();
    expect(initial.role).toBe("narrator");
    const command = {
      type: "answer",
      questionId: initial.project.questions[0].id,
      text: "Été, mémoire et famille — <script>alert(1)</script>",
      visibility: "moi",
    };
    const result = await request(`projects/${b.projectId}/commands`, "POST", {
      revision: initial.revision,
      command,
    });
    expect(result.status).toBe(200);
    expect((await result.json()).project.memories[0].text).toBe(command.text);
    expect(
      (
        await request(`projects/${b.projectId}/commands`, "POST", {
          revision: initial.revision,
          command,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(`projects/${b.projectId}/commands`, "POST", {
          revision: "1",
          command,
        })
      ).status,
    ).toBe(400);
    expect((await request(`projects/${b.projectId}/members`)).status).toBe(200);
    expect((await request(`projects/${b.projectId}/audit`)).status).toBe(200);
    expect((await request("does-not-exist")).status).toBe(404);
    const preview = await request(`projects/${b.projectId}/preview`);
    expect(preview.status).toBe(200);
    const proof = await request(`projects/${b.projectId}/proof`);
    expect(proof.headers.get("content-type")).toBe("application/pdf");
    expect(
      Buffer.from(await proof.arrayBuffer())
        .subarray(0, 4)
        .toString(),
    ).toBe("%PDF");
  });
});
