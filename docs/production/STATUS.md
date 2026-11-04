# Production implementation status

## Current launch work — updated 4 November 2026

**Deployed preview; public commercial launch is not complete.** The canonical
frontend is `https://www.filemoire.fr`, backed by Render and Neon. The origin
correction was deployed on Render as `dep-dbkr7sp9dmos739mldq0`, commit `d0562d6`.
See [VERCEL-RENDER.md](VERCEL-RENDER.md) for the split and historical setup steps.

The owner explicitly chose to retain free preview hosting for now, while keeping
paid gifts and printed books in the intended launch scope. No paid upgrade or
real transaction has been authorized. Website deployment, local tests and a
legal approval flag do not establish approval of the unfinished legal documents.

| Step | Current evidence | What still prevents completion |
| --- | --- | --- |
| 1. Public email | On 4 November, all three DNS records matched on both authoritative servers and a public resolver; Resend domain/records now Verified. Direct `noreply@filemoire.fr` test returned 200 and Delivered; deployed login request returned 202, delivery state sent, and Resend Delivered; see [evidence](RESEND-DNS.md) | Confirm inbox placement and use of the login link; app sender/test-recipient settings were not changed. Change sender and remove test restriction together only after public account approval; test a second consenting recipient and invitations |
| 2. Legal/privacy | Bilingual working draft published | Actual operator details, monitored contact, final terms/retention decisions and owner review; see [LEGAL-DRAFT.md](LEGAL-DRAFT.md) |
| 3. Hosting | Vercel frontend, Render API/worker and Neon already deployed | Owner retained free preview; business launch still needs an eligible commercial frontend plan/host and reliable continuous worker operation |
| 4. Live acceptance | 3 November local checks: 118 unit tests, 97 database integration tests, TypeScript, lint, frontend build/isolation verification, worker build and HTTP-only split cookie/origin/4 MiB upload check passed. On 4 November, after initial timeouts, the public homepage and backend health returned 200, sign-in page loaded, and a login email was delivered | Hosted multi-user email, successful link consumption, roles, media and PDF acceptance remain pending; no new full rendered UI pass is claimed |
| 5. Recovery/monitoring | On 3 November, the existing 28 October snapshot was restored into a temporary network-isolated PostgreSQL 18 container: 22 table counts, four decrypted project payloads and six referenced media hashes passed | Scheduled off-device backups, separate key escrow, deletion reconciliation, live alert ownership and a hosted recovery/rollback drill remain to be configured |
| 6. Paid gifts/printing | Payment and print adapters and local contract tests exist | Stripe business/test/live setup, approved prices/refund terms, named printer and actual supplier integration/preflight/physical proof; current beta launcher deliberately rejects paid-provider settings |

The local `pnpm` launcher could not verify registry signatures because its
registry requests failed. Verification above used the already-installed tool
entry points directly; dependency signatures were not bypassed and no packages
were installed. These results are not a fresh dependency audit.

The backup restore used the production encryption key, kept separately from the
backup. It matches the private production env import, not the distinct staging
key. Keep keys labelled by environment and snapshot compatibility; do not
replace the production key with the staging key. The temporary restore
container was removed after verification; no cloud data was contacted or changed.

## Historical implementation inventory

The dated inventory below describes implementation work from October. It is not
the current provider status, a new dependency audit, or evidence that the real
pilot, supplier acceptance or commercial review has happened. Earlier notes in
[FREE-BETA.md](FREE-BETA.md) and [PUBLIC-LAUNCH.md](PUBLIC-LAUNCH.md) also retain
historical pre-deployment details; the current launch table above supersedes
their deployment status.

