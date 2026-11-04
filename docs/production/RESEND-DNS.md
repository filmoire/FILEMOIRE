# Filemoire sender-domain verification

On 28 October 2026, `filemoire.fr` was added to the signed-in Filemoire Resend
account, in the Ireland region. Sending is enabled; receiving remains disabled.
The authoritative nameservers are `ns01.one.com` and `ns02.one.com`.

The following records are copied from this domain's actual [Resend verification
page](https://resend.com/domains/3fba6f1d-534e-450b-9f9e-0f7291c8d66d).
Latest check, **4 November 2026**: both `ns01.one.com` and `ns02.one.com`, plus
Cloudflare's `1.1.1.1` resolver, return the exact expected DKIM TXT and both
`rsend` and `send` CNAMEs. Resend's **Verify DNS records** action completed:
the domain and all three records show **Verified**, at 11:39 Europe/Paris.
Sending is enabled; receiving remains disabled. No existing DNS records were
changed by the agent. Do not recreate the already-correct records.

Email evidence from the same session:

- A direct test from `Filémoire <noreply@filemoire.fr>` to
  `admin-dev@filemoire.fr` returned HTTP 200 at 10:39:23 UTC. Resend message
  `01a1a624-5db7-756a-bc1f-dee24484a511` shows **Delivered**.
- The deployed website's `/api/v1/auth/request` returned HTTP 202, followed by
  delivery state `sent` at 10:34:32 UTC. The corresponding Resend message
  `01a1a61f-e571-7db9-8a5f-fbd7cc23c80f`, subject
  `Votre lien de connexion Filémoire`, also shows **Delivered**.
- Earlier HTTP 403 sender-domain failures were before verification. The direct
  test retry used the same idempotency key; one domain-test email was accepted.
- **Delivered** is Resend's recipient-server delivery confirmation. Inbox/spam
  placement and successful use of the one-use login link remain user checks.

No Render environment settings or account-access restrictions were changed in
this verification. The live login test is separate from the direct own-domain
sender test. Moving the app from its previously configured owner-only test
sender to normal delivery still follows [EMAIL-TESTING.md](EMAIL-TESTING.md).
Private screenshots are under the Git-ignored
`artifacts/production/email-verification-2026-11-04/` directory.

In the one.com control panel, open `filemoire.fr` → DNS settings and add:

| Type | Host/name | Value | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | Full DKIM value below | Default/Auto |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | Default/Auto |
| CNAME | `send` | `send.forge.rmta.net` | Default/Auto |

DKIM TXT value (one line, no line breaks):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7gxbr1cOrirUqSRKpWzMVp2iWQ+Jgm07kI+S74jFAs2U9xEGpsbMsoELloMEt2RSTVtYuT3rdZ3S0DyS7/ST2iVP94Rf0qRVNHfCBfG7r46QRgPYxy+EAMzgaZOlFRBdp0F/qe+Z3eiSgQuc1YLGtnlkPQQRZ5lDpXhPvU5muoQIDAQAB
```

This is a public DNS verification value, not an API credential. If the control
panel automatically appends `.filemoire.fr`, enter only the host/name shown in
the table. Preserve existing website records and the domain's root MX/email
records. If any of these names already has a conflicting record, review it
before replacing it.

For any future setup, save the records, click **Verify DNS records** in Resend
and wait for successful verification before configuring the sender. The current
domain has completed this step; actual inbox placement is a separate check.

The owner previously confirmed that the exposed sending API key was revoked
and a replacement saved. Today's successful direct send used the replacement
from the private `.env.filemoire.staging` file. Keep keys in private env files
or the intended host's secret settings, never in this document or a chat message.
Private staging can initially use `onboarding@resend.dev` only for the Resend
account owner's address; public beta requires the verified domain sender.
