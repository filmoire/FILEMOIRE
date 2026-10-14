import path from "node:path";
import { expect, test } from "@playwright/test";
import { go, collectErrors, fresh, persona } from "./helpers";

const PHOTO = path.join(__dirname, "fixtures", "photo-demo.jpg");

test("parcours de démonstration complet : les 19 étapes de validation", async ({ page }) => {
  const errors = collectErrors(page);
  await fresh(page);

  // 1. Page d'accueil
  await expect(page.getByRole("heading", { level: 1, name: "Une question à la fois, une vie à transmettre." })).toBeVisible();

  // 2. Offres et livre exemple
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Offres" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Choisissez le parcours à offrir" })).toBeVisible();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Livre exemple" }).click();
  await page.getByRole("button", { name: "Page suivante" }).click();
  await expect(page.getByText("Les souvenirs de Rose Delmas")).toBeVisible();

  // 3. Achat simulé (avec une erreur de validation et un refus de paiement)
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Offrir Filémoire" }).click();
  await expect(page).toHaveURL(/\/acheteur\/offrir/);
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await expect(page.getByText("Choisissez une formule.")).toBeVisible();
  await page.getByLabel(/Filémoire Héritage/).check();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.getByRole("button", { name: /^Continuer/ }).click(); // parcours « Une vie en 52 questions »
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await expect(page.getByText("Indiquez le prénom de la personne qui va raconter.")).toBeVisible();
  await page.getByLabel("Son adresse e-mail").fill("pas-un-email");
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await expect(page.getByText(/ne semble pas valide/)).toBeVisible();
  await page.getByRole("button", { name: /remplir avec Madeleine Martin/ }).click();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.getByRole("button", { name: /tu nous as tant raconté/ }).click();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.getByRole("button", { name: /^Continuer/ }).click(); // date : dès aujourd'hui
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await expect(page.getByText("Merci d'accepter les conditions")).toBeVisible();
  await page.getByLabel(/il s'agit d'une démonstration/).check();
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await expect(page.getByText("Aucune carte bancaire n'est demandée")).toBeVisible();
  await expect(page.locator("input[autocomplete^='cc-'], input[name*='card' i]")).toHaveCount(0);
  await page.getByRole("button", { name: "Simuler un refus" }).click();
  await expect(page.getByText("Paiement refusé")).toBeVisible();
  await page.getByRole("button", { name: "Simuler un paiement accepté" }).click();
  await expect(page.getByRole("heading", { name: "Merci, votre cadeau est prêt" })).toBeVisible();

  // 4. Invitation envoyée
  await expect(page.getByText("L'invitation a été envoyée à Madeleine")).toBeVisible();

  // 5-6. Boîte e-mail simulée → invitation → acceptation (bascule vers le rôle narrateur)
  await page.getByRole("link", { name: "Ouvrir la boîte e-mail" }).click();
  await page.getByRole("button", { name: /Sophie Martin vous offre Filémoire/ }).click();
  await page.getByRole("link", { name: "Ouvrir mon invitation" }).click();
  await page.getByRole("button", { name: "Accepter l'invitation" }).click();
  await expect(page).toHaveURL(/\/narrateur\/bienvenue/);

  // 7. Confidentialité
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Commencer mon livre" }).click();
  await expect(page.getByText("Cochez la case pour confirmer")).toBeVisible();
  await page.getByLabel(/mes réponses restent privées/).check();
  await page.getByRole("button", { name: "Commencer mon livre" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Madeleine, votre histoire continue/ })).toBeVisible();

  // 8. Répondre à une question (+ partager avec l'éditeur)
  await page.getByRole("button", { name: "Écrire ma réponse" }).click();
  await page.locator("#answer").fill("La boulangerie de mes parents, à Douarnenez.\n\nLe four chauffait toute la maison.");
  await page.getByRole("button", { name: "Enregistrer ma réponse" }).click();
  await expect(page.getByText("Votre réponse est enregistrée")).toBeVisible();
  await page.getByLabel("Moi et mon éditeur familial").check();

  // 9. Souvenir vocal (vrai MediaRecorder sur micro simulé par Chromium) + transcription simulée relue
  await page.getByRole("tab", { name: /À voix haute/ }).click();
  await page.getByRole("button", { name: "Enregistrer ma voix" }).click();
  await expect(page.getByText(/Enregistrement en cours/)).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Arrêter" }).click();
  await page.getByRole("button", { name: "Garder cet enregistrement" }).click();
  await expect(page.getByText("Ce texte n'est pas votre récit")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("button", { name: "Valider ce texte" })).toBeDisabled();
  await page.locator("textarea[id^='tr-']").fill("Le dimanche, on allait voir les bateaux rentrer au port.");
  await page.getByRole("button", { name: "Valider ce texte" }).click();
  await expect(page.getByText("Relue et validée")).toBeVisible();

  // 10. Photo
  await page.getByLabel("Choisir des photos").setInputFiles(PHOTO);
  await expect(page.getByText("1 photo ajoutée")).toBeVisible();

  // Deuxième souvenir (il sera masqué à l'étape 15)
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Accueil" }).click();
  await page.getByRole("button", { name: "Recevoir la question suivante maintenant" }).click();
  await page.locator("#answer").fill("Un souvenir que je préfère garder pour moi.");
  await page.getByRole("button", { name: "Enregistrer ma réponse" }).click();
  await expect(page.getByText("Votre réponse est enregistrée")).toBeVisible();

  // 11. Progression
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Questions" }).click();
  await expect(page.getByText(/2 racontées/)).toBeVisible();

  // 12. Éditeur de livre
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Mon livre" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Éditeur de livre" })).toBeVisible();

  // 13. Inviter un éditeur familial, qui accepte
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Famille" }).click();
  await page.getByRole("button", { name: /Démo : Thomas Martin/ }).click();
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  await page.getByRole("link", { name: /ouvrir son invitation/ }).click();
  await page.getByRole("button", { name: "Accepter l'invitation" }).click();
  await expect(page.getByRole("heading", { name: "Le livre de Madeleine" })).toBeVisible();

  // L'éditeur ne voit que le souvenir partagé
  await expect(page.getByText("Le four chauffait toute la maison.")).toBeVisible();
  await expect(page.getByText("Un souvenir que je préfère garder pour moi.")).toHaveCount(0);

  // 14. Proposer une correction, puis l'accepter côté narratrice
  await page.getByRole("button", { name: "Proposer une correction" }).click();
  await page.locator("#sg-after").fill("La boulangerie de mes parents, rue Jean-Jaurès, à Douarnenez.\n\nLe four chauffait toute la maison.");
  await page.locator("#sg-note").fill("J'ai ajouté le nom de la rue.");
  await page.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(page.getByText("Proposition envoyée")).toBeVisible();
  await persona(page, "Madeleine Martin");
  await page.getByRole("link", { name: "Les examiner" }).click();
  await page.getByRole("button", { name: "Accepter" }).click();
  await expect(page.getByText("Modification acceptée")).toBeVisible();
  await expect(page.getByText("rue Jean-Jaurès, à Douarnenez").first()).toBeVisible();

  // 15. Masquer un souvenir privé
  await page.getByRole("button", { name: "Masquer du livre" }).nth(1).click();
  await expect(page.getByText("Souvenir masqué du livre")).toBeVisible();

  // 16. Aperçu
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Aperçu" }).click();
  await page.getByLabel("Aller à").selectOption({ label: "Chapitre 1 — Origines" });
  const book = page.locator("[aria-roledescription='livre']");
  await expect(book.getByText("rue Jean-Jaurès, à Douarnenez")).toBeVisible();
  await expect(page.getByText("Un souvenir que je préfère garder pour moi.")).toHaveCount(0);
  await page.screenshot({ path: "test-results/apercu.png" });

  // 17. Validation par la narratrice
  await page.getByRole("button", { name: "Je valide mon livre" }).click();
  await expect(page.getByText("Indiquez l'adresse (numéro et rue).")).toBeVisible();
  await page.locator("#ad-line1").fill("3 rue Fictive");
  await page.locator("#ad-cp").fill("29100");
  await page.locator("#ad-city").fill("Douarnenez");
  await page.getByLabel(/J'ai relu mon livre/).check();
  await page.getByLabel(/le livre est verrouillé/).check();
  await page.getByRole("button", { name: "Je valide mon livre" }).click();
  await expect(page.getByText(/Vous avez validé votre livre le/)).toBeVisible();

  // 18. Commande d'impression simulée
  await page.getByRole("button", { name: "Commander l'impression (simulation)" }).click();
  await expect(page.getByText("Livre validé et transmis à l'équipe Filémoire")).toBeVisible();

  // 19. Suivi : Opérations (préflight obligatoire) puis acheteuse
  await persona(page, "Opérations");
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Impression" }).click();
  const row = page.getByRole("row", { name: /Le livre de Madeleine/ });
  await row.getByRole("button", { name: "Envoyer à l'impression" }).click();
  // Règle : pas d'impression sans préflight (le statut ne bouge pas, un message l'explique)
  await expect(row).toContainText("Préparation impression");
  await expect(row).toContainText("Préflight à lancer");
  await row.getByRole("button", { name: "Préflight" }).click();
  await expect(page.getByText("Préflight simulé")).toBeVisible();
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Envoyer à l'impression" }).click();
  await persona(page, "Sophie Martin");
  await page.getByRole("navigation", { name: "Navigation de l'espace" }).getByRole("link", { name: "Suivi" }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("En impression");
  await expect(page.getByText("Le four chauffait toute la maison.")).toHaveCount(0); // partagé avec l'éditeur, pas avec la famille

  await expect(page.getByRole("button", { name: /Guide de démo · 19\/19/ })).toBeVisible();
  expect(errors).toEqual([]);
});
