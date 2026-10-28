# Vercel frontend + Render backend

Updated on 28 October 2026. The Vercel frontend is publicly accessible at
`https://filemoire-omega.vercel.app`. Render now has 30 saved environment
variables, including the restricted database, storage, encryption and Resend
settings. The Docker command is `node dist-worker/beta.cjs` and health path is
`/api/v1/health`. The latest beta startup is blocked by `LEGAL_APPROVED=false`,
confirmed in Render; the legal page still contains placeholders. Resend domain
verification is also unfinished. Public page availability and a successful
container build are not proof of account, database, storage or email
connectivity. The owner will decide the Vercel plan separately.

## Architecture

```text
Browser → Vercel (Next.js pages and assets)
              └─ /api/v1/* → Render (Next.js API + supervised worker)
                                ├─ Neon PostgreSQL
                                ├─ Neon private object storage
                                └─ Resend
```

Both deployments build the same Git repository, `filmoire/FILEMOIRE`. There is
no Express migration or second database. `FILEMOIRE_SERVICE` selects the build:

| Role             | Behavior                                                             |
| ---------------- | -------------------------------------------------------------------- |
| `full` (default) | Original local/all-in-one application                                |
| `frontend`       | Pages plus an external API rewrite; backend imports are compiled out |
| `backend`        | Only `/api/v1/*` is served; other paths return 404                   |

The browser continues using relative API URLs. The external rewrite preserves
request bodies, the frontend Origin, cookies and response Set-Cookie. Sessions
remain host-only, HttpOnly and SameSite=Lax; hosted HTTPS adds Secure and the
`__Host-` prefix. No cross-site cookie relaxation or wildcard CORS is required.
Mutations must match the **frontend** `APP_ORIGIN`, configured on Render.
The frontend API fallback returns 503 and cannot execute database operations.
The frontend build verifies its API artifact excludes pg, AWS, email and payment
backend dependencies.

## Costs and account decision

