import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  account,
  book,
  answer,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { pool } from "../../src/server/db";
import { hash, id, seal, unseal } from "../../src/server/security";
import { contact } from "../../src/server/support";
import { accessProject } from "../../src/server/projects";
import type { Project } from "../../src/lib/types";

test.beforeAll(configureTests);
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);
async function login(page: Page, email: string) {
  await requestLogin(email);
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
  await expect(page).toHaveURL(/\/espace/);
}
async function prepareGift(page: Page) {
  await page.goto("/offrir");
  await expect(
    page.getByRole("button", { name: "Valider cette formule ↗" }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: /Héritage/ }).check();
  await page.getByRole("button", { name: "Valider cette formule ↗" }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Prénom", exact: true }),
  ).toBeFocused();
  await page.getByRole("textbox", { name: "Prénom", exact: true }).fill("Rose");
  await page.getByRole("textbox", { name: "Nom", exact: true }).fill("Test");
  await page
    .getByRole("textbox", { name: "E-mail du destinataire" })
    .fill("rose@example.test");
  await page
    .getByRole("textbox", { name: "Votre lien avec cette personne" })
    .fill("Grandmother");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Votre message" })
    .fill("Nos souvenirs restent en français.");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator('textarea[name="message"]')).toHaveValue(
    "Nos souvenirs restent en français.",
  );
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("checkbox", { name: /Coffret cadeau/ }).check();
  await page.getByRole("spinbutton").fill("2");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vérifiez votre cadeau" }),
  ).toBeVisible();
  await expect(page.locator(".dash-review")).toContainText("rose@example.test");
  await expect(page.locator(".dash-summary")).toContainText("306");
  await page
    .getByRole("button", { name: "3 · Destinataire", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Prénom", exact: true }),
  ).toHaveValue("Rose");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Votre cadeau est prêt" }),
  ).toBeVisible();
}
test("seven-step gift retains entries, validates fields, supports English, and honours closed checkout", async ({
  page,
}, info) => {
  await login(page, (await account()).email);
  await prepareGift(page);
  await expect(
    page.getByText("Les commandes ne sont pas encore ouvertes.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuer vers le paiement" }),
  ).toBeDisabled();
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
  await page.screenshot({
    path: `artifacts/production/design-2026-10-26/${info.project.name}-gift-payment.png`,
    fullPage: true,
  });
});
test("checkout sends real wizard data and keeps one idempotency key on a failed retry", async ({
  page,
}) => {
  await login(page, (await account()).email);
  // Simulate stale availability in the browser. The actual server must still reject closed checkout.
  await page.route("**/api/v1/catalog", (route) =>
    route.fulfill({ json: { ordersOpen: true, cutoff: null } }),
  );
  await prepareGift(page);
  await page.getByRole("checkbox", { name: /J’accepte les/ }).check();
  const requests: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/checkout"))
      requests.push(request.postDataJSON());
  });
  await page
    .getByRole("button", { name: "Continuer vers le paiement" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Les commandes ne sont pas encore ouvertes.",
  );
  await page
    .getByRole("button", { name: "Continuer vers le paiement" })
    .click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]).toMatchObject({
    packageCode: "heritage",
    theme: "vie",
    recipient: { firstName: "Rose", email: "rose@example.test" },
    giftBox: true,
    extraCopies: 2,
    message: "Nos souvenirs restent en français.",
    accepted: true,
  });
  expect(requests[1].requestKey).toBe(requests[0].requestKey);
  expect(
    (await pool().query("SELECT count(*) FROM orders")).rows[0].count,
  ).toBe("0");
});
test("operations persists support and question controls and advances a real local print record", async ({
  page,
  context,
}, info) => {
  const admin = await account("design-ops@example.test");
  const ticket = await contact({
    name: "Local requester",
    email: "requester@example.test",
    topic: "devis",
    message: "Please provide a quote for a family book.",
  });
  const b = await book();
  await answer(b, "PRIVATE STORY NEVER IN METADATA");
  const row = await accessProject(pool(), b.narrator, b.projectId);
  const project = unseal<Project>(row.payload);
  project.book.status = "preparation";
  await pool().query(
    "UPDATE projects SET status='preparation',payload=$2 WHERE id=$1",
    [b.projectId, seal(project)],
  );
  const version = id();
  await pool().query(
    "INSERT INTO book_versions(id,project_id,revision,content_hash,payload) VALUES($1,$2,999,'test-fixture',$3)",
    [version, b.projectId, seal(project)],
  );
  await pool().query(
    "INSERT INTO print_orders(id,project_id,version_id,request_key) VALUES($1,$2,$3,$4)",
    [id(), b.projectId, version, id()],
  );
  await login(page, admin.email);
  const token = (await context.cookies()).find(
    (c) => c.name === "filemoire_session",
  )!.value;
  await pool().query(
    "UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1",
    [hash(token)],
  );
  await page.reload();
  await page.getByRole("link", { name: "Support", exact: true }).click();
  const card = page.locator(`#ticket-${ticket.id}`);
  await card.getByRole("combobox").selectOption("in_progress");
  await expect(
    page.getByText("Statut enregistré.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(card.getByRole("combobox")).toHaveValue("in_progress");
  await page.screenshot({
    path: `artifacts/production/design-2026-10-26/${info.project.name}-support.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Questions", exact: true }).click();
  const toggle = page.getByRole("switch").first();
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(
    page.getByText("Question désactivée pour les nouveaux parcours.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await page.getByRole("link", { name: "Impression", exact: true }).click();
  await expect(page.getByText("PRIVATE STORY NEVER IN METADATA")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox")).toHaveValue("impression");
  await dialog
    .getByRole("button", { name: "Enregistrer le statut", exact: true })
    .click();
  await expect(
    page.getByText("Opération enregistrée.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "En impression", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `artifacts/production/design-2026-10-26/${info.project.name}-printing.png`,
    fullPage: true,
  });
});
