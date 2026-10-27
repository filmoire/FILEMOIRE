# Public launch checklist

Checked 27 October 2026. The local application works; a public customer deployment is not yet ready. Publishing the repository does not publish the website.

## What is already prepared

- Live Next.js website, API, PostgreSQL persistence, private encrypted media, email job queue, French/English interface and five account roles.
- Local role verification: 76 unit tests, 85 isolated database integration tests, 80 live HTTP checks, controlled-browser role checks, TypeScript, lint and production build passed. See [LOCAL-QA-2026-10-27.md](LOCAL-QA-2026-10-27.md) for scope and limitations.
- Docker build definition, migrations, worker bundle and GitHub verification workflow.
- Separate Neon Free staging project, runtime database role and private bucket. Nine migrations were applied on 26 October. These are staging resources, not a production database containing customer data.
- A protected Render staging Blueprint. Hosted container build, object upload/download and real email delivery still need verification.

## Free service recommendation

| Component | Existing choice | Constraint |
| --- | --- | --- |
| Private testing host | Render Free Docker web service | Sleeps after 15 minutes without inbound traffic; the combined worker also stops. Render advises against using Free instances for production. |
| Database and private files | Neon Free | Published allowance currently includes 100 CU-hours/month per project, 1 GB database storage and 5 GB object storage. Confirm the project's actual limits and monitor compute, storage and transfer. |
| Login and notification emails | Resend Free | 3,000 emails/month, at most 100/day. General delivery needs a verified sender domain. |
| Website address | Included HTTPS hosting address initially | An existing owned domain can be connected later; DNS verification for email is a separate task. |

For a zero-cost first release, prepare a small, explicitly limited manuscript beta: writing, photos/audio, family collaboration and PDF downloads. Keep checkout and printing disabled and transcription manual. The existing free staging setup is suitable for testing this scope; it is not a completed public beta configuration or a reliable always-on production service. Free quotas do not guarantee unlimited usage, availability or recovery.

Sources checked for this checklist: [Render Free](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing), [Resend pricing](https://resend.com/pricing). Do not enable paid upgrades or overages as part of the free setup.

## Complete these steps in order

1. **Publish and verify code.** Publish the pending commits and check the GitHub Verify workflow on the exact release commit. Local results do not replace cloud CI or the hosted Docker build.
2. **Verify email.** In Resend, finish verification of `filemoire.fr` using the exact DNS records it supplies. Configure an authorized sender and a restricted sending API key in the host's secret settings. Verify a real inbox login, invitation and support reply, including retry behavior. The last reported domain state was unverified.
3. **Deploy private staging.** Connect Render to this GitHub repository and use [FREE-STAGING.md](FREE-STAGING.md). Keep the Free plan, password protection and account allowlist. Enter existing credentials directly into secret settings; do not commit `.env` files. The current `render.yaml` deliberately deploys staging only.
4. **Prove cloud persistence.** Test a fictional manuscript, photo, audio file and PDF against the private Neon bucket. Confirm unauthorized access fails and data survives a restart/redeploy. This upload/download round trip has not yet passed in the hosted environment. Local disk is unsuitable for persistent uploads on Render Free.
5. **Choose the public hosting/worker arrangement.** Login delivery, invitations and reminders depend on the worker. The existing `dist-worker/staging.cjs` launcher explicitly refuses production. Public deployment needs a separate reviewed configuration with both web and worker processes running. Under the current architecture, a sleeping free service delays jobs. Resolve this limitation or redesign and test job execution before promising dependable public access; do not silently remove the staging launcher's guard.
6. **Prepare production data and secrets.** Use a separate production database/bucket and scoped runtime credentials, apply migrations with a separate owner role, use verified TLS and keep a secure backup of the encryption key. Do not publish staging fixtures or reuse local test data as customer data. Set the exact HTTPS origin. Build and runtime modes must agree: `APP_MODE=live`, `NEXT_PUBLIC_APP_MODE=live`, and both deployment-stage settings `production`. Public client settings require rebuilding.
7. **Complete customer documents and access setup.** Replace the unfinished legal page with reviewed privacy/terms, retention/deletion information, operator identity and support contact. Configure the real operations account and MFA recovery procedure. Only set `LEGAL_APPROVED=true` after the review is actually complete; the server intentionally blocks public live hosting without it.
8. **Back up and rehearse recovery.** Back up database, encrypted objects and the separately protected encryption key. Perform a hosted restore and code rollback. Document how deletion requests remain honored after restoration and who handles incidents.
9. **Run hosted acceptance tests.** Repeat all role/permission boundaries and French/English flows on HTTPS: login, save/reload, uploads, family invitation/proposals, approval/reopening, PDF/export, support, deletion and admin MFA. Check mobile devices, rate limiting behind the real proxy, worker heartbeat, failed jobs, email limits and capacity. Confirm secrets and private media are not publicly accessible.
10. **Open the approved scope gradually.** Record the owner launch decision and scope-specific evidence before removing staging restrictions in a separate public deployment. Start with a small cohort and monitor errors, queue delays and quotas. `COHORT_LIMIT` limits sales; it is not an implemented cap on free manuscript signups, so a free beta also needs an enforced signup/usage policy before opening broadly.

## Additional requirements for selling gifts and printed books

Real sales need Stripe configuration and payment/refund/webhook reconciliation, approved pricing and customer terms. Printing needs an actual supplier integration, accepted print specifications and physical proofs. Automatic transcription needs a selected provider and voice-quality/privacy checks. These are not all free services; keep their switches off until their own requirements are met.

The current `check:readiness` command checks the full commercial/printing launch, including 30 pilot families and five accepted physical books. It does not yet have a manuscript-only beta profile. A reduced launch scope needs an explicitly reviewed evidence profile; do not fabricate payment, pilot or print evidence to make that command pass.

Full commercial gates remain in [STATUS.md](STATUS.md), with operational details in [RUNBOOK.md](RUNBOOK.md).
