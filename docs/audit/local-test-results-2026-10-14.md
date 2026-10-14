# Local test results — 14 October 2026

The final local retest covers application code recorded at `c2216f5`, including voice-first writing, personal-book QR rendering and approved-PDF integrity repairs (`6862ba3` and `c2216f5`). This is local verification, not a completed production audit or approval to launch.

| Check | Result | Evidence under `artifacts/production/audit-2026-10-14/` |
|---|---|---|
| TypeScript | PASS | `final-typecheck.log` |
| ESLint | PASS | `final-lint.log` |
| Unit + database integration | 100 PASS: 29 unit, 23 original integration, 45 audit regressions, 3 PDF integrity regressions | `final-domain.log` |
| Live browser journeys | 10 PASS: Chromium desktop and emulated Pixel 7 | `final-live.log` |
| Demo + standalone HTML browsers | 25 PASS: French/English, desktop/mobile | `final-demo.log` |
| Optimized Next application build | PASS, demo and live modes | `final-build.log`, `final-live-build.log` |
| Standalone HTML / worker bundles | PASS | `final-html.log`, `final-worker.log` |
| Fresh schema migration | PASS: all 7 applied to a separate temporary test database | `local-ops.log` |
| Repeat migration | PASS: no migrations reapplied | `local-ops.log` |
| Actual local SMTP delivery and delivered login link | PASS: Mailpit sink only | `local-ops.log` |
| Worker heartbeat | PASS after scheduler execution | `local-ops.log` |
| Encrypted database/media restore | PASS: 1 synthetic project, 1 audio object; restored payload decrypted and object hash matched | `local-restore-pg17.log` |

The earlier standalone unit run passed 28 cases; the new QR rule adds one, and all 29 are included in the 100 above. Total distinct cases in the final suite runs, counted once: **135 passed** (100 + 10 + 25). The operational checks are additional assertions, not added to that test count.

## Exercised workflows

Live browser tests verify new-account login, personal manuscript creation, saving and reloading stories, photo upload, real browser MediaRecorder bytes, manual transcription approval and publication, personal-book QR preview, protected playback (wrong and correct family codes), PDF review/approval/download, export, buyer privacy, disabled unpaid printing, support request persistence and sign-out. Automated accessibility checks passed on the exercised manuscript and privacy screens; narrow-screen overflow checks passed. This does not certify every page, screen reader or physical mobile device.

Integration cases cover one-use/expired login tokens, session/MFA checks, origin checks, role and family isolation, all protected route authentication failures, stale revisions, malformed requests, validated uploads, payment webhook contracts/replay, print guards, jobs, deletion recovery, support audit and exports. Payment/transcription/provider responses use synthetic contract fixtures where configured; no real payment, external mail, AI transcription or print order was submitted.

FILE-LIFE-001 regressions failed before the fix and passed afterward: deletion preserves another family's jobs even when email text overlaps, and expired cancellation cannot restore records after partial destructive cleanup. Existing pre-deadline cancellation behavior remains covered by the original integration suite.

FILE-AUDIO-FLOW-001 and FILE-BOOK-QR-001: narrators can begin with voice without typing a dummy story, publish an approved transcript and retain it after reload. Personal books and legacy personal payloads include eligible audio QR links. The preview uses the live listening page; only narrators receive the management token. Browser capture uses Chromium's synthetic media device and actual MediaRecorder output, not a physical microphone.

FILE-PDF-001: three PostgreSQL/storage/PDF regressions verify that approved bytes, identifiers and approval provenance survive a changed composition fingerprint and later preference revisions; missing approved media fails safely; regenerated drafts update their snapshot and fingerprint. An independently reproduced overwrite defect is repaired. Existing approved books require reopening and a new approval to adopt changed composition rules.

The operational checks in `local-ops.log` and `local-restore-pg17.log` were executed earlier in this same local testing pass and were not repeated after the audio/PDF changes. The final browser runs use separate ports and an isolated database; the working local website at port 3100 returned health `ok` and login HTTP 200.

## Coverage and limits

Measured scope: all `src/server/**/*.ts` except test files, plus shared `rules.ts`, `factory.ts` and `catalog.ts`. The report includes unimported modules. Frontend source coverage is not included; its exercised behavior is assessed by browser tests.

- Lines: **79.32%** (1132/1427).
- Statements: **76.77%** (1220/1589).
- Branches: **64.84%** (653/1007).
- Functions: **80.40%** (238/296).

The requested 90% target is unmet. Passing these tests is not evidence that all requirements, provider contracts, load limits, or remaining audit findings are resolved.

The first restore attempt failed before creating a restore database because host `pg_dump` 14.19 cannot dump PostgreSQL 17.11. The successful retry used PostgreSQL 17 tools from the existing local database container via `/tmp/filemoire-pg17-bin/`. No working local database or media was reset. Fresh-schema and restore databases were created separately and removed only after their checks; synthetic browser/API tests use `filemoire_test`.

Transient new-test failures (question selector, logout navigation race and a reminder fixture enum) were corrected; the completed reruns below are the acceptance evidence. Non-failing build notices: outdated Browserslist metadata; test-terminal color settings. Expected print-disabled 503 responses appear in live logs and were asserted by the tests.

## Repeat application checks

Use `COREPACK_HOME=/tmp/filemoire-corepack corepack pnpm@10.28.0` in place of `pnpm` if Corepack cannot write its normal cache. Database tests require an isolated local URL ending in `/filemoire_test`; never point them at working data.

```sh
pnpm typecheck
pnpm lint
pnpm test
TEST_DATABASE_URL=<isolated-local-test-url> pnpm exec vitest run --config vitest.audit.config.mts --coverage
TEST_DATABASE_URL=<isolated-local-test-url> pnpm test:live
NEXT_BUILD_DIR=.next-audit-local pnpm build
pnpm build:html
NEXT_BUILD_DIR=.next-audit-local pnpm test:e2e
pnpm build:worker
```

Browser binaries used here are installed under `/tmp/filemoire-playwright`; set `PLAYWRIGHT_BROWSERS_PATH` accordingly. The demo server needs `pnpm` on PATH. The local live launcher remains available with `node scripts/local/start.mjs`, normally at `http://localhost:3100`, with its Mailpit inbox at `http://localhost:8025`.
