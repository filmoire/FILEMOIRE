import { expect, test } from "@playwright/test";
import { go, collectErrors, fresh, persona } from "./helpers";

test.describe("confidentialité et autorisations", () => {
  test("l'acheteuse ne lit que ce qui est partagé avec la famille", async ({ page }) => {
    await fresh(page, "avance");
    await persona(page, "Sophie Martin");
    await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Suivi" }).click();
    await expect(page.getByText("Vous voyez l'avancement, pas le contenu")).toBeVisible();
    await expect(page.getByText(/la chaleur du four montait par le plancher/)).toBeVisible(); // souvenir « famille »
    await expect(page.getByText(/entre deux pains/)).toHaveCount(0); // souvenir « éditeur »
    await expect(page.getByText(/barque aux cartes/)).toHaveCount(0); // souvenir privé et masqué
    await expect(page.getByText(/kouign-amann/)).toHaveCount(0); // brouillon
  });

  test("l'éditeur familial perd l'accès dès qu'il est révoqué", async ({ page }) => {
    await fresh(page, "avance");
    await persona(page, "Thomas Martin");
    await go(page, "/editeur/livres/p_madeleine");
    await expect(page.getByText(/entre deux pains/)).toBeVisible();
    await expect(page.getByText(/barque aux cartes/)).toHaveCount(0);
    await persona(page, "Madeleine Martin");
    await go(page, "/narrateur/famille");
    await page.getByRole("button", { name: "Retirer l'accès" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirer l'accès" }).click();
    await persona(page, "Thomas Martin");
    await go(page, "/editeur/livres/p_madeleine");
    await expect(page.getByText("Vous n'avez pas accès à ce livre")).toBeVisible();
    await expect(page.getByText(/entre deux pains/)).toHaveCount(0);
  });

  test("les Opérations ne lisent un manuscrit qu'avec une autorisation temporaire", async ({ page }) => {
    await fresh(page, "avance");
    await persona(page, "Opérations");
    await go(page, "/admin/projets");
    await page.getByRole("row", { name: /Madeleine Martin/ }).getByRole("button", { name: "Lire" }).click();
    await expect(page.getByText("Accès refusé")).toBeVisible();
    await persona(page, "Madeleine Martin");
    await go(page, "/narrateur/confidentialite");
    await page.locator("#sp-reason").fill("Un chapitre ne s'affiche pas");
    await page.getByRole("button", { name: "Autoriser temporairement" }).click();
    await persona(page, "Opérations");
    await go(page, "/admin/projets");
    await page.getByRole("row", { name: /Madeleine Martin/ }).getByRole("button", { name: "Lire" }).click();
    await expect(page.getByRole("dialog")).toContainText("Accès temporaire accordé par le narrateur");
  });

  test("un visiteur ne peut pas ouvrir l'espace narrateur", async ({ page }) => {
    await fresh(page);
    await go(page, "/narrateur");
    await expect(page.getByText("Cet espace est réservé à la personne qui raconte (narrateur)")).toBeVisible();
    await go(page, "/admin");
    await expect(page.getByText("Cet espace est réservé à l'équipe Opérations Filémoire")).toBeVisible();
  });

  test("invitation expirée puis renvoyée", async ({ page }) => {
    await fresh(page);
    await persona(page, "Sophie Martin");
    await go(page, "/acheteur/offrir?formule=essentiel");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: /^Continuer/ }).click();
    await page.getByRole("button", { name: /remplir avec Madeleine Martin/ }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /^Continuer/ }).click();
    await page.getByLabel(/il s'agit d'une démonstration/).check();
    await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await page.getByRole("button", { name: "Simuler un paiement accepté" }).click();
    await go(page, "/acheteur/cadeaux");
    await page.getByRole("button", { name: "Démo : faire expirer" }).click();
    await expect(page.getByText("L'invitation a expiré")).toBeVisible();
    const oldLink = await page.evaluate(() => JSON.parse(localStorage.getItem("filemoire-prototype")!).state.projects[0].invitation.token);
    await page.getByRole("button", { name: "Envoyer une nouvelle invitation" }).click();
    await go(page, `/invitation/${oldLink}`);
    await expect(page.getByText("Lien d'invitation introuvable")).toBeVisible();
  });

  test("la transcription simulée en échec conserve l'enregistrement", async ({ page }) => {
    await fresh(page, "avance");
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("filemoire-prototype")!);
      raw.state.simFail = true;
      localStorage.setItem("filemoire-prototype", JSON.stringify(raw));
    });
    await page.reload();
    await page.getByRole("button", { name: "Enregistrer un souvenir" }).click();
    await page.getByRole("button", { name: /Utiliser un enregistrement d'exemple/ }).click();
    await expect(page.getByText("La transcription n'a pas abouti")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("audio")).toHaveCount(1);
  });
});

test("toutes les routes s'affichent sans erreur, pour le bon rôle", async ({ page }) => {
  const errors = collectErrors(page);
  await fresh(page, "avance");
  const q = await page.evaluate(() => JSON.parse(localStorage.getItem("filemoire-prototype")!).state.projects[0].questions[7].id);
  const groups: [string, string[]][] = [
    ["Visiteur", ["/", "/comment-ca-marche", "/offres", "/livre-exemple", "/connexion", "/invitation/madeleine-demo", "/ecouter/exemple-rose", "/demo/boite-mail"]],
    ["Sophie Martin", ["/acheteur", "/acheteur/cadeaux", "/acheteur/offrir", "/acheteur/commandes", "/acheteur/suivi"]],
    ["Madeleine Martin", ["/narrateur", "/narrateur/questions", `/narrateur/questions/${q}`, "/narrateur/souvenirs", "/narrateur/photos", "/narrateur/chapitres", "/narrateur/livre", "/narrateur/apercu", "/narrateur/famille", "/narrateur/confidentialite"]],
    ["Thomas Martin", ["/editeur", "/editeur/livres", "/editeur/livres/p_madeleine", "/editeur/relecture"]],
    ["Opérations", ["/admin", "/admin/commandes", "/admin/projets", "/admin/questions", "/admin/impression", "/admin/support"]],
  ];
  for (const [who, routes] of groups) {
    await persona(page, who);
    for (const r of routes) {
      await go(page, r);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByText("Cet espace est réservé")).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
