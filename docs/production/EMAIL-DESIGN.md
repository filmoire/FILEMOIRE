# Filémoire transactional email design

Implemented 4 November 2026. The shared renderer is
`src/server/email-templates.ts`; the Resend and SMTP adapters send both HTML and
plain text. No new runtime dependency or provider-hosted template is required.

| Message | Trigger | Action |
| --- | --- | --- |
| Sign-in / access recovery | Login request | Open account with the existing 15-minute, single-use link |
| Family invitation | Narrator invites editor or contributor | Review the invitation; sign in with the invited address |
| Gift invitation | Paid order, at the selected send time | Discover the gift; includes the buyer's personal message |
| Renewed invitation | Buyer resends an unaccepted invitation | Use the replacement invitation; the old token remains revoked |
| Order confirmation | Successful payment fulfillment | View orders; no claim that printing/shipping already occurred |
| New question | Journey scheduler | Return to the workspace |
| Gentle reminder | Existing cadence and reminder preference | Return to the workspace; explains how to disable reminders |
| Support reply | MFA-authorized operator response | Read the reply and return to the actual `/#contact` form |

Authentication is passwordless. There is no password-reset token, password table,
or separate forgot-password email to style. Requesting a fresh sign-in link is
the existing access-recovery path. Templates retain the current French email
language; this change does not add stored recipient language preferences.

## Rendering and delivery

- Colors come from the existing public Tailwind brand tokens. The same public
  `/brand/filemoire-logo.png` asset supplies the logo, with meaningful alt text.
- Fluid 620px presentation tables, inline critical CSS, system-font fallbacks,
  mobile spacing, prominent action links and copyable fallback URLs.
- Personal text is escaped, line breaks preserved, and action URLs are built
  only from the configured app origin. Tokens remain in fragments.
- The queued HTML is encrypted together with the text and retained across
  retries. Old text-only jobs remain text-only, preserving their original
  provider idempotency payload. New plain-text transport callers get a safe
  generic branded wrapper by default.
- No recipient, permission, expiry, consent, scheduling, provider credential,
  sales or print setting changes are part of the visual update.

## Preview

```sh
npm run preview:emails -- --serve
```

Open `http://localhost:3399/`. Eight HTML/text pairs are generated under the
Git-ignored `artifacts/production/email-design/`. The server listens on loopback,
serves only its explicit preview pages/logo and never contacts a database or
sends mail. Preview data and tokens are fictional. Run without `--serve` to
generate files only.

## Verification on 4 November

- 137 unit tests passed, including template escaping, safe links, legacy
  delivery compatibility, Resend payloads and SMTP alternatives.
- 100 PostgreSQL integration tests passed in a disposable local database,
  including real auth/invitation/payment/scheduling/support producers and worker
  delivery-state behavior. External payment/email APIs in these tests are fixtures.
- All eight messages were sent through the actual SMTP adapter into a disposable
  local Mailpit inbox; all eight had both branded HTML and plain-text MIME parts.
  No external email was sent for this design QA.
- TypeScript, ESLint, worker bundle, frontend production build/isolation check,
  and backend production build passed. Next.js retains its existing warning
  that the ESLint Next plugin is not configured.
- Browser inspection at desktop and 375px: all eight logos loaded, headings and
  buttons were present, and no horizontal overflow occurred at 375px. This is
  not an Outlook/Gmail/Apple Mail client matrix or a live customer-inbox proof.
- The generic premium UI audit reports 36 findings in existing application
  controls outside the email work. Inspected examples are shared component
  false positives (`Button asChild`, `Form` owns `noValidate`, `Textarea` owns
  `resize-none`). Its raw output is saved in the private email-design artifacts;
  it is not claimed as a passing full application audit.

Deploy the changed API and worker together so newly queued messages contain HTML
and the worker delivers it. Existing test-recipient restrictions stay in effect.
After deployment, verify a new sign-in email in a real inbox before changing the
public account-access settings. Domain verification evidence is in
[RESEND-DNS.md](RESEND-DNS.md); remaining launch requirements are in
[STATUS.md](STATUS.md).
