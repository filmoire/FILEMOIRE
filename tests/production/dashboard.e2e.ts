import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  account,
  book,
  answer,
  pendingOrder,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { applyStripeEvent } from "../../src/server/payments";
import {
  accessProject,
  invite,
  acceptInvite,
  updateProject,
} from "../../src/server/projects";
import { pool } from "../../src/server/db";
import { hash } from "../../src/server/security";

test.beforeAll(configureTests);
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);
async function login(page: Page, email: string) {
  await requestLogin(email);
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
  await expect(page).toHaveURL(/\/espace/);
}
async function verify(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("form")
      .evaluateAll((forms) =>
        forms.every(
          (form) => form instanceof HTMLFormElement && form.noValidate,
        ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator("textarea")
      .evaluateAll((fields) =>
        fields.every((field) => getComputedStyle(field).resize === "none"),
      ),
  ).toBe(true);
  await page.screenshot({ path, fullPage: true });
}
test("buyer design uses real invitations, private progress, empty states and bilingual navigation", async ({
  page,
}, info) => {
  const buyer = await account(),
    narrator = await account();
  const pending = await pendingOrder(buyer, narrator);
  await applyStripeEvent(pending.event);
  await login(page, buyer.email);
  await expect(
    page.getByRole("heading", { name: "Vos cadeaux", exact: true }),
  ).toBeVisible();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-buyer.png`,
  );
  await page.getByRole("link", { name: "Mes cadeaux", exact: true }).click();
  await page
    .getByRole("button", { name: "Annuler l’invitation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Annuler", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Annuler l’invitation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler l’invitation", exact: true })
    .click();
  await expect(
    page.getByText("Invitation annulée.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Invitation annulée", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Suivi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Le chemin vers le livre" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The journey to a book" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("link", { name: "Orders", exact: true }).first().click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-buyer-orders-en.png`,
  );
});

