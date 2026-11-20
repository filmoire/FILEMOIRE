import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  account,
  answer,
  book,
  closeTestDatabase,
  configureTests,
  newestEmailToken,
  resetTests,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import {
  accessProject,
  createPersonalProject,
  invite,
  projectView,
  updateProject,
} from "../../src/server/projects";
import { pool } from "../../src/server/db";

test.beforeAll(() => {
  configureTests();
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
});
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);

async function login(page: Page, email: string) {
  await requestLogin(email);
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
  await expect(page).toHaveURL(/\/espace/);
}

for (const member of [
  "admin editor",
  "narrator editor",
  "contributor",
] as const) {
  test(`accepting an invitation opens the invited book for a ${member}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const b = await book();
    const recipient = await account(
      member === "admin editor" ? "design-ops@example.test" : undefined,
    );
    const own = await createPersonalProject(recipient, {
      requestKey: randomUUID(),
      firstName: "Recipient",
      lastName: "Fixture",
      title: "My separate private book",
      theme: "vie",
      consentVersion: "2026-10-13",
      accepted: true,
    });
    let view = await answer(b, "Shared invitation routing fixture.");
    view = await updateProject(b.narrator, b.projectId, view.revision, {
      type: "memory",
      memoryId: view.project.memories[0].id,
      visibility: member === "contributor" ? "famille" : "editeur",
    });
    await invite(b.narrator, b.projectId, {
      email: recipient.email,
      name: recipient.name,
      role: member === "contributor" ? "contributor" : "editor",
      canSuggest: member !== "contributor",
    });
    const invitation = await newestEmailToken(recipient.email);
    await login(page, recipient.email);
    await page.goto(`/rejoindre#token=${invitation}`);
    await page.getByRole("button", { name: "Accepter l’invitation" }).click();
    await expect(page).toHaveURL(`/espace?livre=${b.projectId}`);
    await expect(
      page.getByRole("combobox", { name: "Espace", exact: true }),
    ).toHaveValue("editor");
    await expect(
      page
        .getByRole("paragraph")
        .filter({ hasText: /^Shared invitation routing fixture\.$/ }),
    ).toBeVisible();
    await expect(
      page.getByText(own.project.book.cover.title, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Valider mon livre", exact: true }),
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Espace", exact: true }),
    ).toHaveValue("editor");
    if (member === "contributor") {
      await expect(
        page.getByRole("button", { name: "Proposer une correction" }),
      ).toHaveCount(0);
    } else {
      await page
        .getByRole("textbox", { name: "Votre proposition", exact: true })
        .fill("Narrator-approved correction fixture.");
      await page
        .getByRole("button", { name: "Proposer une correction" })
        .click();
      await expect(
        page.getByText("Proposition envoyée au narrateur.", { exact: true }),
      ).toBeVisible();
      // A suggestion cannot overwrite the original until its narrator approves.
      const before = projectView(
        await accessProject(pool(), b.narrator, b.projectId),
      );
      expect(before.project.memories[0].text).toBe(
        "Shared invitation routing fixture.",
      );
      const suggestion = before.project.suggestions[0];
      expect(suggestion.status).toBe("en_attente");
      const denied = await page.request.post(
        `/api/v1/projects/${b.projectId}/commands`,
        {
          headers: { Origin: "http://localhost:3300" },
          data: {
            revision: before.revision,
            command: {
              type: "decide",
              suggestionId: suggestion.id,
              accept: true,
            },
          },
        },
      );
      expect(denied.status()).toBe(403);
      await updateProject(b.narrator, b.projectId, before.revision, {
        type: "decide",
        suggestionId: suggestion.id,
        accept: true,
      });
      await page.reload();
      await expect(
        page
          .getByRole("paragraph")
          .filter({ hasText: /^Narrator-approved correction fixture\.$/ }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Mes suggestions", exact: true })
        .click();
      await expect(page.getByText("Acceptée", { exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