Source control is configured for [filmoire/FILEMOIRE](https://github.com/filmoire/FILEMOIRE). The Verify workflow runs on pushes and pull requests; check [GitHub Actions](https://github.com/filmoire/FILEMOIRE/actions/workflows/verify.yml) for the result on the exact revision being released. Repository publication does not deploy the website.

**Local website:** the user selected local operation first. `node scripts/local/start.mjs` now starts the real website, database, SMTP inbox and worker. New accounts can create private personal manuscripts without purchasing a gift; stories, photos, recordings, family permissions, PDF approval and exports use real storage. Personal manuscripts do not create payment records or printed-copy entitlements. Automatic transcription is replaced by an honest manual-entry state when no provider is configured. See [LOCAL-WEBSITE.md](LOCAL-WEBSITE.md). Use the FR / EN header switch for the interface language; see [LANGUAGE.md](LANGUAGE.md).

Working scope: one-time Essentiel/Héritage/Voix purchases; Bilingue/Accompagné quote-only; French/English account workspace; private narrator accounts and invited family editors/contributors. Package entitlements and final commercial terms still need owner confirmation. A separate NestJS/Drizzle application was found at `/Users/zainsubhani/Downloads/filemoire`. The current repository remains the canonical application for this audit and uses Next.js API routes, PostgreSQL and a separate worker. The alternate application is a read-only reference; production data must not be connected until ownership and any intended reconciliation are confirmed.

| # | Step | Implemented and locally checked | Still needed before declaring the step complete |
| --- | --- | --- | --- |
| 1 | Launch scope | Three-plan checkout, quote/support requests, configurable cohort and cut-off gates | Owner approval of prices, audio entitlements, questions, geography, book format and delivery/refund policy |
| 2 | Dependencies | Installed and patched; single pnpm lock; runtime audit clear; reproducible container build; GitHub verification workflow | One unpatched build-only `braces` advisory remains documented; ongoing patch ownership and review of GitHub checks |
| 3 | Prototype defects | Hidden memories now hide their attached photos; arbitrary invited editor identities work; regression tests pass | No outstanding issue from the two reproduced reference defects |
| 4 | Backend/database | Seven migrations, personal manuscript creation, real persistence, transactions, worker queue, encrypted snapshots, isolated integration tests | Hosted database, runtime/migration role setup, capacity validation and any existing-backend reconciliation |
| 5 | Identity/permissions | One-use login links, secure production cookies, server role/visibility checks, revocation, administrator MFA/replay prevention, audited temporary support access | Real email delivery, independent security review, admin recovery and key rotation procedures |
| 6 | Photos/audio | Private storage adapter, encryption, resumable chunk uploads, image decoding/EXIF stripping, restricted audio validation, browser recording and recovery controls | Chosen private bucket, lifecycle/access policy verification, actual mobile devices and network/load tests |
| 7 | Payments | Hosted Stripe checkout adapter, server prices, signed/deduplicated events, stable retries/refunds, payment-versus-print reservation guard | Stripe sandbox/live configuration, end-to-end payment/refund reconciliation, tax/invoice and commercial review |
| 8 | Email/scheduling | Durable retries, invitation renewal/revocation, Paris-time gift scheduling, question/reminder preferences, queued-message rechecks, support requests/replies | SMTP provider/domain authentication, deliverability/abuse testing and continuous worker operation |
| 9 | Transcription | Multipart provider adapter, retries/failure states, original audio retention, narrator correction/approval, contract test | Select/contract the provider; test actual elderly voices, accents, accuracy, latency, cost and privacy terms |
| 10 | Editing/approval | Server autosave, conflict detection, chapters, captions, family suggestions, immutable approved PDF, lock/reopen rules | Editorial sign-off and representative manuscript/device acceptance |
| 11 | Printing/private QR | A5 review PDF, embedded font, photos, pagination and QR; exact approved PDF stored for dispatch; revocable code-protected audio; print-state controls | Actual printer adapter/specification, bleed/spine/colour preflight, physical proof, five accepted books, durable audio hosting commitment |
| 12 | Privacy/lifecycle | Consent records, role-safe export including media, project deletion/cancellation, private file purge, local encrypted backup/restore drill | Reviewed legal documents; account/financial retention workflow; cloud-version purge; independent deletion ledger and backup reconciliation; key migration procedure |
| 13 | Operations/deployment | Nonroot container, worker/migration bundles, GitHub workflow, runbook, health checks, heartbeat, retry and incident controls, launch-evidence checker | Hosted staging/production, live alerts, service ownership, provider-specific restore and rollback drills; successful GitHub checks on every release |
| 14 | Acceptance | Unit, database integration, original demo and real-workspace browser tests; automated axe check and viewport check on narrator flow | Safari/iOS/Android hardware, screen readers, senior-user usability, independent security and realistic load testing |
| 15 | Real pilot | Pilot protocol, empty measurement sheet and explicit evidence checklist | Recruit 30 consenting families, run the pilot, produce/inspect five physical books, resolve defects and obtain owner go-live approval |

## Verification evidence

See `VERIFICATION.md` for exact results and limitations. Provider responses used in integration contract tests are fixtures; no fixture is counted as a real sale, transcription quality study, family or printed book. The project uses real PostgreSQL, real filesystem encryption, real PDF generation and actual browser MediaRecorder bytes in local tests.

Checkout defaults closed. Printing defaults closed and additionally requires supplier/specification approval. `/legal` is explicitly unfinished. Production configuration refuses missing core services and legal approval. Do not change approval switches merely to bypass launch gates.

## Remaining external inputs

- Confirmation of whether the discovered alternate backend has any production role, and approval of the commercial/editorial scope.
- Hosting/domain/database, private object storage, Stripe, SMTP, transcription and printing provider selections and securely configured credentials. Do not paste secret keys into chat.
- Named legal/security/support owners and reviewed customer documents, retention and recovery decisions.
- Consenting pilot participants, physical print orders and acceptance evidence.

## Handoff files

- [Runbook](RUNBOOK.md): local setup, service contracts, deployment, backup and rollback.
- [Security review](SECURITY-REVIEW.md): implemented controls, dependency caveat and unresolved privacy/security work.
- [Pilot plan](PILOT-PLAN.md) and [measurement sheet](pilot-results.csv).
- [Launch evidence template](../../deployment/launch-evidence.example.json) and `pnpm check:readiness <evidence-file>`.
- [Original reference audit](../REFERENCE-AUDIT.md).

At the time of the original October inventory, no public deployment, real
charge/refund, print purchase or pilot recruitment had been performed. Later
preview deployments are recorded in the current status above. The reference
HTML and PPTX in Downloads were left untouched.
