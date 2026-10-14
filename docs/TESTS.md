# Tests — résultats réels

Dernière exécution : 13/10/2026 — Node v22.22.0, pnpm 10.28.0, Chromium (Playwright 1.56), Linux. Journal brut : [verification.log](verification.log).

| Vérification | Commande | Résultat |
|---|---|---|
| Typage TypeScript | `pnpm typecheck` | ✅ 0 erreur |
| Lint ESLint | `pnpm lint` | ✅ 0 erreur |
| Tests unitaires (règles métier + traduction) | `pnpm test` | ✅ **25 / 25** |
| Build de production Next.js | `pnpm build` | ✅ 35 routes |
| Build du fichier HTML autonome | `pnpm build:html` | ✅ `dist/filemoire-prototype.html` (~1,3 Mo) |
| Tests de bout en bout | `pnpm test:e2e` | ✅ **25 / 25** (13 Next.js + 12 HTML autonome, dont 6 en anglais) |

## Tests unitaires (`src/lib/rules.test.ts`)

- Bibliothèque : 52 questions de base, 10 exemples du dossier, 26 pour le parcours court ; chaque thème donne 26 et 52 questions sans doublon.
- Progression : une question passée n'est jamais comptée comme répondue ; la cadence débloque une question par semaine ; les questions reportées reviennent.
- Confidentialité : l'acheteur ne lit que « famille » ; l'éditeur lit le partagé mais jamais le masqué ni le brouillon ; un éditeur révoqué perd l'accès ; les Opérations ne lisent qu'avec une autorisation temporaire non expirée ; le masqué est exclu du livre ; les photos suivent la visibilité de leur souvenir.
- Livre : pagination (couverture, dédicace, sommaire, fin) ; suggestion acceptée avec historique ; check-list d'impression bloquante.
- Création de projet : invitation programmée à la date choisie, calendrier démarré à l'acceptation.
- Traduction (`src/i18n/core.test.ts`) : identité en français, textes exacts, modèles à trous avec valeur capturée traduite, pas de double traduction, données de démo créées en anglais sans toucher aux identifiants.

## Tests de bout en bout (`e2e/`)

Chaque scénario est exécuté sur l'application Next.js **et** sur le fichier HTML autonome.

| Test | Ce qui est vérifié |
|---|---|
| `demo.spec.ts` — les 19 étapes | Parcours complet du brief §21, y compris : erreurs de formulaire, refus de paiement puis acceptation, absence de champ carte bancaire, enregistrement **MediaRecorder réel** (micro simulé par Chromium), transcription simulée non validable tant qu'elle n'est pas réécrite, import de photo, éditeur qui ne voit pas le souvenir privé, suggestion acceptée, souvenir masqué absent de l'aperçu, adresse obligatoire, préflight obligatoire avant impression, suivi côté acheteuse, guide 19/19, **aucune erreur console** |
| `rules.spec.ts` — confidentialité | Acheteuse limitée au partagé « famille » ; révocation immédiate de l'éditeur ; lecture Opérations refusée puis autorisée temporairement ; garde d'accès pour un visiteur ; invitation expirée puis renvoyée (ancien lien invalide) ; échec de transcription avec enregistrement conservé |
| `rules.spec.ts` — routes | Les 33 routes s'affichent pour le bon rôle, sans erreur |
| `mic.spec.ts` | Micro indisponible : message clair et repli « enregistrement d'exemple » (Next.js) |
| `mobile.spec.ts` | Format mobile (Pixel 7) : aucun défilement horizontal sur 9 pages en français et 3 en anglais, menu mobile |
| `en-flow.spec.ts` | Les 19 étapes entièrement **en anglais** (libellés anglais), puis contrôle qu'aucun texte français n'est resté affiché |
| `en.spec.ts` | Toutes les routes de chaque rôle, les questions, le livre page par page, les notifications, les e-mails et le guide en anglais : **0 texte non traduit** ; données de démo créées en anglais ; retour au français |

## Non testé

- Navigateurs autres que Chromium (Firefox, Safari, iOS).
- Vraie voix humaine au micro ; lecteurs d'écran réels ; tests avec des utilisateurs seniors.
- Aucun service externe (il n'y en a pas : tout est simulé).
