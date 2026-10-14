import { expect, test } from "@playwright/test";
import { go, fresh, persona } from "./helpers";

test("mobile : pas de défilement horizontal et parcours narrateur utilisable", async ({ page }) => {
  await fresh(page, "avance");
  const routes = ["/narrateur", "/narrateur/questions", "/narrateur/livre", "/narrateur/apercu", "/narrateur/photos"];
  for (const r of routes) {
    await go(page, r);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `débordement horizontal sur ${r}`).toBeLessThanOrEqual(1);
  }
  await persona(page, "Visiteur");
  for (const r of ["/", "/offres", "/livre-exemple", "/acheteur/offrir"]) {
    await go(page, r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `débordement horizontal sur ${r}`).toBeLessThanOrEqual(1);
  }
  // Même vérification en anglais (textes plus longs ou plus courts)
  await go(page, "/");
  await page.locator('button[lang="en"]:visible').first().click();
  for (const r of ["/", "/offres", "/acheteur/offrir"]) {
    await go(page, r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `débordement horizontal (EN) sur ${r}`).toBeLessThanOrEqual(1);
  }
  await page.locator('button[lang="fr"]:visible').first().click();
  await go(page, "/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.locator("#menu-mobile").getByRole("link", { name: "Offres" })).toBeVisible();
});
