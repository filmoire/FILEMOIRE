# Production implementation status

## Current launch work — updated 4 November 2026

**Deployed preview; public commercial launch is not complete.** The canonical
frontend is `https://www.filemoire.fr`, backed by Render and Neon. The origin
correction was deployed on Render as `dep-dbkr7sp9dmos739mldq0`, commit `d0562d6`.
Branded transactional emails are deployed at commit `41f2e6d`; the subsequent
email environment update is live as `dep-dbli84ff3r2c73a7q800`.
See [VERCEL-RENDER.md](VERCEL-RENDER.md) for the split and historical setup steps.

The owner explicitly chose to retain free preview hosting for now, while keeping
paid gifts and printed books in the intended launch scope. No paid upgrade or
real transaction has been authorized. Website deployment, local tests and a
legal approval flag do not establish approval of the unfinished legal documents.

| Step | Current evidence | What still prevents completion |
| --- | --- | --- |
| 1. Legal/privacy | Bilingual working draft published. Owner reconfirmed on 4 November that actual details are **not ready** | Actual operator details, monitored contact, final terms/retention decisions and owner review; see [LEGAL-DRAFT.md](LEGAL-DRAFT.md) |
| 2. Public email | Resend domain/records Verified. Render uses `Filémoire <noreply@filemoire.fr>` without the test-recipient restriction. Login links were delivered and consumed with two approved inboxes. A live editor invitation was delivered and accepted by the intended second account; see [acceptance evidence](ACCEPTANCE-2026-11-04.md). The 30-account beta limit remains | Inbox-placement monitoring and abuse/deliverability operations remain ongoing work. Public email does not approve unfinished legal documents or commercial launch |
| 3. Hosting | Vercel frontend, Render API/worker and Neon already deployed | Owner retained free preview; business launch still needs an eligible commercial frontend plan/host and reliable continuous worker operation |
| 4. Live acceptance | Two-account hosted login/invitation, narrator persistence, editor visibility/proposal approval, real PNG upload and four-page A5 PDF approval/download passed on 4 November. Approved PDF equals reviewed PDF byte for byte. See [technical acceptance](ACCEPTANCE-2026-11-04.md). Code commit `41f2e6d` also passed full GitHub Verify run `41817864116` (137 unit and 100 DB integration tests, builds and browser/split suites) | Real human/device acceptance and paid buyer/gift/refund/printing flows still require the missing provider setup; these checks are not a human pilot |
| 5. Recovery/monitoring | Fresh production snapshot verified locally and then restored into a new database/private bucket on an expiring Neon branch: 22 tables, 5 decrypted projects and 6 media objects/hashes passed. Added a credential-free, four-times-daily GitHub website monitor; live checks returned 200. Nine monitor/restore-guard tests pass. See [recovery evidence and scope](RECOVERY.md) | Owner says backup storage/key vault are not ready. Scheduled off-device backups, separate key escrow, deletion reconciliation, alert delivery/ownership, protected worker/queue checks and an application cutover/rollback drill remain pending |
| 6. Paid gifts/printing | Payment and print adapters and local contract tests exist | Stripe business/test/live setup, approved prices/refund terms, named printer and actual supplier integration/preflight/physical proof; current beta launcher deliberately rejects paid-provider settings |

The earlier local `pnpm` launcher could not verify registry signatures because
registry requests failed; that run used installed tool entry points without
bypassing signatures. The subsequent GitHub Verify run on `41f2e6d` passed its
dependency audit. The 4 November recovery/monitoring work adds operational
scripts and documentation, with no application dependency or runtime settings
change. Five already-installed official Neon skills were updated as required by
the Neon workflow; the existing authenticated CLI was reused when MCP returned
an authorization error.

The recovery tests used the production encryption key, kept separately from the
backup. It matches the private production env import, not the distinct staging
key. Keep keys labelled by environment and snapshot compatibility; do not
replace the production key with the staging key. Temporary local restore
containers were removed after verification. The 4 November hosted drill wrote
only to its isolated, expiring Neon branch; production data was not modified.

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
