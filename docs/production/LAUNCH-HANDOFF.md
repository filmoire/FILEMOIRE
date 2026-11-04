# Launch preparation — 4 November 2026

The owner retained **free preview**, supplied **Rue Ordener, 75018 Paris,
France**, and said a Stripe account and printer are ready. This is not permission
to purchase a plan, invent a street number, approve legal terms or charge a card.

## 1. Legal information

The French and English drafts now contain the supplied street and postcode.
Still required: street/building number; Intertrad's legal identity/form and
registration/VAT status; publication responsible person and business telephone;
retention/provider decisions; chosen consumer mediator and final review.
No legal or commercial approval switch was changed.

## 2. Hosting

Keep the existing Vercel/Render/Neon preview while the owner decides funding.
Do not turn the public monitor into a keep-awake workaround. Before commercial
launch, select an eligible commercial frontend plan/host and continuously
running backend worker. Existing services can be upgraded without changing the
database, bucket, production encryption key or canonical origin.

References checked 4 November:
[Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Render Free](https://render.com/docs/free).

## 3. Customer withdrawal flow

`/retractation` is linked from the public footer, account footer and legal page.
It accepts name, contact email and contract/order identification without login
or a reason. The customer reviews the declaration and explicitly confirms it.
The API records an encrypted support ticket with a server timestamp and queues
the branded acknowledgement in the same transaction. A downloadable text copy
is immediately available. Retries with the same request key are idempotent;
changing the fields with that key is rejected. Origin validation and separate
IP/email rate limits apply. Operations sees the ticket as **Rétractation**.

This is a declaration/acknowledgement flow, not an automatic refund. No order
existence is disclosed and no order/payment/print state changes on unverified
public input. Operations must verify the identity/contract, stop relevant
production where appropriate, apply the reviewed rights/terms and use the
existing MFA-protected refund process. The form does not impose a 14-day
automatic rejection or erase statutory exceptions/extensions.

Local tests cover concurrent retries, encrypted persistence, queued receipt,
invalid confirmation/origin, rate limiting, and preservation of order state.
An actual SMTP acknowledgement was received by the **local Mailpit inbox** for
the fictional `FM-LOCAL-FICTIF` contract. No live customer was emailed in this test.
This is not a legal compliance certification or a completed Stripe refund.

## 4. Recovery preparation

`scripts/production/archive-backup.mjs` now encrypts a previously verified cloud
backup using the standard [age format](https://github.com/FiloSottile/age).
Only the database dump, manifest and verified encrypted media listed in that
manifest enter the archive. Keys, arbitrary files and `.env` files are excluded.
Symlinks, traversal, altered media and overwrite attempts are rejected. There
is no plaintext intermediate archive. Output permissions are owner-only.

Age 1.3.2 was installed locally through Homebrew. A synthetic archive was
decrypted and inspected; modified ciphertext was rejected. No production key
was generated, moved, uploaded or replaced, and no real backup was uploaded.

Once an owner-controlled vault exists, create an age identity there and put
only its **public recipient** in the scheduled encryption environment:

```sh
BACKUP_AGE_RECIPIENT=age1... node scripts/production/archive-backup.mjs \
  /private/verified-backup /private/output/backup.tar.gz.age
```

The private age identity and the existing **production DATA_ENCRYPTION_KEY**
must be escrowed separately from the archive. Both are needed for full recovery.
The owner must select private off-device storage, retention/deletion policy,
backup cadence and recovery operators before upload/scheduling can be enabled.
Deletion reconciliation and an app cutover/rollback drill remain pending.

## 5. Protected monitoring

`GET /api/v1/health/worker` accepts only a dedicated `Authorization: Bearer ...`
credential from `MONITOR_TOKEN` (minimum 32 characters). It reports aggregate
worker age, failed/stalled job counts and overdue time, with no customer data,
payloads or provider error messages. Unconfigured access fails closed.

The endpoint returns 503 when the worker is missing/older than 180 seconds,
pending work is more than 300 seconds overdue, or failed/stalled jobs exist.
Future scheduled jobs are excluded. The public `/health` check remains unchanged.

After continuous hosting and an alert owner are agreed:

1. Store one generated random monitor token in Render as `MONITOR_TOKEN` and
   GitHub Actions as `FILEMOIRE_MONITOR_TOKEN`; keep it out of chat/Git/logs.
2. Enable repository variable `FILEMOIRE_WORKER_MONITOR_ENABLED=true`.
3. Run Website monitor manually and inspect its protected-worker step.
4. Verify failure notifications reach the named responder and rehearse recovery.

No production monitor credential was created and that variable was not enabled
on the sleeping free preview. The existing four-times-daily anonymous monitor
continues. It is not yet a verified alert-delivery arrangement.

## 6. Stripe and commercial decisions

The connected browser shows **filmoire sandbox** (account
`acct_1UY1kZ3dcUJbS22r`). Its email verification is complete; business verification
is still pending. The account API reports `charges_enabled=false` and
`details_submitted=false`. Sandbox access is not live activation.

At the owner's request, the existing test secret was saved directly to the
owner-only, Git-ignored `.env.filemoire.payments-test`; it was not printed or
sent to GitHub/Render. A real sandbox Checkout for a fictional €99 gift passed
with Stripe's 4242 test card. Repeating Checkout creation reused the session.
The official Stripe CLI forwarded `checkout.session.completed` to the local
application webhook (HTTP 200), creating one paid order, one project and two
queued emails. Two signed replays did not duplicate those records, and an
invalid signature returned 400. The app's sandbox refund succeeded; Stripe's
signed `charge.refunded` event returned HTTP 200 and changed the local order to
`refunded`. No real money or production data was involved, and no test email
was sent externally. This is a provider/application test, not a paid-buyer UI
acceptance test or a live-account activation. Production sales remain closed.

Current code prices are **proposals**, not approvals:

| Item | Current proposal | Required decision |
| --- | --- | --- |
| Essentiel | €99 | Final price, tax treatment, book entitlement |
| Héritage | €179 | Final price, tax treatment, voice/transcription entitlement |
| Voix | €249 | Final price, tax treatment, audio hosting term |
| Extra copy | €49 | Printer cost and shipping |
| Gift box | €29 | Supplier, tax and shipping |

Also supply supported countries, shipping fees/times, invoice details, treatment
of declined/expired gifts, early-performance consent decisions and reviewed
refund/return procedures. Confirm any advertised transcription provider/scope.
The current code keeps transcription manual without a configured provider.

## 7. Printer and acceptance

Needed from the selected printer: legal/name/contact, API or ordering method,
sandbox/test credentials or docs, A5 trim/bleed/safe area, colour profile, paper,
binding, cover/spine calculation, page constraints, shipping/tracking interface,
proof process, defect/reprint terms and data retention/deletion agreement.

Then complete supplier-specific implementation, send an approved fictional PDF,
obtain PDF/preflight acceptance, order/inspect a physical proof with the owner's
payment authorization, and run the agreed pilot. Real-human/mobile acceptance
and supplier proof cannot be replaced by local tests.

## Evidence boundaries

Previous deployed policy release `df2516d` passed full GitHub Verify run
[41844534481](https://github.com/filmoire/FILEMOIRE/actions/runs/41844534481).
Current preparation is separately tested; publishing code does not approve
legal documents, commercial hosting, real charges, backup custody or physical
print quality. See [STATUS.md](STATUS.md) for the current launch table.

Local verification: TypeScript and ESLint passed; 139 unit tests, 105 database
integration tests and 14 operational tests passed. Frontend, backend and worker
builds passed. The French/English withdrawal form was exercised in a real
browser at desktop and 390px mobile width; its downloaded receipt and local
SMTP delivery were verified. No horizontal overflow or console errors were
observed. A temporary sandbox-script SDK typing error was corrected before
the successful final backend build. GitHub CI must still be checked against
the exact pushed revision.
