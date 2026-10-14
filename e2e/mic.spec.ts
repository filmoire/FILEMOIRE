import { expect, test } from "@playwright/test";
import { go, fresh } from "./helpers";

// Navigateur SANS micro simulé : getUserMedia échoue (refus ou absence de périphérique).
test.use({ launchOptions: { args: [] }, permissions: [] });

test("micro refusé : message clair et solution de repli", async ({ page }) => {
  await fresh(page, "avance");
  await page.getByRole("button", { name: "Enregistrer un souvenir" }).click();
  await page.getByRole("button", { name: "Enregistrer ma voix" }).click();
  await expect(page.getByText(/Le micro n'est pas autorisé|Aucun micro détecté|L'enregistrement n'a pas pu démarrer/)).toBeVisible();
  await page.getByRole("button", { name: "Utiliser un enregistrement d'exemple" }).click();
  await expect(page.getByText("Enregistrement d'exemple ajouté")).toBeVisible();
});
