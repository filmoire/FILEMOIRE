# Private staging on free services

This environment is for the owner's acceptance testing with fictional stories and test files. It is not approval to host customer memories or open sales. Production legal, commercial, printing and operational launch gates remain mandatory.

## Services

| Component                         | Configuration                                                            | Limitation                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Website and job worker            | One Render Docker web service, explicitly `plan: free`, Frankfurt        | Sleeps after 15 idle minutes; queued work resumes when the website wakes. No reliable scheduled delivery.                          |
| Database                          | Separate Neon Free project `filemoire-staging`, Frankfurt, PostgreSQL 17 | Free compute, storage and transfer quotas apply.                                                                                   |
| Uploaded files and generated PDFs | Private Neon bucket `filemoire-private`                                  | Credentials stay server-side; files also use the application's authenticated encryption.                                           |
| Login and notification email      | Resend HTTPS API                                                         | A verified sender domain is required for general delivery. The Resend test sender only reaches the Resend account owner's address. |
| HTTPS address                     | Render's included `onrender.com` address                                 | No domain purchase is needed for the website.                                                                                      |

Do not add paid Render workers, disks, databases or cron services. Do not select a paid instance or upgrade Neon. Render's free web service blocks outbound SMTP ports, so the existing SMTP adapter remains for local development and other hosts; staging uses HTTPS email. Do not generate artificial traffic to prevent sleeping.

