# Free manuscript beta deployment

Prepared and locally verified on 28 October 2026. **The updated backend-connected
release has not been deployed to Render yet.** An existing Free Docker service,
`FILEMOIRE` (`srv-dbfi6n0u01pc73bclng0`), is live at
`https://filemoire.onrender.com` in Oregon on older commit `c37f9d5`. Its dashboard
showed only `PORT`, with no backend settings, secret files or environment groups.
The signed-in browser can manage it; the separate Render plugin is not connected.
This profile is for a small manuscript beta, not gift sales or physical printing.
The existing `render.yaml` remains private staging. `render.beta.yaml` is a
separate public profile that must wait for reviewed legal documents, a verified
email sender, and hosted acceptance testing.

GitHub CI passed for application commit `37abae7`:
[Verify run](https://github.com/filmoire/FILEMOIRE/actions/runs/40669900447).
The Render service was set to manual deployment, Docker command
`node dist-worker/staging.cjs`, and health path `/api/v1/health`. No updated
deployment was triggered: its saved environment still needs the backend settings.
The old deployed version returned HTTP 404 for that health endpoint and HTTP 200
for `/acces`; the login page alone is not evidence of a working backend.

A private, Git-ignored import file is prepared at
`artifacts/production/render-staging.env`, containing 30 runtime settings and no
owner database URLs. It deliberately omits the cached Resend key because its
replacement could not be confirmed in the local file. The owner must import the
settings, preserve `PORT`, and enter a fresh `RESEND_API_KEY` directly in Render.
The resulting saved configuration should have 32 keys. The browser extension
rejected automated file import even after the owner reported enabling file URL
access; manual import is pending. Do not print the import file or commit it.

## Enforced scope and limits

- One Render **Free** Docker web service runs the website and job worker together.
- Maximum 30 accounts, 100 MiB of media per book, and 1 GiB of media across the
  application. Existing accounts can still sign in when signup capacity is full.
- Upload reservations and generated PDFs count toward storage capacity. Concurrent
  signups/uploads are serialized at the capacity check to avoid exceeding limits.
- These are logical file sizes. Encryption/base64, temporary upload chunks,
  database rows, backups, and transfer are additional usage. Monitor provider
  quotas; the limits do not guarantee that every provider allowance stays unused.
- Personal manuscripts and family collaboration are enabled. Checkout, printing,
  and external automatic transcription remain disabled. No paid worker, disk,
  cron service, database, or AI provider is provisioned by either Blueprint.

Render Free sleeps after 15 idle minutes, which also stops this worker. Login
emails and scheduled jobs may be delayed until the service wakes. This is not an
always-on production offering. Do not enable paid overages or upgrades, and do
not generate artificial traffic to defeat sleeping. See [Render's Free service
limits](https://render.com/docs/free).

## Verified locally

- 83 unit checks and 90 isolated PostgreSQL integration checks passed, including
  concurrent signup/media capacity, upload finalization and PDF quotas.
- TypeScript, lint, worker bundling, and the Linux/amd64 staging Docker build passed.
- The Docker image started locally with the restricted staging database role.
  HTTP checks passed database health, anonymous access protection, protected
  assets, the staging notice, account boundaries, and disabled checkout. A recent
  worker heartbeat was read back from Neon.
- Staging private object upload/download passed; the temporary test object was
  removed after verification.
- The selected production Neon database now has a restricted runtime role.
  Connectivity and an application write followed by rollback passed. The role has
  no schema creation, role/database creation, superuser, bypass-RLS, or migration
  write privileges. Owner credentials remain separate.
- With explicit owner authorization, the production database and six encrypted
  objects were backed up privately. All 22 tables restored into a new local,
  network-isolated PostgreSQL container; four project payloads decrypted and
  referenced media hashes matched. The temporary restore container was removed.
- A previous Resend test send was accepted by the API. This does not prove inbox
  delivery, domain verification, or use of a replacement key.

These results do not prove Render HTTPS behavior, persistence across a Render
redeploy, real inbox login, all hosted roles, or a hosted rollback. Those checks
remain mandatory before sharing public access. The selected production branch
still contains fictional verification records; review their disposition before
opening the beta. No existing cloud records were deleted during this work.

## Deployment sequence

1. Use the existing Render service or a deliberate separate private staging
   service. GitHub confirmed the repository moved to `filmoire/FILEMOIRE`;
   synchronize Render's source location and verify CI on the exact commit before
   deployment. Confirm the selected service remains Free.
2. Deploy private staging using [FREE-STAGING.md](FREE-STAGING.md). Supply a fresh,
   restricted Resend sending key through private secret settings. Do not reuse a
   key pasted into chat. Keep the existing staging allowlist and password.
3. Complete the actual `filemoire.fr` DNS records supplied by Resend; see
   [RESEND-DNS.md](RESEND-DNS.md) for the records obtained from the dashboard. Verify real
   inbox delivery using an authorized sender. The test sender is restricted to
   the Resend account owner's email and is rejected by the public beta launcher.
4. Obtain the operator's legal identity, address, privacy/support contact and
   reviewed policy text, publish the documents, then record approval. The beta
   launcher retains the server's `LEGAL_APPROVED` requirement; do not set it true
   merely to make startup succeed.
5. Use the production database and private bucket with the matching encryption
   key. The runtime connection is in the ignored `.env.filemoire.runtime` file.
   Other production settings remain in `.env.local`; **do not upload that file
   wholesale**, since it includes owner credentials and local-only settings.
6. Create the public service from `render.beta.yaml`, explicitly select **Free**,
   and supply only the Blueprint's secret fields. Use the runtime URL, never
   `MIGRATION_DATABASE_URL` or `DATABASE_URL_UNPOOLED`. Set an authorized Resend
   sender and replacement key. The launcher derives the HTTPS origin from
   `RENDER_EXTERNAL_URL`; set `APP_ORIGIN` explicitly only for a custom domain.
7. Perform the HTTPS role, upload/audio/PDF, privacy, MFA, deletion, restart and
   recovery checks in [PUBLIC-LAUNCH.md](PUBLIC-LAUNCH.md). Keep the service private
   or unshared until acceptance is complete, then invite the limited cohort.

## Operator tooling

Run migrations separately, using a direct owner connection, before a manual
release. Both launchers reject missing migrations and excessive runtime database
privileges, and supervise both child processes. Neither child receives direct
owner connection environment variables.

For a **new** database without a runtime role, the following command creates the
restricted role and a new private file. It refuses to overwrite files or rotate
an existing role. The selected production database already has this role, so
reuse its existing credentials rather than running this again:

```sh
node --env-file=.env.local scripts/production/runtime-role.mjs .env.filemoire.runtime
```

For an explicitly authorized backup of the selected cloud database and private
bucket, with Docker Desktop running:

```sh
NODE_ENV=development node --env-file=.env.local --import tsx scripts/production/backup-cloud.mjs
```

The tool takes a consistent read-only PostgreSQL snapshot using verified TLS,
copies encrypted objects, and restores **only into its own temporary local
container**. It never restores over the cloud database. Files are `0600`, the
backup directory is `0700`, and all output lives under Git- and Docker-ignored
`artifacts/production/cloud-backup-*`. A passing `manifest.json` records evidence;
partial failed attempts do not have a passing manifest.

Keep a secure, owner-controlled off-device copy of the backup and a **separate**
secure copy of the unchanged encryption key. Database dumps include account
details and must remain private. Local verification is not an off-site backup
or a hosted restore/rollback drill. On recovery, reconcile deletion requests
before reopening access; see [RUNBOOK.md](RUNBOOK.md).