[Vercel Hobby](https://vercel.com/docs/plans/hobby) is free for personal,
non-commercial use. Its [fair-use policy](https://vercel.com/docs/limits/fair-use-guidelines)
includes advertising products/services in commercial use. Filemoire's business
launch therefore needs an eligible Vercel plan or a different frontend host.
Disabling checkout does not by itself make a business site eligible for Hobby.
No plan was purchased or upgraded.

The browser-managed project is `filemoire` in the Filmoie team. The connected
Vercel MCP account exposes a different team; use the intended project's
dashboard when checking settings or deployments.

[Render Free](https://render.com/docs/free) sleeps after 15 minutes of inactivity
and can take about a minute to wake. The bundled worker also stops while the
service sleeps, so queued email and scheduled tasks may be delayed. Free hosting
is suitable for a limited preview, not an always-on service guarantee. Neon
holds persistent data and media; Render's filesystem must not hold customer
files. Vercel's [external rewrite timeout](https://vercel.com/docs/limits) is
120 seconds. API screens now give a retry message if a gateway sends HTML
while the backend is unavailable; write requests are not automatically retried.

## Configure a private staging deployment first

1. Choose the eligible Vercel account/team and import `filmoire/FILEMOIRE`, branch
   `main`, root directory `.` and Node 22. `vercel.json` selects Next.js, the
   pinned pnpm install, and `npm run build:frontend`.
2. Reserve the stable frontend project URL and identify the Render backend URL.
   The existing service is `https://filemoire.onrender.com`, service ID
   `srv-dbfi6n0u01pc73bclng0`. Do not create a duplicate Render service unless
   a separate environment is intended.
3. Set the following **Vercel** environment variables for the staging project:

   | Variable                                           | Value                                                        |
   | -------------------------------------------------- | ------------------------------------------------------------ |
   | `APP_MODE`, `NEXT_PUBLIC_APP_MODE`                 | `live`                                                       |
   | `DEPLOYMENT_STAGE`, `NEXT_PUBLIC_DEPLOYMENT_STAGE` | `staging`                                                    |
   | `BACKEND_ORIGIN`                                   | `https://filemoire.onrender.com` (the actual backend origin) |
   | `STAGING_ACCESS_USER`                              | Same private username as Render                              |
   | `STAGING_ACCESS_PASSWORD`                          | Same private staging password as Render                      |

   The build command sets `FILEMOIRE_SERVICE=frontend`. Do not put Neon database,
   migration-owner, encryption, AWS, Stripe or Resend credentials on Vercel.
   `.vercelignore` excludes all local env files and private artifacts from CLI uploads.

4. Configure the existing **Render** service from `render.backend.yaml`. It is
   a private-staging template with `plan: free`; manually retain the existing
   service's region when updating it. Set `FILEMOIRE_SERVICE=backend` at both
   build and runtime (Docker declares the build argument). Set `APP_ORIGIN`
   to the exact stable HTTPS frontend origin, with no path or trailing slash.
   Keep all runtime database, S3, encryption and Resend settings here. No
   `MIGRATION_DATABASE_URL` or database-owner URL belongs in either web service.
5. Apply any outstanding database migrations separately with the migration role.
   Set Render's Docker command to `node dist-worker/staging.cjs`, health path to
   `/api/v1/health`, and keep auto-deploy off until acceptance testing passes.
   The launcher checks database privileges/migrations and starts API plus worker.
6. Enter a **fresh Resend sending key directly in Render**. The previously pasted
   chat key must not be reused. Verify `filemoire.fr` using
   [the exact DNS records](RESEND-DNS.md) before sending to general users.
7. Deploy the prepared backend commit and then the frontend commit. Test through
   the stable frontend URL. Do not point untrusted preview branches at the live
   backend; preview deployments need their own matched backend/origin settings.

**Previous import instructions are superseded for this split.** Do not import
the old all-in-one `artifacts/production/render-staging.env` unchanged.

### Current public visitor setup: prepare the backend

The owner selected public visitor access, so do not re-enable the staging
password gate. A local private file has been prepared at
`artifacts/production/render-backend-production.env` (mode `0600`, Git-ignored).
It contains 28 settings, including the restricted production database URL,
its matching existing encryption key and private object-storage credentials,
`FILEMOIRE_SERVICE=backend`, and
`APP_ORIGIN=https://filemoire-omega.vercel.app`. It excludes the database owner
URL and the unconfirmed Resend key. It is a **configuration import**, not an
approval to launch: `LEGAL_APPROVED` intentionally remains `false`.

1. Open the existing Render service → Environment → Edit → More options →
   Import from .env → Choose a file. On macOS, press Cmd+Shift+G in the chooser
   and enter the private file's absolute path under this project.
2. Click **Add variables**, keep the existing `PORT`, then **Save only**.
   Verify keys such as `APP_MODE`, `DATABASE_URL`, `DATA_ENCRYPTION_KEY` and
   `S3_BUCKET` appear in the saved list; there should be 29 keys including PORT.
3. Add the replacement **sending-only** `RESEND_API_KEY` directly in Render.
   Never paste credentials in chat or commit this import file. Verify
   `filemoire.fr` in Resend before using the configured sender
   `Filemoire <noreply@filemoire.fr>` for general users.
4. Complete and approve the published legal/operator/privacy documents before
   setting `LEGAL_APPROVED=true`. The public beta launcher deliberately refuses
   to start until this approval and the other required settings are present.
5. Set Docker Command to `node dist-worker/beta.cjs` and Health Check Path to
   `/api/v1/health`. Keep the existing Free plan, region and `PORT`; keep
   auto-deploy off during configuration. Rebuild and deploy the latest commit
   only after the missing settings above are complete.
6. Test `/api/v1/health` on Render and through the stable frontend, then sign-in,
   session persistence, save/reload, private media and worker email delivery.

The public frontend currently uses production stage and the Render origin.
No frontend secret or staging password is needed. The free beta retains the
30-account, 100 MiB/project and 1 GiB total media limits. Sales, printing and
paid transcription remain disabled.

The beta launcher validates configuration before opening the database or
starting either process. With `LEGAL_APPROVED=false`, exit status 1 is expected
until the published legal/privacy documents are complete and approved. The
launcher now reports this specific reason. Other fixed configuration errors
are also safe to log; unexpected driver errors remain redacted because they
can contain credentials. A failure at this approval check does not establish
whether the database connection, permissions or migrations will pass later.

Keep `TRUSTED_CLIENT_IP_HEADER` unset until a proxy header is proven to be
overwritten on every ingress path. Existing shared/email/account rate limits
remain active. Do not trust an arbitrary forwarded header on Render's public URL.

## Acceptance tests

Local verification on 28 October: frontend and backend production builds passed;
the frontend artifact isolation check passed; typecheck, lint, worker bundling
and 88 unit tests passed; all 36 desktop/mobile split tests passed in 2.9 minutes.
The browser tests exercised a real isolated PostgreSQL database and local
encrypted media storage. The checks below still need to run on the selected
hosted deployments, including real email delivery and free-service wake-up.

- Through the frontend: health, private staging challenge, login, session
  persistence, logout, English/French navigation and all four role boundaries.
- Narrator: save/reload text, upload a photo and audio, preview/download a PDF,
  export; buyer/editor/operations must not acquire unauthorized narrative access.
- Verify delivery of a real login email and background worker processing.
- Upload at least one full 4 MiB part; check authenticated media downloads and
  `Cache-Control: private, no-store`. Confirm wrong-Origin mutations return 403.
- Through the direct Render URL: `/api/v1/health` returns 200; `/` and `/espace`
  return 404. Sessions remain protected by application authentication.
- Let the free service sleep, then verify the wake-up/retry experience. This
  cannot be established by local tests alone.

For local split tests, use only an isolated database named `filemoire_test`:

```sh
TEST_DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:55432/filemoire_test npm run test:split
```

The test harness starts a frontend on port 3300 with no backend credentials,
and an API on 3301. It reuses the real desktop/mobile role tests and adds proxy,
cookie, CSRF and full-chunk transport coverage. It resets only the explicitly
guarded test database, and stops both test servers on completion.

To check the frontend production artifact locally:

```sh
APP_MODE=live NEXT_PUBLIC_APP_MODE=live NEXT_PUBLIC_DEPLOYMENT_STAGE=production \
  NEXT_BUILD_DIR=.next-frontend-check BACKEND_ORIGIN=http://127.0.0.1:3301 \
  npm run build:frontend
```

For a public manuscript beta, first complete the operator/legal details,
verified sender and hosted acceptance tests. Then use the restrictions from
`render.beta.yaml`, retaining `FILEMOIRE_SERVICE=backend`, the frontend origin,
and `node dist-worker/beta.cjs`. Both frontend and backend must be rebuilt with
matching production stage. Sales, printing and paid transcription remain off.
