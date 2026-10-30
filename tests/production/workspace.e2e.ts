import { test, expect, type Page } from "@playwright/test";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  book,
  account,
  answer,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { pool } from "../../src/server/db";
import {
  accessProject,
  createPersonalProject,
  updateProject,
} from "../../src/server/projects";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
test.beforeAll(() => configureTests());
test.beforeEach(async () => {
  await resetTests();
});
test.afterAll(closeTestDatabase);
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
  const queued = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/request") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  expect((await queued).status()).toBe(202);
  await expect(page.getByRole("status")).toContainText(
    "Votre demande est en cours d’envoi.",
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
  await page.getByRole("button", { name: "Retirer ma validation" }).click();
  await expect(
    page.getByText("Votre version est validée et verrouillée."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Valider mon livre", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Titre", { exact: true })).toBeEditable();
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

test("starts with voice, finishes a personal story and renders its private QR", async ({
  page,
  isMobile,
}) => {
  const narrator = await account();
  process.env.PERSONAL_DRAFTS_ENABLED = "true";
  let personal;
  try {
    personal = await createPersonalProject(narrator, {
      requestKey: randomUUID(),
      firstName: "Camille",
      lastName: "Test",
      title: "Mon récit vocal",
      theme: "vie",
      accepted: true,
      consentVersion: "2026-10-13",
    });
  } finally {
    delete process.env.PERSONAL_DRAFTS_ENABLED;
  }
  const b = { narrator, projectId: personal.id };
  await login(page, b.narrator.email);
  await page
    .getByRole("button", { name: "Répondre avec ma voix", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer ma voix", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Arrêter et sauvegarder", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop and save", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Français", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Ajouter au récit", exact: true })
    .click();
  await expect(
    page.getByText("Transcription ajoutée au souvenir.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Votre question", exact: true })
    .selectOption(personal.project.questions[0].id);
  await expect(page.getByLabel("Votre souvenir", { exact: true })).toHaveValue(
    "Je conserve ma voix et corrige moi-même ce souvenir.",
  );
  await expect(
    page.getByText("Réponse validée", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Activer l’écoute par QR").check();
  await page
    .getByLabel("Code d’écoute (8 caractères minimum)")
    .fill("local-family-code");
  await page
    .getByRole("button", { name: "Enregistrer l’accès audio", exact: true })
    .click();
  await expect(
    page.getByText("Communiquez le code séparément", { exact: false }),
  ).toBeVisible();
  const snapshot = await (
    await page.request.get(`/api/v1/projects/${b.projectId}`)
  ).json();
  const token = snapshot.project.audios[0].qr.token;
  expect(token).toBeTruthy();
  expect(snapshot.project.memories[0].status).toBe("terminee");
  const preview = await (
    await page.request.get(`/api/v1/projects/${b.projectId}/preview`)
  ).json();
  expect(preview.book[0].memories[0].audio?.qr.token).toBe(token);
  const pdf = await page.request.get(`/api/v1/projects/${b.projectId}/proof`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  await page.getByRole("button", { name: "Livre", exact: true }).click();
  await page
    .getByLabel("Aller à")
    .selectOption({ label: "Chapitre 1 — Origines" });
  if (isMobile)
    await page
      .getByRole("button", { name: "Page suivante", exact: true })
      .click();
  await expect(
    page
      .getByRole("img", {
        name: `QR code vers http://localhost:3300/ecoute#token=${token}`,
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(page).toHaveURL(/\/acces$/);
  await page.goto(`/ecoute#token=${token}`);
  await page.getByLabel("Code famille").fill("incorrect-code");
  await page.getByRole("button", { name: "Écouter", exact: true }).click();
  await expect(
    page.getByText("Lien ou code invalide.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Code famille").fill("local-family-code");
  await page.getByRole("button", { name: "Écouter", exact: true }).click();
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  expect(
    (
      await pool().query(
        "SELECT mime FROM media WHERE project_id=$1 AND kind='audio'",
        [b.projectId],
      )
    ).rows[0].mime,
  ).toBe("audio/webm");
});

test("English and French persist across public pages, reloads and sign-in", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const missing = new Set<string>();
  const collect = async () => {
    for (const text of await page.evaluate(() => [
      ...((window as unknown as { __I18N_MISSING__?: Set<string> })
        .__I18N_MISSING__ ?? []),
    ]))
      missing.add(text);
  };
  await page.goto("/");
  await page.locator('button[aria-label="English"]:visible').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: "Start my story", exact: true }),
  ).toBeVisible();
  await collect();
  for (const path of [
    "/comment-ca-marche",
    "/offres",
    "/livre-exemple",
    "/legal",
    "/rejoindre",
    "/ecoute",
    "/acces",
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator('button[aria-label="English"]:visible'),
    ).toHaveAttribute("aria-pressed", "true");
    await collect();
  }
  const email = `english-${randomUUID()}@example.test`;
  await page.getByLabel("E-mail address", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.getByLabel("Adresse e-mail", { exact: true })).toHaveValue(
    email,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Votre espace Filémoire", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto(`/acces#token=${"invalid-local-token-".repeat(3)}`);
  await page
    .getByRole("button", { name: "Confirm sign-in", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This link has expired or has already been used." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Request a new link", exact: true })
    .click();
  await page.getByLabel("E-mail address", { exact: true }).fill(email);
  const queued = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/request") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Send me a sign-in link", exact: true })
    .click();
  expect((await queued).status()).toBe(202);
  // This suite intentionally leaves delivery queued; it does not run an email worker.
  await expect(page.getByRole("status")).toHaveText(
    "Your sign-in link is being sent.",
  );
  await page.goto(`/acces#token=${await newestEmailToken(email)}`);
  await page
    .getByRole("button", { name: "Confirm sign-in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/espace$/);
  await expect(
    page.getByRole("button", { name: "Create my private book", exact: true }),
  ).toBeVisible();
  // A persisted English locale must also hydrate the workspace on a full load.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create my private book", exact: true }),
  ).toBeVisible();
  await collect();
  await page.getByRole("link", { name: "Give a gift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose this package ↗" }),
  ).toBeDisabled();
  await collect();
  await page.getByRole("radio", { name: /Heritage/ }).check();
  await page.getByRole("button", { name: "Choose this package ↗" }).click();
  await collect();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Camille");
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveValue(
    "Camille",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  expect([...missing].sort()).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("changing language preserves unsaved story and cover text without translating manuscript content", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const b = await book();
  await login(page, b.narrator.email);
  // A dictionary key is deliberate: personal text must not become 'Hello'.
  await page.getByLabel("Votre souvenir", { exact: true }).fill("Bonjour");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByLabel("Your memory", { exact: true })).toHaveValue(
    "Bonjour",
  );
  await page
    .getByRole("button", { name: "Save my answer", exact: true })
    .click();
  await expect(page.getByText("Answer saved", { exact: true })).toBeVisible();
  await expect(page.locator("article p[translate=no]").first()).toHaveText(
    "Bonjour",
  );
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Souvenirs");
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "La couverture", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
    "Souvenirs",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Save cover", exact: true }).click();
  await expect(page.getByText("Cover saved.", { exact: true })).toBeVisible();
  await expect(
    page
      .getByLabel("Book preview, use the arrow keys to turn the pages", {
        exact: true,
      })
      .getByText("Souvenirs", { exact: true }),
  ).toBeVisible();
  const snapshot = await (
    await page.request.get(`/api/v1/projects/${b.projectId}`)
  ).json();
  expect(snapshot.project.memories[0].text).toBe("Bonjour");
  expect(snapshot.project.book.cover.title).toBe("Souvenirs");
  await page
    .getByRole("combobox", { name: "Go to", exact: true })
    .selectOption({ label: "Chapter 1 — Origines" });
  await expect(
    page
      .locator(".paper p")
      .filter({ hasText: /^Origines$/ })
      .first(),
  ).toBeVisible();
  const viewport = page.viewportSize()!;
  const switchedWidth = viewport.width < 600 ? 1280 : 390;
  await page.setViewportSize({ width: switchedWidth, height: 844 });
  await expect(page.locator(".paper")).toHaveCount(
    switchedWidth >= 1024 ? 2 : 1,
  );
  await expect(
    page
      .locator(".paper p")
      .filter({ hasText: /^Origines$/ })
      .first(),
  ).toBeVisible();
  await page.setViewportSize(viewport);
  await expect(page.locator(".paper")).toHaveCount(
    viewport.width >= 1024 ? 2 : 1,
  );
  await expect(
    page
      .locator(".paper p")
      .filter({ hasText: /^Origines$/ })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Family", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Invite a family member", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your pace and choices", exact: true }),
  ).toBeVisible();
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
    path: `artifacts/production/language-2026-10-14/${info.project.name}-english.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("article p[translate=no]").first()).toHaveText(
    "Bonjour",
  );
});
