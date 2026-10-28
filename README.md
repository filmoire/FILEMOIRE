# Filémoire — application locale

L’application fonctionne avec de vrais comptes, une base PostgreSQL et des fichiers privés. Vous pouvez créer un manuscrit personnel sans paiement, écrire vos souvenirs, joindre des photos et des enregistrements, inviter un proche, relire votre livre et télécharger son PDF.

## Démarrer le site réel

Prérequis : Node.js 22.12 ou ultérieur dans la branche 22, Docker Desktop démarré et FFmpeg.

```bash
git clone https://github.com/filmoire/FILEMOIRE.git
cd FILEMOIRE
corepack pnpm@10.28.0 install --frozen-lockfile
node scripts/local/start.mjs
```

Ouvrez **http://localhost:3100** (le terminal affiche un autre port si celui-ci est occupé). Cliquez sur **Commencer mon histoire**, saisissez une adresse e-mail, puis ouvrez le lien reçu dans la **boîte locale http://localhost:8025**. Créez votre premier livre depuis votre espace.

Le démarrage lance PostgreSQL, la boîte e-mail, les migrations, le site et le worker. `Ctrl+C` arrête le site et le worker. Les livres restent dans le volume Docker `<nom-du-projet>_db_data` (par exemple `filemoire_db_data` pour ce clone) et les médias dans `.private-media/`. La clé de chiffrement est conservée dans `.env.filemoire.local` : sauvegardez-la avec vos données, sans la publier ni la remplacer. Ce fichier ne change pas la configuration de la démo.

Tous les messages restent dans la boîte locale. Les paiements et l’impression sont désactivés ; la transcription est manuelle. Le site écoute uniquement sur votre ordinateur. Pour arrêter aussi PostgreSQL et la messagerie sans effacer les livres : `docker compose -f compose.dev.yml stop`.

Pour les démarrages suivants, exécutez `node scripts/local/start.mjs` depuis le dossier du projet. `pnpm dev` et `pnpm dev:local` sont des raccourcis équivalents.

Voir le [guide local](docs/production/LOCAL-WEBSITE.md), le [runbook](docs/production/RUNBOOK.md) et [les étapes restant avant un lancement public](docs/production/STATUS.md).

La [check-list de déploiement public du 27 octobre](docs/production/PUBLIC-LAUNCH.md) distingue les services gratuits déjà préparés, les vérifications restantes et les limites de l’hébergement gratuit. Les [résultats des tests locaux par rôle](docs/production/LOCAL-QA-2026-10-27.md) sont également disponibles.

Le [guide Neon](docs/production/NEON-SETUP.md) décrit le projet cloud `filemoire-production`, ses fichiers privés et les commandes de vérification. Cette configuration utilise http://localhost:3200 et reste distincte du site entièrement local sur le port 3100.

## Démonstration historique

Les instructions suivantes concernent la démo isolée, conservée pour les présentations.

Prototype cliquable de bout en bout de Filémoire : achat d'un cadeau, invitation, récit guidé (texte, voix, photos), éditeur de livre, relecture familiale, aperçu, validation et impression **simulée**.

Il existe en **deux versions, issues du même code source** :

| Version | Pour quoi faire | Comment l'ouvrir |
|---|---|---|
| **Application Next.js** | Base de travail pour l'équipe de développement | `pnpm dev:demo` puis http://localhost:3000 |
| **Fichier HTML autonome** | Présentation aux parties prenantes, sans installation | Double-clic sur `dist\filemoire-prototype.html` |

L'interface est **bilingue français / anglais** : bouton **FR | EN** en haut à droite de chaque page (le français reste la langue par défaut).

**Important.** Toutes les personnes, commandes et histoires sont fictives. Paiement, e-mails, transcription, préflight, impression et transport sont simulés et signalés comme tels à l'écran. Les données restent dans le navigateur (localStorage et IndexedDB) : **ne saisissez aucune donnée réelle**.

---

## 1. Installation sous Windows (PowerShell)

### 1.1 Prérequis (une seule fois)

1. Installez **Node.js 22 LTS** depuis https://nodejs.org (choisissez « LTS », gardez les options par défaut).
2. Ouvrez **PowerShell** (menu Démarrer → tapez « PowerShell »).
3. Vérifiez Node.js :

   ```powershell
   node -v
   ```

   Résultat attendu : `v22.x.x`, à partir de `v22.12.0`.
