import { test, expect, type Page } from "@playwright/test";
import {
  configureTests,
  resetTests,
  book,
  answer,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { pool } from "../../src/server/db";
import { accessProject, updateProject } from "../../src/server/projects";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
test.beforeAll(() => configureTests());
test.beforeEach(async () => {
  await resetTests();
});
test.afterAll(async () => {
  await pool().end();
});
async function login(page: Page, email: string) {
  await requestLogin(email);
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
  await expect(page).toHaveURL(/\/espace/);
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
}

test("a new account creates a real private manuscript, saves across reloads and downloads its approved PDF", async ({
  page,
}, info) => {
  const email = `writer-${randomUUID()}@example.test`;
  await page.goto("/");
  await page.getByRole("link", { name: "Commencer mon histoire" }).click();
  await expect(page).toHaveURL(/\/acces/);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Consultez votre messagerie",
  );
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
  await page.getByLabel("Votre prénom", { exact: true }).fill("Camille");
  await page.getByLabel("Votre nom", { exact: true }).fill("Martin");
  await page.getByLabel("Titre de votre livre").fill("Les étés au jardin");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon livre privé" }).click();
  await expect(
    page.getByText("Manuscrit personnel ·", { exact: false }),
  ).toBeVisible();
  const story =
    "Chaque été, nous retrouvions les cousins au jardin de ma grand-mère.";
  await page.getByLabel("Votre souvenir", { exact: true }).fill(story);
  await expect(
    page.getByText("Brouillon enregistré", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer ma réponse", exact: true })
    .click();
  await expect(
    page.getByText("Réponse enregistrée", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(story, { exact: true })).toBeVisible();
  const projects = await (await page.request.get("/api/v1/projects")).json();
  expect(projects.projects).toHaveLength(1);
  expect(projects.projects[0].project.orderId).toBeNull();
  expect(
    (await (await page.request.get("/api/v1/orders")).json()).orders,
  ).toEqual([]);
  await page.getByRole("button", { name: "Livre", exact: true }).click();
  await page.getByRole("button", { name: "J’ai relu cette version" }).click();
  await expect(
    page.getByText("Version actuelle sélectionnée pour validation."),
  ).toBeVisible();
  await expect(page.getByLabel("Adresse", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("Je valide le contenu de cette version de mon manuscrit.")
    .check();
  await page
    .getByRole("button", { name: "Valider mon livre", exact: true })
    .click();
  await expect(
    page.getByText("Votre version est validée et verrouillée."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Commander l’impression/ }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger l’épreuve PDF" }).click();
  expect((await download).suggestedFilename()).toBe("filemoire-epreuve.pdf");
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
    path: `artifacts/production/${info.project.name}-personal-book.png`,
    fullPage: true,
  });
});

test("narrator saves a real story, uploads a photo, reviews a PDF, exports and signs out", async ({
  page,
}, info) => {
  const b = await book();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, b.narrator.email);
  const story = page.getByLabel("Votre souvenir", { exact: true });
  await story.fill(
    "Je me souviens du jardin de ma grand-mère. Nous y passions chaque été.",
  );
  await expect(
    page.getByText("Brouillon enregistré", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer ma réponse", exact: true })
    .click();
  await expect(
    page.getByText("Réponse enregistrée", { exact: true }),
  ).toBeVisible();
  const photo = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#63826a" },
  })
    .jpeg()
    .toBuffer();
  await page
    .locator('input[type=file][accept="image/jpeg,image/png,image/webp"]')
    .setInputFiles({
      name: "jardin.jpg",
      mimeType: "image/jpeg",
      buffer: photo,
    });
  await expect(page.getByAltText("jardin", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Livre", exact: true }).click();
  await page.getByRole("button", { name: "J’ai relu cette version" }).click();
  await expect(
    page.getByText("Version actuelle sélectionnée pour validation."),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger l’épreuve PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("filemoire-epreuve.pdf");
  await page
    .getByRole("textbox", { name: "Nom du destinataire", exact: true })
    .fill("Camille Test");
  await page
    .getByRole("textbox", { name: "Adresse", exact: true })
    .fill("1 rue du Test");
  await page
    .getByRole("textbox", { name: "Code postal", exact: true })
    .fill("75001");
  await page.getByRole("textbox", { name: "Ville", exact: true }).fill("Paris");
  await page
    .getByLabel(
      "Je valide le contenu de cette version et l’adresse de livraison.",
    )
    .check();
  await page
    .getByRole("button", { name: "Valider mon livre", exact: true })
    .click();
  await expect(
    page.getByText("Votre version est validée et verrouillée."),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Commander l’impression de la version validée",
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "validation du fournisseur" }),
  ).toContainText("validation du fournisseur");
  await page
    .getByRole("button", { name: "Confidentialité", exact: true })
    .click();
  const exportDownload = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Exporter mon récit et tous mes médias" })
    .click();
  expect((await exportDownload).suggestedFilename()).toBe(
    "filemoire-export.tar",
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.includes("filemoire")),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `artifacts/production/${info.project.name}-workspace.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
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
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(page).toHaveURL(/\/acces/);
  expect((await page.request.get("/api/v1/projects")).status()).toBe(401);
});

test("buyer never receives private story text or unauthorized media", async ({
  page,
}) => {
  const b = await book();
  const v = await answer(b, "PRIVATE-NEVER-SENT-TO-BUYER");
  await login(page, b.buyer.email);
  await expect(page.getByText("PRIVATE-NEVER-SENT-TO-BUYER")).toHaveCount(0);
  const data = await (
    await page.request.get(`/api/v1/projects/${b.projectId}`)
  ).text();
  expect(data).not.toContain("PRIVATE-NEVER-SENT");
  const row = await accessProject(pool(), b.narrator, b.projectId);
  await updateProject(b.narrator, b.projectId, row.revision, {
    type: "memory",
    memoryId: v.project.memories[0].id,
    visibility: "famille",
  });
  await page.reload();
  await expect(
    page.getByText("PRIVATE-NEVER-SENT-TO-BUYER", { exact: true }),
  ).toBeVisible();
  const denied = await page.request.post(
    `/api/v1/projects/${b.projectId}/commands`,
    {
      headers: { Origin: "https://untrusted.test" },
      data: {
        revision: row.revision + 1,
        command: { type: "delete-project", confirm: "DELETE" },
      },
    },
  );
  expect(denied.status()).toBe(403);
});

test("public live mode hides demo controls, redirects legacy routes and persists support requests", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Jouer le rôle de", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Offrir Filémoire", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/offrir/);
  await page.goto("/narrateur");
  await expect(page).toHaveURL(/\/acces/);
  await page.goto("/#contact");
  await page.getByLabel("Votre nom", { exact: true }).fill("Test Visitor");
  await page
    .getByLabel("Votre e-mail", { exact: true })
    .fill("visitor@example.test");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Question de test pour le support.");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText("Votre demande est enregistrée.")).toBeVisible();
  expect((await pool().query("SELECT * FROM support_requests")).rowCount).toBe(
    1,
  );
});

test("records browser audio and sends original bytes to the server", async ({
  page,
}) => {
  const b = await book();
  await answer(b);
  await login(page, b.narrator.email);
  await page
    .getByRole("button", { name: "Enregistrer ma voix", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Arrêter et sauvegarder", exact: true }),
  ).toBeVisible();
  // Capture more than one MediaRecorder timeslice; this exercises WebM with no container duration.
  await page.waitForTimeout(1300);
  await page
    .getByRole("button", { name: "Arrêter et sauvegarder", exact: true })
    .click();
  await expect(
    page.getByText("Votre enregistrement est sauvegardé.", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Texte à relire", { exact: true })
    .fill("Je conserve ma voix et corrige moi-même ce souvenir.");
  await page
    .getByRole("button", { name: "Valider ma transcription", exact: true })
    .click();
  await expect(
    page.getByText("Transcription validée.", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await pool().query(
        "SELECT mime FROM media WHERE project_id=$1 AND kind='audio'",
        [b.projectId],
      )
    ).rows[0].mime,
  ).toBe("audio/webm");
});
