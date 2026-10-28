# Filemoire sender-domain verification

On 28 October 2026, `filemoire.fr` was added to the signed-in Filemoire Resend
account, in the Ireland region. Sending is enabled; receiving remains disabled.
The authoritative nameservers are `ns01.one.com` and `ns02.one.com`.

The following records are copied from this domain's actual [Resend verification
page](https://resend.com/domains/add/3fba6f1d-534e-450b-9f9e-0f7291c8d66d).
Public DNS lookups returned no records for these three names at the time checked.
The domain is **not verified yet**.

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

After saving the records, click **I've added the records** in Resend and wait for
successful verification. Only then configure an authorized sender such as
`Filémoire <noreply@filemoire.fr>` and verify actual inbox delivery.

The sending API key previously shared in chat must be replaced and revoked.
Save its replacement directly in the private `.env.filemoire.staging` file (or
the intended host's secret settings), never in this document or a chat message.
Private staging can initially use `onboarding@resend.dev` only for the Resend
account owner's address; public beta requires the verified domain sender.