test("editor opens only shared memories and sees their saved suggestion status", async ({
  page,
}, info) => {
  const b = await book();
  const editor = await account();
  let view = await answer(b, "Shared story for the family editor.");
  view = await updateProject(b.narrator, b.projectId, view.revision, {
    type: "memory",
    memoryId: view.project.memories[0].id,
    visibility: "editeur",
  });
  await invite(b.narrator, b.projectId, {
    email: editor.email,
    name: editor.name,
    role: "editor",
  });
  await acceptInvite(editor, await newestEmailToken(editor.email));
  await login(page, editor.email);
  await page.getByRole("link", { name: "Livres confiés", exact: true }).click();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-editor.png`,
  );
  await page.getByRole("link", { name: "Ouvrir le livre confié" }).click();
  await page
    .getByRole("textbox", { name: "Votre proposition", exact: true })
    .fill("A small correction to the shared story.");
  await page.getByRole("button", { name: "Proposer une correction" }).click();
  await expect(
    page.getByText("Proposition envoyée au narrateur.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Mes suggestions", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: /^Correction proposée/ }),
  ).toBeVisible();
  await expect(page.getByText("À valider", { exact: true })).toBeVisible();
  const row = await accessProject(pool(), b.narrator, b.projectId);
  await updateProject(b.narrator, b.projectId, row.revision, {
    type: "memory",
    memoryId: view.project.memories[0].id,
    visibility: "moi",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Aucune proposition pour l’instant" }),
  ).toBeVisible();
});

test("operations design requires MFA, uses metadata, recovers from failure and edits the question library", async ({
  page,
  context,
}, info) => {
  const admin = await account("design-ops@example.test");
  const b = await book();
  await answer(b, "NEVER IN OPERATIONS METADATA");
  await login(page, admin.email);
  await expect(
    page.getByRole("heading", { name: "Confirmez votre identité" }),
  ).toBeVisible();
  expect((await page.request.get("/api/v1/admin/dashboard")).status()).toBe(
    403,
  );
  const token = (await context.cookies()).find(
    (c) => c.name === "filemoire_session",
  )!.value;
  await pool().query(
    "UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1",
    [hash(token)],
  );
  await page.reload();
  await expect(
    page.getByText("Commandes payées", { exact: true }),
  ).toBeVisible();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-operations.png`,
  );
  await page.getByRole("link", { name: "Projets", exact: true }).click();
  await expect(page.getByText("Aucun accès", { exact: true })).toBeVisible();
  await expect(page.getByText("NEVER IN OPERATIONS METADATA")).toHaveCount(0);
  // A newly granted book must open without reusing the initial project list.
  await pool().query(
    "INSERT INTO support_grants(project_id,account_id,expires_at,reason) VALUES($1,$2,now()+interval '1 hour','Requested help in local browser test')",
    [b.projectId, admin.id],
  );
  await page.getByRole("button", { name: "Actualiser", exact: true }).click();
  await page
    .getByRole("link", { name: "Lire avec autorisation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Accès temporaire autorisé",
      exact: true,
    }),
  ).toBeVisible();
  const grantedUrl = page.url();
  await page.getByRole("link", { name: "Projets", exact: true }).click();
  await pool().query(
    "UPDATE support_grants SET expires_at=now()-interval '1 second' WHERE project_id=$1",
    [b.projectId],
  );
  await page.goto(grantedUrl);
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Accès temporaire autorisé",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByText("NEVER IN OPERATIONS METADATA")).toHaveCount(0);
  await page.route("**/api/v1/admin/records/commandes?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Service temporairement indisponible." },
    }),
  );
  await page.getByRole("link", { name: "Commandes", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Service temporairement indisponible." }),
  ).toBeVisible();
  await page.unroute("**/api/v1/admin/records/commandes?*");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Payée", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Statut", exact: true })
    .selectOption("refunded");
  await expect(
    page.getByRole("heading", { name: "Aucun résultat pour ce filtre" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Commandes · Filémoire");
  await page.getByRole("link", { name: "Questions", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter une question", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Enregistrer la question" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Question", exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Quel jardin aimiez-vous visiter ?");
  await dialog.getByRole("button", { name: "Enregistrer la question" }).click();
  await expect(
    page.getByText("Question enregistrée.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("Quel jardin aimiez-vous visiter");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page).toHaveURL(/q=Quel/);
  await expect(page).toHaveTitle("Questions · Filémoire");
  await expect(
    page.getByRole("heading", {
      name: "Quel jardin aimiez-vous visiter ?",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Quel jardin aimiez-vous visiter ?",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(
    page.getByRole("textbox", { name: "Rechercher", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-questions-en.png`,
  );
  await page.getByRole("link", { name: "Support", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No support requests", exact: true }),
  ).toBeVisible();
});

test("new members can use the illustrated empty dashboards, gift form and browser history", async ({
  page,
}, info) => {
  const member = await account();
  await login(page, member.email);
  const role = page.getByRole("combobox", { name: "Espace", exact: true });
  await role.focus();
  await role.press("Space");
  await role.press("Escape");
  await expect(role).toBeFocused();
  // Chromium's native picker can block screenshots on Linux; capture after closing it.
  await page.screenshot({
    path: `artifacts/production/design-2026-10-22/${info.project.name}-workspace-select.png`,
  });
  await role.selectOption("buyer");
  await expect(
    page.getByRole("heading", { name: "La première page reste à offrir." }),
  ).toBeVisible();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-buyer-empty.png`,
  );
  await page.getByRole("link", { name: "Mes cadeaux", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "À qui offrirez-vous la parole ?" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "La première page reste à offrir." }),
  ).toBeVisible();
  await role.selectOption("editor");
  await expect(
    page.getByRole("heading", { name: "Aucun livre ne vous est confié" }),
  ).toBeVisible();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-editor-empty.png`,
  );
  await role.selectOption("buyer");
  await page.getByRole("link", { name: "Offrir", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Préparez son cadeau" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider cette formule ↗" }),
  ).toBeDisabled();
  await verify(
    page,
    `artifacts/production/design-2026-10-22/${info.project.name}-gift.png`,
  );
});
