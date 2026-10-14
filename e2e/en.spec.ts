import { expect, test } from "@playwright/test";
import { collectErrors, fresh, go as goRaw } from "./helpers";
import { missingCollector } from "./i18n-helpers";

const ROUTES: [string, string[]][] = [
  ["visiteur", ["/", "/comment-ca-marche", "/offres", "/livre-exemple", "/connexion", "/invitation/madeleine-demo", "/ecouter/exemple-rose", "/demo/boite-mail"]],
  ["acheteur", ["/acheteur", "/acheteur/cadeaux", "/acheteur/offrir", "/acheteur/commandes", "/acheteur/suivi"]],
  ["narrateur:p_madeleine", ["/narrateur", "/narrateur/questions", "/narrateur/souvenirs", "/narrateur/photos", "/narrateur/chapitres", "/narrateur/livre", "/narrateur/apercu", "/narrateur/famille", "/narrateur/confidentialite"]],
  ["editeur", ["/editeur", "/editeur/livres", "/editeur/livres/p_madeleine", "/editeur/relecture"]],
  ["ops", ["/admin", "/admin/commandes", "/admin/projets", "/admin/questions", "/admin/impression", "/admin/support"]],
];

test("anglais : toutes les pages sont traduites", async ({ page }) => {
  const mc = missingCollector(page);
  const go = async (p: typeof page, path: string) => {
    await mc.grab();
    await goRaw(p, path);
  };
  const errors = collectErrors(page);
  await fresh(page, "avance");
  await page.locator('button[lang="en"]:visible').first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  for (const [persona, routes] of ROUTES) {
    await page.locator("#persona").selectOption(persona);
    for (const r of routes) {
      await go(page, r);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  }
  // Questions, e-mails, notifications, guide et un aperçu complet du livre
  await page.locator("#persona").selectOption("narrateur:p_madeleine");
  const qids = await page.evaluate(() => JSON.parse(localStorage.getItem("filemoire-prototype")!).state.projects[0].questions.slice(0, 9).map((q: { id: string }) => q.id));
  for (const q of qids) await go(page, `/narrateur/questions/${q}`);
  await go(page, "/narrateur/apercu");
  const next = page.getByRole("button", { name: "Next page" });
  while (await next.isEnabled()) await next.click();
  await page.locator("header").getByRole("button", { name: /Notifications/ }).click();
  await page.keyboard.press("Escape");
  await go(page, "/demo/boite-mail");
  const mails = page.locator("main ul li button");
  for (let i = 0; i < (await mails.count()); i++) await mails.nth(i).click();
  await page.getByRole("button", { name: /Demo guide/ }).click();

  const missing = await mc.result();
  expect(missing, missing.join("\n")).toEqual([]);
  // Retour au français : la préférence est mémorisée
  await page.locator('button[lang="fr"]:visible').first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  expect(errors).toEqual([]);
});

test("anglais : la démo réinitialisée en anglais crée ses données en anglais", async ({ page }) => {
  const mc = missingCollector(page);
  const go = async (p: typeof page, path: string) => {
    await mc.grab();
    await goRaw(p, path);
  };
  await fresh(page);
  await page.locator('button[lang="en"]:visible').first().click();
  await page.getByRole("button", { name: "Demo settings" }).click();
  await page.getByRole("button", { name: /Advanced project/ }).click();
  await page.getByRole("button", { name: "Yes, reset" }).click();
  await expect(page).toHaveURL(/\/narrateur$/);
  await go(page, "/narrateur/apercu");
  await expect(page.locator("#cv-title")).toHaveValue("Madeleine, Page by Page");
  await go(page, "/narrateur/souvenirs");
  await expect(page.getByText(/my parents’ bakery|my parents' bakery/i).first()).toBeVisible();
  const missing = await mc.result();
  expect(missing, missing.join("\n")).toEqual([]);
  // Retour au français : l'interface change, les données créées en anglais restent en anglais
  await page.locator('button[lang="fr"]:visible').first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Tout ce que vous avez raconté" })).toBeVisible();
});