4. Activez pnpm (fourni avec Node.js via Corepack) :

   ```powershell
   corepack enable
   corepack prepare pnpm@10.28.0 --activate
   pnpm -v
   ```

   Résultat attendu : `10.28.0`.

   Si PowerShell répond « l'exécution de scripts est désactivée sur ce système », exécutez une fois :

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```

   puis répondez `O` (Oui), et relancez la commande `pnpm -v`.

### 1.2 Récupérer le projet

Si vous avez reçu `filemoire-prototype.zip` sur votre Bureau :

```powershell
cd "$env:USERPROFILE\Desktop"
Expand-Archive -Path .\filemoire-prototype.zip -DestinationPath . -Force
cd .\filemoire-prototype
```

Résultat attendu : la commande `dir` affiche notamment `package.json`, `src`, `docs`, `README.md`.

### 1.3 Installer les dépendances

```powershell
pnpm install
```

Résultat attendu (1 à 3 minutes) : la commande se termine par `Done in …s`. Un avertissement « Ignored build scripts » peut apparaître : il est sans conséquence.

### 1.4 Lancer le prototype (mode développement)

```powershell
pnpm dev:demo
```

Résultat attendu : `▲ Next.js 15.5.27` puis `✓ Ready in …`. Ouvrez **http://localhost:3000** dans Chrome ou Edge. Pour arrêter : `Ctrl + C` dans PowerShell.

Le port 3000 est déjà utilisé ? Lancez sur un autre port :

```powershell
pnpm exec next dev -p 3001
```

### 1.5 Lancer la version de production (plus rapide)

```powershell
pnpm build
pnpm start
```

Résultat attendu : `pnpm build` se termine par la liste des 35 routes, puis `pnpm start` affiche `✓ Ready`. Ouvrez http://localhost:3000.

### 1.6 Générer le fichier HTML autonome

```powershell
pnpm build:html
```

Résultat attendu : `dist/filemoire-prototype.html — 1334 Ko` (environ). Ouvrez-le par double-clic dans l'Explorateur (`dist\filemoire-prototype.html`), ou :

```powershell
start .\dist\filemoire-prototype.html
```

Ce fichier contient tout (styles, scripts, logo, illustrations, son d'exemple). Seules les polices EB Garamond et Inter sont chargées depuis Google Fonts. Hors connexion, des polices de remplacement s'affichent.

---

## 2. Faire la démonstration

Une **barre de démonstration** (bandeau prune en haut) est présente sur toutes les pages.

- **Vous êtes** : change de rôle — Visiteur, Sophie Martin (acheteuse), Madeleine Martin (narratrice, une fois l'invitation acceptée), Thomas Martin (éditeur familial), Équipe Filémoire (Opérations).
- **+1 semaine** : avance l'horloge de démonstration (invitations programmées, nouvelles questions, rappels doux).
- **E-mails** : boîte de réception simulée (invitations, confirmations, rappels). Les liens des e-mails fonctionnent.
- **Guide** : les 19 étapes de la démonstration, cochées automatiquement, avec un bouton « Aller à l'étape ».
- **Démo** : choisir le scénario de départ.
  - **Parcours complet** (par défaut) : rien n'est acheté. Suivez le guide de l'étape 1 à 19.
  - **Projet avancé** : Madeleine a 8 semaines de souvenirs (réponses, brouillon, question passée, enregistrement, photos, suggestions de Thomas, souvenir masqué).

Parcours conseillé : ouvrez le **Guide** et cliquez sur la flèche de chaque étape.

### Langue (FR / EN)

- Le bouton **FR | EN** (en-tête de chaque page) change toute l'interface : écrans, messages, e-mails simulés, statuts, questions, livre exemple, dates et montants (`13 octobre 2026` / `13 October 2026`, `179,00 €` / `€179.00`). Le choix est mémorisé dans le navigateur.
- Pour une démonstration en anglais avec des histoires en anglais : cliquez sur **EN**, puis **Demo → Advanced project (8 weeks)**. Les données de démonstration sont créées dans la langue active au moment de la réinitialisation ; comme de vraies données, elles ne changent plus de langue ensuite.
- Ce que la personne saisit elle-même (réponses, légendes, messages) n'est jamais traduit.

---

## 3. Vérifier la qualité (tests)

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

Résultat attendu : aucune erreur pour `typecheck` et `lint`, et `Tests 28 passed (28)` pour les tests unitaires.

Tests de bout en bout (Playwright, Chromium) — la première fois, installez le navigateur de test :

```powershell
pnpm exec playwright install chromium
pnpm build
pnpm build:html
pnpm test:e2e
```

Résultat attendu : `25 passed`. Les 25 tests se répartissent ainsi :

- 13 tests sur l'application Next.js (dont 1 en format mobile et 3 en anglais) ;
- 12 tests sur le fichier HTML autonome (dont 1 en format mobile et 3 en anglais).

Si vous modifiez `tsconfig.json`, supprimez le cache de compilation avant de reconstruire :

```powershell
Remove-Item -Recurse -Force .next
pnpm build
```

Le détail des tests et des résultats réellement obtenus est dans [docs/TESTS.md](docs/TESTS.md).

---

## 4. Organisation du code

```
src/
  app/                 Routes Next.js (App Router) : chaque page affiche un écran de src/screens
  screens/             Écrans par rôle : public, buyer (acheteur), narrator, editor, admin
  components/
    ui/                Composants de base (style shadcn/ui, Radix) : boutons, champs, dialogues…
    shell/             Barre de démo, en-têtes, garde d'accès par rôle, guide
    book/              Couverture, aperçu paginé du livre, version imprimable
    narrator/          Enregistreur vocal, transcription, photos, suggestions
  lib/
    types.ts           Modèle de données
    catalog.ts         Offres, parcours, chapitres, 52 questions + questions thématiques
    rules.ts           Règles métier pures (progression, droits de lecture, pagination, check-lists)
    store.ts           État de la démonstration (Zustand + localStorage) et toutes les actions
    seed.ts, sample.ts Données fictives (famille Martin, livre exemple de Rose)
    media.ts           Photos et enregistrements dans IndexedDB
    nav.tsx            Navigation (Next.js) — remplacée par src/html/nav.tsx dans la version HTML
  i18n/
    core.ts            Traduction FR → EN (texte français = clé, modèles à trous « {0} »)
    en.ts              Dictionnaire anglais (≈ 1 900 entrées)
    jsx-runtime.ts     Runtime JSX qui traduit les textes au rendu (aucun appel t() dans les écrans)
    lang.ts            Langue choisie (mémorisée dans le navigateur)
  html/                Entrée et routeur par hash de la version HTML autonome
