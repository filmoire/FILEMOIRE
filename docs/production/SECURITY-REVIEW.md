# Security and privacy review record

13 October 2026. Engineering controls are implemented and locally tested; this is not a penetration-test or legal-compliance certificate.

## Implemented controls

- Server authentication and per-project authorization on reads and writes; narrative visibility is filtered before returning JSON. Demo role switching is isolated from real accounts.
- Recipient-bound invitations, single-use expiring email login links, hashed session/token identifiers, HttpOnly/SameSite cookies, HTTPS-only production cookies, strict Origin checks for mutations, bounded requests and database-backed rate limits.
- Admin TOTP with fresh-session requirement and replay prevention. Operations can read stories only through a narrator-granted expiring permission; other administrative actions require MFA.
- Encrypted project snapshots, queue payloads, upload captions, support messages, MFA secrets and private media. Identifiers, email addresses, selected operational metadata and audit timestamps remain database columns; protect database access and backups accordingly.
- Parameterized SQL, revision conflict detection, transactional event deduplication, immutable approved PDF artifacts and checksums.
- Photos are decoded with a pixel limit and re-encoded without EXIF. Audio is validated with FFmpeg/ffprobe restricted to supported demuxers and local protocols. Original audio is retained for review. Decoder dependencies and container resource isolation still need ongoing patching.
- Project export includes original media. Project deletion after a cancellation window removes current content, historical project versions and current stored files; cloud versioned objects and backups require a lifecycle policy. Financial records and account metadata have separate retention requirements.

## Dependency evidence

Runtime audit: **0 reported vulnerabilities** after targeted upgrades. Full audit: **one high-severity advisory in `braces` 3.0.3**, a development/build dependency, with no patched release reported by the registry on this review date. It concerns deeply nested glob patterns; customer strings are not passed to that build tool. This does not remove the advisory. Do not process untrusted glob patterns in CI; review the upstream fix when available. No audit ignore or severity suppression was added. The unused Next ESLint preset was removed; existing TypeScript and React Hooks lint rules remain. Next emits a warning that its specific ESLint plugin is absent.

Next and React were patched within their current release lines. Vitest and CSS tooling were updated to remove other advisories. Only pnpm-lock.yaml is maintained; the original npm lockfile is preserved in the source backup.

## Required decisions and remaining reviews

1. Legal entity, contact, controller responsibilities, service terms, tax, refund/withdrawal rules, processor contracts, hosting regions and transfer decisions. `/legal` explicitly remains a draft notice and must be replaced with reviewed documents before customers are admitted.
2. Retention of stories, recordings, invoices, accounts, unused invitations, support tickets and audit events; account-wide export/deletion requests currently need an authenticated support procedure. No general claim of automatic account erasure is made.
3. Hosted object-version purge, independent deletion ledger, backup expiry and deletion reconciliation after restore. Local deletion and restore tests do not prove cloud erasure.
4. Secret rotation/key migration and emergency admin recovery runbooks, implemented with the selected secret manager and infrastructure. Changing DATA_ENCRYPTION_KEY without a migration makes existing data unreadable.
5. Independent security review, provider sandbox reconciliation, email abuse/deliverability tests, load testing and cross-device accessibility testing.
6. The baseline CSP allows inline Next scripts/styles. Adopt nonce-based scripts and verify third-party integrations in staging before tightening it; this release does not claim a strict nonce CSP.
7. JSON snapshots simplify the initial bounded cohort. Measure large-manuscript latency, version growth, CPU/memory usage and database connection contention before increasing capacity.

Use the [CNIL security guide](https://www.cnil.fr/fr/guide-de-la-securite-des-donnees-personnelles) and [processor guidance](https://www.cnil.fr/fr/securite-gerer-la-sous-traitance) to structure the owner/provider review. Stripe's [idempotency documentation](https://docs.stripe.com/api/idempotent_requests) informs the payment retry design. These sources do not establish this application's compliance or certify its integration.
