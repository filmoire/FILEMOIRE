# Neon setup and local verification

Verified 27 October 2026. The application runs locally against the user's Neon Free project. This provisions the backend; it does not publish the Next.js website.

## Target

| Setting | Value |
| --- | --- |
| Organization | `org-broad-mode-49050825` |
| Project | `bold-lake-94447602` (`filemoire-production`) |
| Branch | `production` (`br-fragrant-mud-b98n6bvd`) |
| Database | `neondb`, PostgreSQL 18 |
| Region | Frankfurt, `aws-eu-central-1` |
| Storage | Private bucket `filemoire-private` |
| App | http://localhost:3200 |
| Test inbox | http://localhost:8025 |

This project is separate from the older `filemoire-staging` project described in [FREE-STAGING.md](FREE-STAGING.md), and from the Docker database used by `npm run dev` on port 3100. The verification creates clearly labelled fictional manuscripts in the selected Neon branch; use a separate development branch for subsequent feature work.

## Configuration applied

The requested [Neon agent skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md), installed Postgres skill and object-storage skill were consulted. The global CLI install failed with `EACCES` under `/usr/local/lib/node_modules`; the supported `npx` fallback succeeded with Neon CLI 8.13.0. Browser sign-in completed successfully.

```sh
npx --yes neon@latest init -y --org-id org-broad-mode-49050825 --project-id bold-lake-94447602 --branch production --services postgres,object-storage
npx --yes neon@latest deploy
```

The authenticated initialization installed agent tooling, including the Codex Neon plugin. After the user reported reconnecting, the current Codex MCP connection still listed only the older `admin-dev@calamelle.fr` organization and could not authorize access to this project (HTTP 404). The refreshed connector needs to expose the project-owning account before MCP management can be verified. CLI authentication and app credentials are independent and work. No substitute project was created.

`neon.ts` declares only the private bucket; the linked project supplies Postgres. The existing login system, `pg` driver, transactions, background worker and AWS S3 client remain in use. No paid upgrade, Neon Auth, Functions or AI Gateway was enabled.

The deploy command reported:

```text
Applying to branch production (br-fragrant-mud-b98n6bvd)
No changes — branch production already matches the policy.
Utilized services: Postgres, Object Storage
Pulled 7 Neon variables into .env.local
  Postgres        DATABASE_URL, DATABASE_URL_UNPOOLED
  Branch          NEON_BRANCH
  Object Storage  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
```

The application uses the pooled `DATABASE_URL`. Migrations prefer `MIGRATION_DATABASE_URL`, then Neon's direct `DATABASE_URL_UNPOOLED`, then `DATABASE_URL`. All nine repository migrations have been applied. On 28 October, a restricted `filemoire_runtime` role was created and verified with a rolled-back application write. Its URL is saved separately in the ignored, mode-0600 `.env.filemoire.runtime`; use that URL for hosting. `.env.local` was preserved and still contains owner credentials for local setup/migrations. Never upload its owner URLs to the host.

The PostgreSQL pool allows up to 15 seconds to establish a connection. A live verification attempt exceeded the previous five-second limit during cloud connection setup; the application and worker now use the longer bounded timeout without disabling certificate verification.

The storage adapter accepts `AWS_ENDPOINT_URL_S3` and `AWS_REGION` as aliases for the existing `S3_ENDPOINT` and `S3_REGION` settings. Explicit `S3_*` values take precedence, so remove stale overrides when switching storage providers. AWS credentials remain server-side. Path-style requests, application encryption and authenticated file retrieval remain enabled. Anonymous bucket access was denied during the live test.

## Private local settings

`.env.local` has permissions `0600` and is excluded from Git and Docker, as is `.neon`. It contains the pulled credentials and the application's encryption key. Back it up securely; never replace the encryption key after saving data. A future `neon env pull` may refresh the Neon-owned connection URLs; check the target and TLS settings before restarting.

The current local verification settings include:

```dotenv
APP_MODE=live
NEXT_PUBLIC_APP_MODE=live
DEPLOYMENT_STAGE=production
NEXT_PUBLIC_DEPLOYMENT_STAGE=production
APP_ORIGIN=http://localhost:3200
DATABASE_SSL=true
STORAGE_DRIVER=s3
S3_BUCKET=filemoire-private
PERSONAL_DRAFTS_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_URL=smtp://127.0.0.1:1025
EMAIL_FROM=Filemoire verification <noreply@example.test>
CHECKOUT_ENABLED=false
PRINT_ENABLED=false
LEGAL_APPROVED=false
COMMERCIAL_APPROVED=false
PRINT_SPEC_APPROVED=false
```

