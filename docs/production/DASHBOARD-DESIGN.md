# Supplied dashboard design implementation — 26 October 2026

The buyer, family editor and operations references in “Dashboard Filémoier final” are implemented in the live application. Reference screenshots and illustrations determine the visual treatment; the embedded demo data and scripts do not determine permissions or commercial policy. The original Downloads files are unchanged.

## Using the screens locally

Run `COREPACK_HOME=/tmp/filemoire-corepack corepack pnpm@10.28.0 dev`, open the URL printed by the launcher (normally http://localhost:3100), and sign in. Local login email appears in Mailpit at http://localhost:8025. Use the workspace selector to switch between your own books, buyer and family editor pages. Operations appears only for configured administrator accounts and requires MFA.

Buyer and editor pages show the supplied illustrated empty states before a purchase or invitation. They never manufacture sample customer data. Actual orders, accepted invitations and shared memories populate the same layouts. The FR/EN switch persists across navigation and reloads without clearing form or recording state.

## What changed

- Shared header, role navigation, footer, page titles, cream/plum/lilac tokens, system fonts, pill controls and responsive layouts. Four supplied illustrations were optimized to WebP.
- Buyer home, gifts, invitation resend/cancel, private progress and persisted order details. The seven-step gift flow covers package, journey, recipient, message, delivery/options, review and checkout, preserves edits on back navigation and language changes, and reuses its checkout idempotency key on retries. Cancellation invalidates pending narrator invitation tokens; acceptance prevents cancellation. A purchased gift remains visible to its buyer when that account also becomes an editor or narrator; reading permissions still follow the separately authorized role.
- Family editor home, shared books and proposal history. History contains the current user's status metadata only while the underlying memory remains shared. Legacy proposals without a stable author ID are intentionally omitted.
- Operations overview, paginated orders/projects/printing/support, filters and retry states. Explicit response allowlists provide buyer/recipient names, package/options, invitation progress and photo-quality counts without exposing story text or media URLs. Support status updates persist with compare-and-set conflict protection; replies remain separate, audited actions. The print queue separates approved books awaiting a narrator's print request from existing print orders, whose actions follow the server's permitted transitions. Opening a support book performs a fresh authorization check, including grants created or expired since login.
- Persisted question-library editing, activation switches, grouped themes, search, revision conflicts and draft/approved state. Approved new questions and activation changes apply to future journeys; existing books retain their question snapshots. Custom editorial text is kept in its entered language.
- Shared app-owned validation and confirmation dialogs, keyboard focus, error recovery and preserved narrator story/audio/photo/book/PDF/export workflows.

Database migrations `008_question_library.sql` and `009_support_progress.sql` are required and have been applied to the local development and isolated test databases. The local launcher applies pending migrations before starting; normal deployments must run the existing migration command before starting this version. Migration 009 adds the support "in progress" status without changing existing records. No new package, paid service or hosting account is required for these design changes.

## Design ownership and evidence

`DESIGN.md` records the reference tokens. `UX-CONTRACT.md` records navigation, permission and state rules. `src/app/dashboard.css` owns the scoped dashboard recipes; existing public and printed-book designs retain their own tokens.

Current evidence is generated under ignored `artifacts/production/design-2026-10-26/`; earlier dashboard checks also write to `design-2026-10-22/`. The new matrix captures 52 images covering 13 buyer/editor/operations views in populated and empty states at desktop and Pixel 7 widths. The always-available base question catalog uses its no-results state for the empty reference. Representative images were visually compared with the supplied references. Automated accessibility checks cover representative dashboards, the question library and gift preparation; this is not a claim of complete WCAG certification or testing on physical mobile devices.

The strict premium static audit reports 35 findings: 17 `Form` usages, 8 `Textarea` usages and 10 `Button asChild` usages. Each was inspected. These are parser false positives: it treats capitalized React components as literal HTML and does not follow their canonical owners. `Form` renders `noValidate` with app validation; `Textarea` supplies `resize-none`; each flagged `Button asChild` renders a real anchor with a destination. Browser checks verify rendered form/textarea properties and exercise the navigation. The raw audit JSON remains available; its exit code is not presented as a clean pass. DESIGN.md lint has zero errors and six advisory warnings about token aliases/references.

## Verification

- TypeScript and ESLint: passed.
- Combined unit/PostgreSQL audit suite: 113 passed across seven files (31 unit tests and 82 database integration tests), including metadata privacy, ownership, dual roles, support conflicts, question activation and approved-book queues.
- Live browser coverage: 32 passed in one final desktop/mobile run. It covers the full design matrix, seven-step gift navigation and validation, a stale checkout-availability response with a real server rejection and retry key, persisted support/question/print actions, permissions, French/English persistence and existing narrator workflows.
- Optimized live Next.js build and worker bundle: verified for this update.
- Local startup after migration: `/api/v1/health` returns `{"status":"ok"}` and the buyer workspace returns HTTP 200 at port 3100.
- Earlier 22 October baseline: demo Next.js build, standalone HTML build and all 25 demo/HTML browser regression cases passed. Those separate demo checks were not rerun for this live-dashboard update.

The live suite uses only `filemoire_test`; it does not reset the development database. Test cleanup releases both the connection pool and its cached reference between spec files. Payment events, print orders and microphone input are local fixtures. Real external checkout, outbound email delivery and physical printing were not exercised. Checkout remains blocked by the existing server configuration until its launch requirements are met.

## Deployment boundary

This change implements the supplied design locally. It does not complete the separate production-launch audit in `STATUS.md`, deploy the website, enable checkout/printing, purchase services or send real customer messages. Existing provider, legal, physical-device and pilot requirements still apply.
