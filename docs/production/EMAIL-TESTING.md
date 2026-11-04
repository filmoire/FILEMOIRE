# Online email testing without DNS

## Current deployment — 4 November 2026

At the user's explicit request, the owner-only test restriction has been removed
from the Render backend. `EMAIL_PROVIDER=resend` remains configured,
`EMAIL_FROM=Filémoire <noreply@filemoire.fr>` is live, and
`RESEND_TEST_RECIPIENT` is absent. Render deployment
`dep-dbli84ff3r2c73a7q800` succeeded using code revision `41f2e6d`.

Fresh login requests through `https://www.filemoire.fr` returned HTTP 202 and
queue status `sent` for the admin mailbox and a second, explicitly approved
Gmail mailbox. Resend reports both **Delivered** with the new sender. Later
hosted acceptance consumed fresh links for both accounts and sent/accepted a
real editor invitation for an explicitly fictional manuscript. See
[acceptance evidence](ACCEPTANCE-2026-11-04.md). Inbox/spam placement remains a
recipient check; provider delivery alone does not establish inbox placement.

The existing 30-account beta capacity, rate limits, role checks and closed paid
features remain in effect. This email change is not approval of the unfinished
legal documents or a completed commercial launch. Private verification evidence
is under `artifacts/production/public-email-2026-11-04/`.

The instructions below describe the former restricted test mode and how to
restore it if deliberately needed; they are not the current live settings.

## Restricted test mode

This temporary mode keeps the public website accessible and limits account
access and all outgoing email to one address. It does not remove sign-in,
administrative MFA, encryption, production startup checks, or capacity limits.
There is no additional browser password prompt.

Resend only delivers mail from `onboarding@resend.dev` to the address associated
with the Resend account. For Filemoire's current account that is
`admin-dev@filemoire.fr`. A different Gmail address or a family member cannot
sign in using this mode. See [Resend's restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Enable on the existing Render backend

Deploy the commit that adds `RESEND_TEST_RECIPIENT`. In Render → FILEMOIRE →
Environment, set:

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM=Filemoire test <onboarding@resend.dev>
RESEND_TEST_RECIPIENT=admin-dev@filemoire.fr
```

Keep the existing private `RESEND_API_KEY`, database/storage credentials,
`APP_ORIGIN=https://www.filemoire.fr`, production stage settings,
and `node dist-worker/beta.cjs` start command. Keep checkout and printing disabled.
No new Vercel environment variable is required. Rebuild and deploy the latest
commit on Render; restarting an old release does not install this feature.

Requests from other addresses are rejected before any login token or email job
is created. Existing sessions and unconsumed links for other addresses stop
working while this setting is enabled. Pending invitations and reminders to
other recipients are blocked at the email adapter. Those records are not deleted.

After deployment, open `https://www.filemoire.fr/acces` and request a fresh link for
`admin-dev@filemoire.fr`. Resend acceptance confirms submission to the provider;
check the real mailbox (and spam folder), then open the one-use link and confirm
sign-in. The link expires after 15 minutes. Use the workspace role selector to
test the narrator, buyer and editor screens; operations still requires MFA.
Multi-person invitation flows require local Mailpit testing or a verified domain.

## Return to normal email delivery

1. Add and verify the records in [RESEND-DNS.md](RESEND-DNS.md).
2. Set `EMAIL_FROM=Filemoire <noreply@filemoire.fr>` and remove
   `RESEND_TEST_RECIPIENT` in the same Render environment update.
3. Redeploy and request fresh sign-in links. Previously failed emails are not
   automatically replayed. Removing this restriction makes other existing
   sessions eligible again and restores normal account access.

Do not remove the restriction before the domain is verified and the public
account launch is approved. Record provider acceptance, actual inbox delivery,
and successful use of the link as separate checks. Test a second consenting
recipient and invitation acceptance before declaring public email complete.
