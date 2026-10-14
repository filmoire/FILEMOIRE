# Running and deploying the new workspace

This repository now has two modes. `APP_MODE=demo` / `NEXT_PUBLIC_APP_MODE=demo` preserves the original fictional prototype and standalone HTML. Matching `live` values enable `/espace`, `/acces`, `/offrir`, `/rejoindre`, `/ecoute`, and the server API. The live workspace stores stories on the server, not in the demo store. Its first implementation is French; bilingual manuscripts and assisted services remain quote requests.

The previously mentioned NestJS backend was not provided. This implementation uses Next.js route handlers, PostgreSQL and a separate worker, with provider adapters. Reconcile the architecture with any existing backend before connecting real data.

## Local development

**Quick local website:** run `node scripts/local/start.mjs`, open the printed URL (normally http://localhost:3100), and read login links in http://localhost:8025. This command configures and starts the database, local SMTP inbox, migrations, website and worker together. It creates private personal manuscripts without a purchase; all data persists on this computer. See [LOCAL-WEBSITE.md](LOCAL-WEBSITE.md) for the complete user flow, persistence and restart instructions. The `.env.filemoire.local` file is private and separate from the manual `.env.local` setup below.

The following steps are for **manual/provider configuration**:

Use Node 22.12 or later in the Node 22 line, pnpm 10.28.0, PostgreSQL and `ffprobe`/FFmpeg. Install dependencies with `corepack pnpm@10.28.0 install --frozen-lockfile` after cloning the repository.

1. `corepack enable` and `corepack prepare pnpm@10.28.0 --activate`.
2. `pnpm install --frozen-lockfile`.
3. Start PostgreSQL and a local SMTP capture server. `docker compose -f compose.dev.yml up -d` provides both, bound to localhost.
4. Copy `.env.example` to `.env.local`, choose both modes `live`, set the local database URL, and generate a random 32-byte base64 encryption key. Keep this key; losing it loses access to encrypted data. For the development compose services use `postgres://filemoire:local_development_only@127.0.0.1:55432/filemoire`, `smtp://127.0.0.1:1025`, and a test sender at `example.test`.
5. Run `node --env-file=.env.local --import tsx scripts/production/migrate.ts`.
6. Run `pnpm dev:server`. Next loads `.env.local` automatically. (`pnpm dev` starts the self-contained local setup instead.)
7. In another terminal run `node --env-file=.env.local --import tsx scripts/production/worker.ts`.
8. Open `/acces`; the login email goes to the local capture server at `http://localhost:8025`. Keep checkout and printing disabled until their provider tests and launch reviews are complete. Never use real family data while the legal documents are unfinished.

To keep using only the prototype, leave both mode values `demo` and run `pnpm dev:demo`; it requires no database or external services. `pnpm build:html` always produces the isolated demo.

The worker requires environment variables to be explicitly loaded; it does not load `.env.local` on its own. API errors expose a request ID and a safe message, while worker logs contain job IDs, kind and attempt counts. Do not add transcript or email bodies to logs.

## Validation

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:html`, `pnpm build:worker`.
- `pnpm test:e2e` covers the original prototype and HTML version.
- Create a separate database named **filemoire_test**, set `TEST_DATABASE_URL`, apply migrations to that database, then run `pnpm test:integration` and `pnpm test:live` sequentially. The test harness refuses a different database name or a nonlocal host (except the isolated CI service named `db`). These suites clear their test database and must never be pointed at customer data.
- Install the browser with `pnpm exec playwright install chromium`. Do not run type checking while a Next dev server is regenerating its route type files.
- `pnpm audit:production` checks shipped dependencies. See SECURITY-REVIEW.md for the remaining development-tool advisory.
- `scripts/production/restore-drill.ts` copies and restores only a local `filemoire_test` database, compares encrypted project rows, decrypts them with the separately supplied fixture key, and checks restored media hashes. It refuses an existing restore target. Hosted database PITR and object-store restoration still require a provider-specific drill.

## Deployment

The Dockerfile builds the account workspace with `NEXT_PUBLIC_APP_MODE=live`. It bundles a separate worker and migration command and runs as a nonroot user. Set runtime modes to `live` too. Run:

- Web: image default `node server.js`.
- Worker: `node dist-worker/worker.cjs`.
- One migration job before rollout: `node dist-worker/migrate.cjs` with a separate migration credential.

Use one image digest for web and worker. The supplied CI workflow verifies code; it does not push images or deploy. The Node container base is pinned to the digest verified locally. CI action references and provider service images should also be pinned to reviewed commits/digests in the selected hosting pipeline and updated regularly.

Production configuration requires HTTPS, a verified TLS database connection, private S3-compatible storage, transactional SMTP and reviewed legal documents. Set object-store credentials via workload identity or a secret manager. Block public bucket access. Grant only the required bucket/prefix operations. Supply a migration owner distinct from the runtime role; apply `db/runtime-role.sql` after creating `filemoire_runtime` securely.

Terminate TLS at a trusted proxy. Only configure `TRUSTED_CLIENT_IP_HEADER` when that proxy **overwrites** the header and direct app access is blocked. Without it authentication throttling uses a shared conservative bucket. Limit ingress body sizes, connections, memory and CPU; uploads use 4 MiB chunks and bounded decoded image sizes. Deploy with a read-only root filesystem and an isolated writable `/tmp` for audio decoding. Health is `/api/v1/health`; worker freshness is available in `service_heartbeats`. Alert on worker heartbeat older than three minutes, failed jobs, elevated 5xx rates, database capacity and bucket failures.

## Service adapters and launch switches

**Stripe:** create a test account and webhook endpoint `/api/v1/stripe/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `charge.refunded`. The amount is calculated server-side, checkout/refund requests have stable idempotency keys, and signed events are deduplicated transactionally. Test successful, declined, asynchronous, duplicate, out-of-order and refunded payments against Stripe before enabling real sales. `CHECKOUT_ENABLED`, `COMMERCIAL_APPROVED` and `LEGAL_APPROVED` must all be true. `ORDER_CUTOFF_AT` and `COHORT_LIMIT` control sales capacity. Cohort capacity includes pending reservations from the last 24 hours. Legal/tax, withdrawal/refund policy, exact package entitlements, shipping and extra-copy prices require owner approval.

**Email:** configure `SMTP_URL` and `EMAIL_FROM`; verify SPF, DKIM, DMARC and real inbox delivery. Database jobs retry with backoff and carry stable Message-IDs. SMTP delivery is at least once: a crash after provider acceptance can produce a duplicate, so no exact-once delivery claim is made. Links expire, are recipient-bound, and are consumed once. Queued question reminders recheck preferences before sending. The worker must run continuously.

**Transcription:** configure `TRANSCRIPTION_URL`, `TRANSCRIPTION_API_KEY` and `TRANSCRIPTION_MODEL`. The adapter POSTs multipart `file`, `model` and `response_format=json`, and expects `{ "text": "..." }`. Originals remain private. No provider is selected or quality certified. Evaluate elderly voices, accents, noisy recordings and failure recovery. Automatic results always require narrator review.

**Printing:** the adapter POSTs multipart `pdf` plus an `order` JSON object, sends `Idempotency-Key: <print-order-id>`, and expects `{ "id": "provider-job-id" }`. This is an explicit integration contract, not a tested integration with an actual printer. Its source is the stored, approved PDF. The PDF is an A5 review proof with embedded font, images, pagination, table of contents and optional private QR; manufacturing requirements such as bleed, spine, separate cover and colour profile are not yet supplier-approved. Keep `PRINT_ENABLED=false` and `PRINT_SPEC_APPROVED=false` until adaptation, supplier preflight, physical proof and order reconciliation pass. Status updates and incidents require a fresh administrator MFA session.

**Audio:** QR URLs use opaque tokens and a separate narrator-chosen access code. Links can be disabled or expired. The host/domain and retention promise must outlive printed books; agree that promise before selling Voix. Revocation cannot erase already downloaded copies.

## Backup, recovery and rollback

Back up PostgreSQL and encrypted objects independently; escrow encryption keys separately with audited access. Select and document RPO/RTO, snapshot retention, object version expiry and deletion reconciliation with the host. A database backup without its media and encryption keys is insufficient. After any restore, reconcile deletion requests from a separately preserved deletion ledger before admitting traffic; that hosted ledger and procedure are not yet implemented or tested.

For a code rollback, stop new sales/print submission, preserve the job queue, switch web and worker to the previous tested image, and verify health, login, access restrictions and job processing. Migrations are additive, but compatibility must be checked against the actual previous release. Do not automatically reverse schema migrations or restore an older database over newer orders. A provider-specific rollback rehearsal is a launch gate.

Public deployment requires hosting credentials and configuration, the actual provider contracts, legal documents, and the launch-evidence record. Merely setting approval environment variables is not evidence that those reviews happened.
