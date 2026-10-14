import { expect, test, type Page } from "@playwright/test";

/** Navigue vers une route, en Next.js (/chemin) ou dans la version HTML autonome (#/chemin). */
export async function go(page: Page, p: string) {
  if (test.info().project.name.startsWith("html")) await page.goto(`/filemoire-prototype.html#${p}`);
  else await page.goto(p);
}

/** Ouvre le site sur un état de démonstration propre (localStorage vidé). */
export async function fresh(page: Page, scenario: "complet" | "avance" = "complet") {
  await go(page, "/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  if (scenario === "avance") {
    await page.getByRole("button", { name: "Réglages de la démonstration" }).click();
    await page.getByRole("button", { name: /Projet avancé/ }).click();
    await page.getByRole("button", { name: "Oui, réinitialiser" }).click();
    await expect(page).toHaveURL(/\/narrateur$/);
  }
}

export async function persona(page: Page, label: RegExp | string) {
  const select = page.locator("#persona");
  const options = await select.locator("option").allTextContents();
  const match = options.find((o) => (typeof label === "string" ? o.includes(label) : label.test(o)));
  if (!match) throw new Error(`Rôle introuvable : ${label} parmi ${options.join(", ")}`);
  await select.selectOption({ label: match });
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.googleapis|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}
