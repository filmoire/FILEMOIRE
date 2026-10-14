# Filémoire reference audit

Reviewed on 13 October 2026 against the supplied `filemoire-prototype (2).html` and `06_Filemoire_Dossier_Deployement_2026.pptx` (reference files are not included in this repository).

This is the historical prototype audit, before the server implementation. See [the current implementation status](production/STATUS.md) for completed fixes and remaining launch requirements.

**Verdict: the project closely follows the supplied HTML and the deck's intended prototype experience. It does not yet implement the deck's operational MVP.** Two functional defects reproduced in both the supplied HTML and the project should be fixed before broader prototype testing.

This review covers the source code in this directory, rendered browser behavior, and automated checks. The attached documents were treated as reference material. No application source was changed. Dependencies were installed, the two application builds were regenerated, and this report was added.

## Reference comparison

The deck references below use its printed section titles. The supplied PPTX contains 14 slide files, although its footer numbering ends at 15 and the project documentation describes 15 slides.

| Reference requirement | Finding | Evidence |
| --- | --- | --- |
| 03 — Identité: five brand colors, EB Garamond headings, Inter body, italic quotations | Matches. All five specified hexadecimal colors are present; font weights and italic styles are loaded. | `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css` |
| 04 — Site web: slogan, explanatory hero, gift and sample-book actions | Matches the supplied wording and calls to action. | `src/screens/public/home.tsx` |
| 05 / 08 — Product promise and eight-step journey | Gift, invitation, storytelling, photos, chapters, family review, preview, approval, and simulated print tracking are implemented. | `src/screens/`, `src/lib/store.ts`, `e2e/demo.spec.ts` |
| 06 — Questions and editorial journeys | 52 base questions, a 26-question selection, 10 official examples, 10 chapters, and seven themes are present. Unit tests verify question counts and unique selections. Questions still require editorial approval. | `src/lib/catalog.ts`, `src/lib/rules.test.ts` |
| 07 — Catalogue | €99 Essentiel, €179 Héritage, €249 Voix, and the Bilingue / Accompagné price ranges match. Extra copies at €49 and gift boxes at €29 fall within the deck's indicative ranges. | `src/lib/catalog.ts` |
| 07 — Narrator control | Drafts, correction, sharing, hiding, deletion, and narrator approval exist. Hiding a memory does not reliably exclude its attached photos from the book; see finding 1. | `src/lib/store.ts`, `src/lib/rules.ts` |
| 08 / 09 — Buyer, narrator, invited editor, operations | The demo demonstrates separate roles, limited buyer visibility, and temporary operations access. Arbitrary editor invitations fail after acceptance; see finding 2. All authorization remains browser-side. | `src/components/shell/role-shell.tsx`, `src/screens/editor/shared.ts` |
| 09 — Text/audio and photos | Text editing, browser microphone recording, audio import, photo import, captions, order, and quality warnings exist. Transcription is an explicitly labeled placeholder. | `src/components/narrator/recorder.tsx`, `src/components/narrator/photos.tsx`, `src/lib/store.ts` |
| 09 — Book editing and print | Chapters, cover choices, review, preview, approval, and status tracking exist. PDF export uses browser printing; preflight and production are simulated. | `src/components/book/viewer.tsx`, `src/screens/narrator/preview.tsx`, `src/screens/admin/print.tsx` |
| 09 — Private QR audio | A real QR image and a demo listening page exist. Access depends on local browser state; there is no protected shared audio hosting or link-expiry service. | `src/screens/public/listen.tsx`, `src/lib/media.ts` |
| 09 — Contributors and bilingual pilot | Contributor invitations are absent; only one active family editor is supported. Bilingue is a quote request, with no two-language manuscript and human-review workflow. The FR/EN interface switch does not supply that book-production workflow. | `src/lib/store.ts:665`, `src/lib/catalog.ts:63`, `docs/LIMITES.md` |
| 11 / 13 — Christmas deadlines and controlled launch | The FAQ promises future print deadlines, but no actual cut-off is displayed or enforced. Cohort limits and production capacity controls are not implemented. | `src/screens/public/sections.tsx:151`, `src/screens/buyer/gift-wizard.tsx` |
| 03 — Natural family photography | The demo uses labeled SVG illustrations. This matches the supplied HTML but only partially realizes the deck's photography direction. | `public/demo/`, `src/screens/public/home.tsx` |

### Supplied HTML versus the current project

Rendered `/`, `/offres`, `/comment-ca-marche`, and `/livre-exemple` in isolated Chromium sessions using the supplied HTML and the rebuilt project HTML. On these four pages:

