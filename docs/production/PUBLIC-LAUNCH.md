# Public launch checklist

Updated 28 October 2026. The local application works; a public customer deployment is not yet ready. Publishing the repository does not publish the website. See [FREE-BETA.md](FREE-BETA.md) for the newly prepared, bounded manuscript beta and current verification evidence.

## What is already prepared

- Live Next.js website, API, PostgreSQL persistence, private encrypted media, email job queue, French/English interface and five account roles.
- Local role verification: 76 unit tests, 85 isolated database integration tests, 80 live HTTP checks, controlled-browser role checks, TypeScript, lint and production build passed. See [LOCAL-QA-2026-10-27.md](LOCAL-QA-2026-10-27.md) for scope and limitations.
- Docker build definition, migrations, worker bundle and GitHub verification workflow.
- Separate Neon Free staging project, runtime database role and private bucket. Nine migrations were applied on 26 October. These are staging resources, not a production database containing customer data.
- A protected Render staging Blueprint and a separate public beta profile. The Linux/amd64 Docker build, local container web/worker checks, staging private object round trip, 83 unit tests and 90 backend integration tests passed. Render deployment and hosted acceptance remain pending.
- The separately selected Neon production project has all nine migrations, a private bucket and verified restricted runtime credentials. Local verification against this cloud backend passed 22 live HTTP checks for sign-in, encrypted story persistence, photo upload/download, access denial and PDF retrieval. An authorized backup restored all 22 tables into an isolated local container; six encrypted objects and four project payloads passed verification. See [NEON-SETUP.md](NEON-SETUP.md). Website hosting, verified real inbox delivery/domain and hosted recovery remain pending.

## Free service recommendation

| Component | Existing choice | Constraint |
| --- | --- | --- |
| Private testing host | Render Free Docker web service | Sleeps after 15 minutes without inbound traffic; the combined worker also stops. Render advises against using Free instances for production. |
| Database and private files | Neon Free | Published allowance currently includes 100 CU-hours/month per project, 1 GB database storage and 5 GB object storage. Confirm the project's actual limits and monitor compute, storage and transfer. |
| Login and notification emails | Resend Free | 3,000 emails/month, at most 100/day. General delivery needs a verified sender domain. |
| Website address | Included HTTPS hosting address initially | An existing owned domain can be connected later; DNS verification for email is a separate task. |

For a zero-cost first release, the prepared beta profile covers writing, photos/audio, family collaboration and PDF downloads, capped at 30 accounts, 100 MiB per book and 1 GiB total logical media. Checkout and printing stay disabled and transcription stays manual. The configuration is prepared but not deployed or approved for public access. Free quotas do not guarantee unlimited usage, availability or recovery.

Sources checked for this checklist: [Render Free](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing), [Resend pricing](https://resend.com/pricing). Do not enable paid upgrades or overages as part of the free setup.

## Complete these steps in order

1. **Publish and verify code.** Publish the pending commits and check the GitHub Verify workflow on the exact release commit. Local results do not replace cloud CI or the hosted Docker build.
2. **Verify email.** In Resend, finish verification of `filemoire.fr` using the exact DNS records it supplies. Configure an authorized sender and a restricted sending API key in the host's secret settings. Verify a real inbox login, invitation and support reply, including retry behavior. The last reported domain state was unverified.
3. **Deploy private staging.** Connect Render to this GitHub repository and use [FREE-STAGING.md](FREE-STAGING.md). Keep the Free plan, password protection and account allowlist. Enter existing credentials directly into secret settings; do not commit `.env` files. The current `render.yaml` deliberately deploys staging only.
4. **Prove cloud persistence from the host.** The new production project's manuscript, photo and PDF round trip passed from the local app using Neon Postgres and private storage. Repeat it from the hosted website, add audio, and confirm unauthorized access fails and data survives a restart/redeploy. The hosted round trip remains unverified. Local disk is unsuitable for persistent uploads on Render Free.
5. **Verify the public hosting/worker arrangement.** Login delivery, invitations and reminders depend on the worker. The new `dist-worker/beta.cjs` launcher supervises both web and worker, enforces the bounded free profile, and retains legal and runtime-permission checks. The staging launcher still refuses production. A sleeping free service delays jobs; disclose this beta limitation and verify wake/retry behavior before opening access. Do not promise dependable scheduled delivery on this setup.
6. **Prepare production data and secrets.** Use a separate production database/bucket and scoped runtime credentials, apply migrations with a separate owner role, use verified TLS and keep a secure backup of the encryption key. Do not publish staging fixtures or reuse local test data as customer data. Set the exact HTTPS origin. Build and runtime modes must agree: `APP_MODE=live`, `NEXT_PUBLIC_APP_MODE=live`, and both deployment-stage settings `production`. Public client settings require rebuilding.
7. **Complete customer documents and access setup.** Replace the unfinished legal page with reviewed privacy/terms, retention/deletion information, operator identity and support contact. Configure the real operations account and MFA recovery procedure. Only set `LEGAL_APPROVED=true` after the review is actually complete; the server intentionally blocks public live hosting without it.
8. **Finish recovery preparation.** The authorized local backup/restore drill passed. Keep an owner-controlled off-device copy of the database/encrypted objects and a separately protected encryption key. Perform a hosted restore and code rollback. Document how deletion requests remain honored after restoration and who handles incidents.
9. **Run hosted acceptance tests.** Repeat all role/permission boundaries and French/English flows on HTTPS: login, save/reload, uploads, family invitation/proposals, approval/reopening, PDF/export, support, deletion and admin MFA. Check mobile devices, rate limiting behind the real proxy, worker heartbeat, failed jobs, email limits and capacity. Confirm secrets and private media are not publicly accessible.
10. **Open the approved scope gradually.** Record the owner launch decision and scope-specific evidence before removing staging restrictions in a separate public deployment. Start with a small cohort and monitor errors, queue delays and provider quotas. `ACCOUNT_LIMIT` now caps manuscript signups; the separate `COHORT_LIMIT` still applies to sales. Logical media limits do not include all encryption, database, backup and transfer overhead.

## Additional requirements for selling gifts and printed books

Real sales need Stripe configuration and payment/refund/webhook reconciliation, approved pricing and customer terms. Printing needs an actual supplier integration, accepted print specifications and physical proofs. Automatic transcription needs a selected provider and voice-quality/privacy checks. These are not all free services; keep their switches off until their own requirements are met.

The current `check:readiness` command checks the full commercial/printing launch, including 30 pilot families and five accepted physical books. The beta launcher's configuration checks are separate and do not replace hosted acceptance evidence or constitute commercial approval. Do not fabricate payment, pilot or print evidence to make the commercial readiness command pass.

Full commercial gates remain in [STATUS.md](STATUS.md), with operational details in [RUNBOOK.md](RUNBOOK.md).
