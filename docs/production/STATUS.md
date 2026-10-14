# Production implementation status

Updated 14 October 2026. **The application is not approved for public production, and all 15 steps are not complete.** A substantial server-backed implementation and local verification are now in place. The remaining gates require provider access, business/legal decisions, independent testing and real people/physical books.

Source control is configured for [gftij-project-iit/FILEMOIRE](https://github.com/gftij-project-iit/FILEMOIRE). The Verify workflow runs on pushes and pull requests; check [GitHub Actions](https://github.com/gftij-project-iit/FILEMOIRE/actions/workflows/verify.yml) for the result on the exact revision being released. Repository publication does not deploy the website.

**Local website:** the user selected local operation first. `node scripts/local/start.mjs` now starts the real website, database, SMTP inbox and worker. New accounts can create private personal manuscripts without purchasing a gift; stories, photos, recordings, family permissions, PDF approval and exports use real storage. Personal manuscripts do not create payment records or printed-copy entitlements. Automatic transcription is replaced by an honest manual-entry state when no provider is configured. See [LOCAL-WEBSITE.md](LOCAL-WEBSITE.md).

Working scope: one-time Essentiel/Héritage/Voix purchases; Bilingue/Accompagné quote-only; French account workspace; private narrator accounts and invited family editors/contributors. Package entitlements and final commercial terms still need owner confirmation. A separate NestJS/Drizzle application was found at `/Users/zainsubhani/Downloads/filemoire`. The current repository remains the canonical application for this audit and uses Next.js API routes, PostgreSQL and a separate worker. The alternate application is a read-only reference; production data must not be connected until ownership and any intended reconciliation are confirmed.

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

No public deployment, email to a real third party, real charge/refund, print purchase or pilot recruitment was performed. The reference HTML and PPTX in Downloads were left untouched.
