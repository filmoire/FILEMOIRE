# Supplied dashboard design implementation — 22 October 2026

The buyer, family editor and operations references in “Dashboard Filémoier final” are implemented in the live application. Reference screenshots and illustrations determine the visual treatment; the embedded demo data and scripts do not determine permissions or commercial policy. The original Downloads files are unchanged.

## Using the screens locally

Run `COREPACK_HOME=/tmp/filemoire-corepack corepack pnpm@10.28.0 dev`, open the URL printed by the launcher (normally http://localhost:3100), and sign in. Local login email appears in Mailpit at http://localhost:8025. Use the workspace selector to switch between your own books, buyer and family editor pages. Operations appears only for configured administrator accounts and requires MFA.

Buyer and editor pages show the supplied illustrated empty states before a purchase or invitation. They never manufacture sample customer data. Actual orders, accepted invitations and shared memories populate the same layouts. The FR/EN switch persists across navigation and reloads without clearing form or recording state.

## What changed

- Shared header, role navigation, footer, page titles, cream/plum/lilac tokens, system fonts, pill controls and responsive layouts. Four supplied illustrations were optimized to WebP.
- Buyer home, gifts, invitation resend/cancel, private progress, order details and gift preparation. Cancellation invalidates pending narrator invitation tokens; acceptance prevents cancellation.
- Family editor home, shared books and proposal history. History contains the current user's status metadata only while the underlying memory remains shared. Legacy proposals without a stable author ID are intentionally omitted.
- Operations overview, paginated orders/projects/printing/support, filters and retry states. Project listings expose operational metadata. Opening a support book performs a fresh authorization check, including grants created or expired since login.
- Persisted question-library editing with revision conflicts and draft/approved state. Approved new questions apply to future journeys; existing books retain their question snapshots. Custom editorial text is kept in its entered language.
- Shared app-owned validation and confirmation dialogs, keyboard focus, error recovery and preserved narrator story/audio/photo/book/PDF/export workflows.

Database migration `008_question_library.sql` is required and was applied to the local development and isolated test databases. Normal deployments must run the existing migration command before starting this version. No new package, paid service or hosting account is required for these design changes.

## Design ownership and evidence

`DESIGN.md` records the reference tokens. `UX-CONTRACT.md` records navigation, permission and state rules. `src/app/dashboard.css` owns the scoped dashboard recipes; existing public and printed-book designs retain their own tokens.

Browser screenshots are generated under ignored `artifacts/production/design-2026-10-22/`. Desktop and Pixel 7 viewport images were visually compared with the supplied buyer/editor/operations references. Automated accessibility checks cover representative populated and empty dashboards, the question library and gift preparation; this is not a claim of complete WCAG certification or testing on physical mobile devices.

The strict premium static audit reports 35 findings: 17 `Form` usages, 8 `Textarea` usages and 10 `Button asChild` usages. Each was inspected. These are parser false positives: it treats capitalized React components as literal HTML and does not follow their canonical owners. `Form` renders `noValidate` with app validation; `Textarea` supplies `resize-none`; each flagged `Button asChild` renders a real anchor with a destination. Browser checks verify rendered form/textarea properties and exercise the navigation. The raw audit JSON remains available; its exit code is not presented as a clean pass. DESIGN.md lint has zero errors and six advisory warnings about token aliases/references.

## Verification

- TypeScript and ESLint: passed.
- Combined unit/PostgreSQL audit suite: 108 passed across seven files (31 unit tests and 77 database integration tests). The standalone unit command also passed.
- Live browser coverage: all 22 desktop/mobile cases verified. The final broad run passed 20 cases; the two cover-title cases passed on targeted rerun after scoping an assertion to the preview. Both empty-state cases were also rerun with keyboard opening/closing of the native workspace selector.
- Optimized live and demo Next.js builds, standalone HTML build, and worker bundle: passed.
- Original demo/HTML browser regression suite: 25 passed, including French/English journeys and desktop/mobile layouts.

The live suite uses only `filemoire_test`; it does not reset the development database. Test cleanup now releases both the connection pool and its cached reference between spec files. Its fake payment events and microphone are fixtures, not real purchases or recordings from people.

## Deployment boundary

This change implements the supplied design locally. It does not complete the separate production-launch audit in `STATUS.md`, deploy the website, enable checkout/printing, purchase services or send real customer messages. Existing provider, legal, physical-device and pilot requirements still apply.