scripts/build-html.mjs Construction du fichier HTML unique
scripts/i18n-*.mjs     Extraction des textes français et mise à jour du dictionnaire anglais
e2e/                   Tests Playwright
docs/                  Plan, check-list, limites, recommandations de production, tests
```

Technologies : Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, composants de style shadcn/ui (Radix), Lucide, React Hook Form + Zod, Zustand, IndexedDB (idb-keyval), MediaRecorder, QR codes (`qrcode`), Vitest, Playwright.

## 5. Ajouter ou modifier un texte (traduction)

Le français est la langue source : écrivez vos textes en français dans le code, comme d'habitude. Ensuite :

```powershell
pnpm i18n:extract
```

Résultat attendu : `… — 0 sans traduction anglaise`. Si le nombre est supérieur à 0, la liste est dans `.i18n\todo.json` : ajoutez chaque texte et sa traduction dans `src\i18n\en.ts` (voir le glossaire [docs/I18N-GLOSSAIRE.md](docs/I18N-GLOSSAIRE.md)). Les parties variables s'écrivent `{0}`, `{1}` : par exemple `"Bonjour {0}": "Hello {0}"`.

Contrôle final : le test `e2e/en.spec.ts` parcourt toutes les pages en anglais et échoue s'il reste un texte français.

## 6. Documentation

- [docs/production/DASHBOARD-DESIGN.md](docs/production/DASHBOARD-DESIGN.md) — nouveaux tableaux de bord acheteur, éditeur et opérations, d’après les maquettes fournies.
- [docs/PLAN.md](docs/PLAN.md) — vue produit, rôles, inventaire des écrans, exigences documentées / proposées / futures, hypothèses.
- [docs/CHECKLIST.md](docs/CHECKLIST.md) — liste des fonctionnalités et des 19 critères de réussite, avec leur statut.
- [docs/LIMITES.md](docs/LIMITES.md) — ce qui est simulé et les limites connues.
- [docs/PRODUCTION.md](docs/PRODUCTION.md) — recommandations pour la version de production.
- [docs/TESTS.md](docs/TESTS.md) — tests et résultats.