References checked 26 October 2026: [Render Free](https://render.com/docs/free), [Blueprint fields](https://render.com/docs/blueprint-spec), [Neon plans](https://neon.com/docs/introduction/plans), [Neon private storage](https://neon.com/docs/storage/buckets), [Resend email API](https://resend.com/docs/api-reference/emails/send-email), [Resend test-sender restrictions](https://resend.com/docs/api-reference/errors).

## Prepared infrastructure

- Neon project: `mute-dawn-08319394` (`filemoire-staging`).
- Isolated branch: `br-round-band-baty6wj2` (`staging`), database `filemoire`.
- Private bucket: `filemoire-private`.
- All nine repository migrations applied on 26 October 2026.
- Application role: `filemoire_runtime`; no schema creation or migration writes. Migration ownership remains separate.
- Authorized staging account: `admin-dev@filemoire.fr`.

Latest verification, 28 October 2026: 83 unit checks and 90 backend integration checks passed, along with TypeScript, lint and worker bundling. The Linux/amd64 Docker build passed and was started locally against this Neon staging database. HTTP checks confirmed access protection, healthy database connectivity, protected assets, disabled checkout and the staging notice. The worker heartbeat was read back from Neon. The private encrypted storage upload/download round trip also passed; its temporary object was deleted. Earlier desktop/mobile login-page checks found no JavaScript errors or horizontal overflow. The signed-in browser can access an existing Free Render service at `filemoire.onrender.com`, currently on older commit `c37f9d5` without backend environment settings. Updated configuration, deployment and hosted acceptance remain pending. Resend accepted an earlier test email via its API; inbox delivery and domain verification remain unconfirmed. The owner has confirmed replacing and revoking the key previously pasted into chat.

Credentials and the encryption key are in the ignored, permission-restricted `.env.filemoire.staging` file on the setup computer. Never commit it, paste it into chat, upload it as an artifact, or include it in a Docker image. Keep a secure backup of the encryption key; replacing it makes existing records unreadable. Local development continues to use its separate `.env.filemoire.local` file.

## Finish setup

1. Use the signed-in Render dashboard or connect the Render integration. The repository moved to `filmoire/FILEMOIRE`. Reuse the existing Free service deliberately or create private staging from `render.yaml`; the Blueprint requests Frankfurt, while the existing service is in Oregon. Confirm the selected service remains **Free** and synchronize its Git source before deployment.
2. The signed-in Filemoire Resend account is available and `filemoire.fr` has been added. The owner will add the exact [DNS records](RESEND-DNS.md) in one.com. For a first private test, use the account registered as `admin-dev@filemoire.fr` and sender `Filémoire staging <onboarding@resend.dev>`. For a real `@filemoire.fr` sender, wait for successful domain verification. Do not use an unverified sender.
3. Create a restricted sending API key in Resend and enter it directly into Render's secret environment variable `RESEND_API_KEY`. Set `EMAIL_FROM` to the permitted sender. Do not put API keys in repository files or messages.
4. Copy these values from the private setup file directly into Render's secret fields: `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `STAGING_ACCESS_PASSWORD`, `STAGING_ALLOWED_EMAILS`, `ADMIN_EMAILS`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. The Blueprint supplies the other settings. **Do not upload `MIGRATION_DATABASE_URL` to the website.**
5. Keep both `DEPLOYMENT_STAGE` and `NEXT_PUBLIC_DEPLOYMENT_STAGE` set to `staging`, and both app modes set to `live`. The public setting is baked into the Docker build; changing it requires rebuilding. `APP_ORIGIN` is derived from Render's `RENDER_EXTERNAL_URL` at startup. If you later add a custom domain, set the exact HTTPS origin explicitly.
6. Deploy manually. The combined launcher checks configuration, restricted runtime-role privileges and the applied migration list before starting the website and worker. A missing migration or unsafe staging setting prevents startup. Automatic deploys are disabled so future migrations can be applied before releasing code. The Blueprint also enforces 30 accounts, 100 MiB per book and 1 GiB total logical media; see [FREE-BETA.md](FREE-BETA.md) for quota limitations.
7. Open the HTTPS website. The browser first requests the staging username (`filemoire`) and the private staging access password. The app then sends its normal one-use login link to the allowed email address. An admin session still requires TOTP setup and verification.

## Acceptance checks before sharing access

- Anonymous requests to the homepage, APIs, sample assets and JavaScript files receive `401`; only `GET /api/v1/health` is public and returns status information.
- Incorrect or missing staging credentials fail. A correct password grants access to the login page, not an authenticated account session.
- Only explicitly allowed accounts can request or consume login links. Removing an address also invalidates its existing sessions. Queued emails to other addresses are blocked.
- The French/English staging notice is visible. Use fictional data only. Checkout, printing and third-party transcription are disabled even if someone accidentally supplies their credentials.
- Login delivery works in a real inbox; the token is usable only once. A failed email provider request remains retryable in the job queue.
- Create a personal manuscript, save a fictional answer, upload a test photo/audio file, generate and download a PDF, reload, and confirm persistence after a service restart. Verify anonymous object access is denied.
- Verify the worker resumes queued work after the service wakes. Sleeping can delay reminders and expire login links; request a fresh link if needed. Do not advertise time-critical notifications on this setup.
- Check Render logs, Neon quotas and the Resend delivery log. Establish a database-and-encryption-key backup and prove a restore before any production use.

Run the repeatable HTTP checks without printing access credentials:

```sh
node --env-file=.env.filemoire.staging scripts/production/smoke-staging.mjs https://YOUR-SERVICE.onrender.com
```

This checks the health endpoint, anonymous access restrictions, protected assets, the staging notice, account authentication and closed checkout. It does not send email or create a manuscript.

## Updating schema

On the setup computer, load `.env.filemoire.staging` only for an explicitly targeted migration command, using the direct owner connection in `MIGRATION_DATABASE_URL`. The migration runner takes an advisory lock and only applies outstanding versioned files. Never point the integration-test reset helper at Neon; it is restricted to the local `filemoire_test` database.

After reviewing changes and testing migrations locally:

```sh
COREPACK_HOME=/tmp/filemoire-corepack corepack pnpm@10.28.0 build:worker
node --env-file=.env.filemoire.staging dist-worker/migrate.cjs
```

Then deploy the corresponding verified commit manually in Render. Normal application processes use the pooled runtime connection with certificate verification, not the owner connection.

## Production remains a separate release

The existing public-production configuration still requires reviewed legal documents, HTTPS, verified database TLS, private object storage and a working email provider. Sales and printing have additional independent approval gates. This staging exception only permits a protected test environment, requires an explicit email allowlist and prohibits paid adapters. A successful staging deployment does not satisfy the evidence in `deployment/launch-evidence.example.json`.
