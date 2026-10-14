# Verification record — 13 October 2026

This record covers local engineering checks. It is not a public launch or compliance certificate.

## Local website follow-up

After adding personal manuscripts and the local launcher, the following checks passed on 13 October 2026:

- TypeScript and ESLint.
- 28 unit tests and 23 PostgreSQL integration tests. The added integration cases cover concurrent creation retries, consent, account isolation, five-book quota, absence of payment records, manual audio transcription, digital PDF approval without a shipping address, and refusal of unpaid print requests.
- 10 live browser tests in one complete run: Chromium desktop and emulated Pixel 7. A brand-new account signs in through the form, creates a manuscript, saves/reloads its story, approves a PDF and downloads it. Existing paid-project, photo, privacy, support and MediaRecorder flows also pass. Axe checks pass on the exercised manuscript and privacy screens.
- Optimized Next.js build with both modes set to `live`, worker/migration bundles and standalone demo HTML build.
- Manual local smoke check through the actual SMTP worker and Mailpit inbox: request email, open delivered login link, sign in, create a manuscript and save a story. The launcher was stopped and restarted; the session and story survived, API health returned `ok`, and the worker heartbeat resumed. Re-running an already-running launcher prints the existing address.

The first browser run exposed same-tab fragment handling and early pre-hydration form interaction. Those were fixed and the full 10-test live suite then passed. Recording tests were updated to verify the intentional manual-transcription state when there is no provider. An initial typecheck during dev-server regeneration was inconclusive; the optimized build and subsequent idle-server typecheck passed.

Current personal-manuscript screenshots are `artifacts/production/live-desktop-personal-book.png` and `live-mobile-personal-book.png`. The test database is separate from the working local database. One explicitly fictional `local-check@example.test` account and verification manuscript remain in the local database from the smoke check. The browser was signed out before handoff.

The earlier Docker-image, demo-browser and backup/restore checks below predate this follow-up and were not rerun for it. SMTP was verified only against Mailpit, not an external delivery provider. No public deployment or real transaction was made.

## Earlier production-foundation checks

| Check | Result |
| --- | --- |
| Unit tests | 28 passed: original rules/i18n, hidden-photo regression, arbitrary-editor identity, Paris gift-date DST |
| PostgreSQL integration tests | 20 passed using a separate disposable database: auth expiry/replay, MFA, CSRF origin, tenant visibility, invitation renewal/revocation, revisions, signed payment events/retries, refund/print guards, jobs, uploads, audio/QR, PDF approval, deletion, support audit, full export and transcription contract |
| Original demo/HTML browser suite | 25 passed in one complete run, covering French/English and desktop/mobile |
| Server-backed workspace browsers | 8 passed in one final complete run (Chromium desktop and emulated Pixel 7): narration/photo/PDF/export/logout, buyer privacy, public/support flow, actual browser audio |
| Accessibility | Axe WCAG 2 A/AA and 2.1 AA tags pass on the exercised narrator privacy screen; narrow viewport does not overflow. This is not a complete accessibility audit |
| Real recording | Chromium desktop and emulated phone MediaRecorder bytes uploaded and validated; no physical microphone/device certification |
| Next.js and standalone HTML | Both built successfully; final container build also compiles the live-mode application |
| Worker/migration bundles | Built successfully |
| Container | Built locally and ran as nonroot with read-only root, dropped capabilities and writable temporary directory; login route 200 and legacy narrator route redirected |
| Fail-closed behavior | Final container returned 503 for incomplete configuration, emitted HSTS, and kept checkout/printing closed; launch-evidence checker correctly reported pending external gates |
| Backup/restore | Isolated PostgreSQL dump/restore and separately copied encrypted media passed comparison/decryption/hash checks; source and restore databases were separate |
| Runtime dependency audit | 0 reported vulnerabilities across 207 production dependencies at check time |
| Full dependency audit | One unpatched high-severity `braces` build-tool advisory; details in SECURITY-REVIEW.md |

Generated local evidence is under `artifacts/production/` (excluded from version control): desktop/mobile screenshots, a review PDF and `restore-drill.json`. Demo Playwright evidence is in `playwright-report/`. Final live browser traces use `/tmp/filemoire-live-final` if a failure occurs. These use fictional accounts at `example.test`.

Observed failures were fixed during implementation: non-submitting form buttons, a low-contrast label, upload-caption encryption mismatch, test-fixture typing and immutable-proof parameter binding. None is being presented as a passing result without a later verification.

No actual S3 provider, SMTP delivery, Stripe sandbox account, production transcription provider, print supplier, screen reader or physical book was validated. No load-test result is claimed. Container smoke checks do not replace an HTTPS deployment test with the selected infrastructure.