- Headings and page wording match, apart from the project's added FR/EN controls.
- Computed heading font families and colors match. Homepage screenshots show the same layout, logo, illustration, and cover composition, with navigation spacing adjusted for the language controls.
- Neither version produced a JavaScript page error or desktop horizontal overflow during these checks.

The files are not byte-identical. The project adds interface localization. This is a targeted rendered comparison, not a pixel-by-pixel certification of every screen. The project's broader routes and workflows were covered by its existing browser tests.

## Reproduced functional findings

### 1. High priority: hiding a memory leaves its photo in the printable book

In the advanced scenario, open the book editor, hide the first memory, then open the preview. The text of memory `m_0` disappears, but its attached photo and caption, “La boulangerie de la rue Jean-Jaurès, vers 1955,” remain in the printable DOM. The same outcome reproduced in the supplied HTML.

`setInBook` changes only the memory flag in [store.ts](../src/lib/store.ts). The narrator branch in [composeBook](../src/lib/rules.ts) includes photos independently of their linked memory's inclusion. Pagination subsequently renders the photo as an otherwise unattached chapter image.

Recommended fix: when a photo is linked to a memory, require that memory to be included in the composed book, including the narrator/print view. Preserve the intended behavior for genuinely unattached chapter photos. Add regression coverage for hiding a memory that has an attached photo.

### 2. Medium priority: a newly invited editor cannot access the book unless they use the fixed demo identity

In the advanced scenario, revoke Thomas, invite fictitious `Camille Dupont <camille@example.test>`, and accept the invitation. The invitation becomes active, but the destination displays “Vous n'avez pas accès à ce livre.” This reproduced in both versions.

The editor session stores only `{ role: "editeur" }`. [shared.ts](../src/screens/editor/shared.ts) and the suggestion action in [store.ts](../src/lib/store.ts) always resolve Thomas Martin's email.

Recommended fix: retain the accepted editor's identity in the session and use it consistently for access checks, labels, and suggestions. Verify the flow with an editor other than Thomas and after revocation/re-invitation.

## Operational MVP gaps

These are explicitly acknowledged prototype limitations, but they prevent this directory from fulfilling the deck's production scope:

- No real authentication, server-enforced access rules, or shared database. Narratives remain in localStorage; imported media remain in IndexedDB, without application-level encryption, backup, or cross-device sharing.
- Payments, transactional email, transcription, preflight, printer submission, shipping, and tracking are simulated.
- QR audio lacks durable hosting and server-enforced access/expiry. A recipient on another device cannot access the narrator's local media through the QR alone.
- Account/content deletion requests produce a support case; they do not execute permanent deletion. Individual memory deletion is a separate implemented action.
- Bilingual manuscript production, contributor roles, Christmas cut-offs, and cohort/capacity controls remain unfinished.

The project deliberately provides recording and simulated transcription in Héritage, while the deck explicitly lists transcription under Voix. This is documented as an assumption in `docs/PLAN.md`, and QR audio remains restricted to Voix. Confirm package entitlements before implementing real billing.

The cover's “Cadeau + abonnement” model is not implemented as recurring billing, and the deck does not specify a billing interval or renewal rules. That commercial detail needs definition before it can be judged as an implementation requirement.

`docs/PRODUCTION.md` mentions a previously delivered NestJS/PostgreSQL/Redis backend. No such backend is present in this directory, and this review does not verify any separate repository, printer contract, operational team, beta cohort, or business-plan outcome.

## Verification performed

Environment: macOS, Node.js 22.20.0, pnpm 10.28.0, Playwright 1.56.0, Chromium 141.0.7390.37.

| Check | Result |
| --- | --- |
| Dependency installation | Passed using `pnpm@10.28.0 install --frozen-lockfile`; 332 packages installed. Dependency versions were not upgraded. |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | 25/25 passed |
| Next.js production build | Passed; 35 static-generation entries completed |
| Standalone HTML build | Passed; approximately 1,335 KiB |
| Full existing browser suite | 24/25 passed on the first run. The French Next.js full journey timed out waiting for microphone recording to start. |
| Isolated rerun of the failed test | Passed without code changes. Treat the initial failure as an intermittent observation; its cause is unconfirmed. |
| Extra targeted checks | Both findings above reproduced in the current standalone HTML and the supplied reference HTML. |

The full run's artifacts are in `playwright-report/` and `test-results/`; the isolated retry used `/tmp/filemoire-microphone-retest` and a console reporter to preserve the original report. The initial run was not a clean 25/25 pass. Real microphone hardware, Safari, Firefox, real senior users, external services, and physical printing were not verified.

Non-blocking build warnings: Next.js reports that its ESLint plugin is absent, and the HTML build reports outdated Browserslist data.

Recommended order: fix the two reproduced prototype defects, agree package and bilingual scope, then connect the operational services and validate the print/QR chain before public launch.
