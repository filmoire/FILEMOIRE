# Audit execution log

Started 14 October 2026 against `3dc99a5185dc5fdc963fb664ec1dbf4e47b47501` on `main`. This is an in-progress audit; no release approval is implied.

## Scope and provenance

- Canonical application: this repository, `gftij-project-iit/FILEMOIRE`.
- Product source: `/Users/zainsubhani/Downloads/06_Filemoire_Dossier_Deployement_2026.pptx`, 14 slide XML parts; visible footer numbering runs 3–15 after the cover. The `(2)` filename in the request was not found. References use physical slide order, not footer numbers.
- Alternate application discovered at `/Users/zainsubhani/Downloads/filemoire`: NestJS API plus Next.js web client. Compare as a reference pending the requested scope clarification; do not merge architectures automatically.
- User constraint: free services only. No real customer mail, charges, print submissions, production migrations or deployment. No working local business data is reset.
- Test database: isolated loopback `filemoire_test`. Raw logs and generated evidence are ignored under `artifacts/production/audit-2026-10-14/`.

## Baseline

| Check | Result | Evidence |
|---|---|---|
| Unit tests | 28 passed / 3 files | `baseline-unit.log` |
| TypeScript | passed | `baseline-typecheck.log` |
| ESLint | passed | `baseline-lint.log` |
| Next production build | passed | `baseline-build.log` |
| PostgreSQL integration | 23 passed | `baseline-integration.log` |

The initial sandboxed integration attempt failed with local-network `EPERM`; rerunning with permission to access the isolated local database passed. This was an environment failure, not 23 application regressions.

## Progress

1. Extracted all 14 slides and enumerated 245 tracked files.
2. Reviewed all server modules and migrations; continuing frontend, tools, tests and documentation review.
3. Independent security verification confirmed an unapproved transcript exposure in role-filtered project responses. Regression reproduced and repair verified; see FILE-SEC-001.
4. Installed the matching Vitest V8 coverage provider and added an explicit scope including every server module and shared book rules. Coverage targets will be reported honestly, including untested files.

Remaining: complete per-file review, full requirement matrix and API tests, frontend regression, measured performance, backlog repairs, final verification and release decision. External launch gates remain unverified.

## First repair verification

- FILE-SEC-001: failing transcript exposure regression reproduced, then fixed.
- FILE-SEC-002: failing contributor/editor audience regression reproduced, then fixed.
- FILE-API-001: cross-family export HTTP regression exposed escaping rejection; awaited the promise inside the error boundary.
- Combined suite: 93 passed (28 original unit + 23 original integration + 42 audit integration). Critical scope: 78.99% lines, 76.40% statements, 63.66% branches.
- Existing live browser journeys: 10 passed across desktop and Pixel7 emulation. Existing demo journeys:25 passed.
- Runtime advisory check:207 dependencies, zero advisories. Full dependency audit:one high build-only braces advisory with no patched release (GHSA-vfj7-8cjw-p6xm); reachability assessment remains documented work.

## Requested local retest — 14 October 2026

- Fresh TypeScript and ESLint passed; standalone unit suite: 28 passed.
- Full instrumented domain suite: 95 passed (28 unit, 23 original integration, 44 audit integration). Coverage: 79.08% lines, 76.48% statements, 63.79% branches, 80% functions. The 90% target remains unmet.
- FILE-LIFE-001: both deletion regressions reproduced before repair, then verified against the isolated test database. Unrelated project jobs survive deletion; cancellation after the grace deadline cannot restore partially erased media.
- Optimized application, standalone HTML and worker bundles built successfully. Live browser tests: 10 passed; demo/HTML browser tests: 25 passed. Fresh migrations, repeated migrations, local SMTP login delivery, worker heartbeat and encrypted backup restoration passed. See `local-test-results-2026-10-14.md`.
- Evidence: `local-*.log` in `artifacts/production/audit-2026-10-14/`; these generated logs are intentionally ignored by Git.

## Completed local audio/PDF follow-up

- FILE-PDF-001: independently reproduced an approved-version PDF pointer overwrite when composition rules change at the same revision. Commit `6862ba3` preserves original approved bytes and updates draft provenance consistently. Three PostgreSQL/storage/PDF regressions pass.
- FILE-AUDIO-FLOW-001 and FILE-BOOK-QR-001: blank private voice drafts, approved transcript publication, personal-book QR eligibility, narrator-only management tokens and live listening links are repaired. Desktop/mobile tests cover recording through code-protected listening.
- Final domain suite: **100 passed** across six files. Final live browser suite: **10 passed**. Final demo/HTML suite: **25 passed**. Total: **135 cases**, without counting duplicate focused runs.
- TypeScript, ESLint, both demo/live optimized builds, standalone HTML and worker builds passed. Final measured coverage is 79.32% lines, 76.77% statements, 64.84% branches and 80.40% functions. The 90% requirement is still unmet.
- Local working website health returned `ok` and login HTTP 200 at port 3100. Existing working data was preserved. Evidence and operational checks are summarized in `local-test-results-2026-10-14.md`; logs use the `final-` prefix.
- This completes the requested local test pass. The larger production audit remains in progress, including remaining source review, workflow gaps, provider acceptance, coverage and reports 05–15. No production launch is approved.