Connection URLs use `sslmode=verify-full`. Credentials and `DATA_ENCRYPTION_KEY` are intentionally omitted from this document. The `production` branch/stage names select the intended backend and client behavior; the local server runs in Next.js development mode. This configuration intentionally cannot start as a public production server with an HTTP origin and unapproved legal documents. Do not flip approval flags to bypass that check.

## Start and verify

Use Node.js 22.12 or newer within the Node 22 release line and the repository's locked pnpm dependencies. From the repository root, with Docker Desktop running:

```sh
# Start the local inbox; the database is on Neon.
docker compose -f compose.dev.yml up -d mail
npm run db:migrate:neon

# Terminal 1: serve the app, using a separate output folder from npm run build.
NEXT_BUILD_DIR=.next-neon-local npm run dev:neon

# Terminal 2: deliver queued login messages to the local inbox.
npm run worker:neon

# Terminal 3: verify the build, unit checks and live Neon integration.
npm run build
npm test
npm run lint
npm run test:neon
```

`NEXT_BUILD_DIR=...` is POSIX shell syntax. In PowerShell, set `$env:NEXT_BUILD_DIR='.next-neon-local'` before running `npm run dev:neon` in the server terminal. Keep that setting out of the build terminal.

Open http://localhost:3200, request a login link, and open the matching email at http://localhost:8025. Messages stay in this local inbox; no real Resend delivery is exercised. Both the app and worker must be running. `Ctrl+C` stops each process without deleting cloud data. The original local-only launcher remains `npm run dev`.

If pnpm reports `ERR_PNPM_UNEXPECTED_STORE`, use the store already associated with `node_modules`. On this computer the recovery command was `npx --yes pnpm@10.28.0 --store-dir /tmp/filemoire-pnpm-store install --frozen-lockfile`; this also avoids the broken temporary Corepack cache. Other machines should use their own configured store.

## Recorded results

`npm run build` exited 0:

```text
Next.js 15.5.28
Compiled successfully in 6.9s
Generating static pages (40/40)
```

The build reported the existing Next.js ESLint-plugin configuration warning; compilation and checks succeeded. `npm test` passed 78 tests across six files. All 85 isolated local database integration tests, TypeScript and lint also passed after the dependency security updates.

`npm run test:neon` exited 0:

```text
PASS app health reaches Neon Postgres
PASS email sign-in through local inbox; token replay denied
PASS story saved through API and encrypted in Neon; anonymous access denied
PASS photo upload/download through Neon storage; encrypted bytes and private access verified
PASS generated PDF stored and retrieved from Neon storage
PASS saved story and photo survive a fresh sign-in
PASS 22 live HTTP checks; Neon database and private storage verified end to end
```

The test additionally reads its own encrypted database row and stored object, verifies downloaded bytes by hash, and checks the saved PDF remains identical across requests. It only permits a loopback app, Neon database, local SMTP inbox, and disabled payments/printing. It never resets a database or deletes existing user data. Each run retains a fictional test account and manuscript and prints the manuscript ID. Failed runs may also retain partial verification data.

The initial test selected an already-consumed login email during its second sign-in and received the correct HTTP 400. The test now waits for an unused message; the rerun passed. A sandboxed invocation could not reach the local server; the network-enabled invocation passed. These failures did not require weakening authentication or storage permissions.

The first GitHub run passed the build, 78 unit tests and 85 database integration tests, then failed installing Chromium: `Playwright does not support chromium on ubuntu26.04-x64`. The workflow now pins the [supported GitHub runner](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job) `ubuntu-24.04`, which is present in Playwright 1.56.0's installed dependency matrix. The following run passed all 25 demo browser tests and 34 live workspace browser tests, then identified dependency advisories during its final audit.

Security updates then raised Next.js to 15.5.28, Zod to 4.6.6 and Nodemailer to 10.1.4. The gift form uses Zod's current error customization API while preserving its messages; the SMTP adapter and unit mock use Nodemailer's named export. References: [Next.js image processing](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Next.js Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [Zod validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Nodemailer address parsing](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8). The updated local production audit reports `No known vulnerabilities found`. CI now audits immediately after dependency installation so a failing audit is reported before the longer browser suites. Verify the final release commit's workflow result before public deployment.

## Still separate from public launch

The verified scope is Postgres and private file storage reached through the locally running application. On 28 October, restricted runtime access and an authorized cloud backup restored into an isolated local container also passed. All 22 tables restored, six encrypted objects passed verification, and four project payloads decrypted; the encryption key remains separate. The older staging project's private upload/download test and local Docker web/worker smoke checks also passed. See [FREE-BETA.md](FREE-BETA.md) for the current evidence and limits.

Website hosting, hosted worker operation, verified Resend inbox delivery/domain, legal approval, hosted restore/rollback and hosted role acceptance remain in [PUBLIC-LAUNCH.md](PUBLIC-LAUNCH.md). Checkout, printing and automatic transcription remain outside this verification.
