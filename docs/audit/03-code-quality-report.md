# Code quality review

In progress. Baseline lint, type check, 28 unit tests, 23 integration tests, production build and 25 demo browser tests passed. Passing those checks did not prove the privacy boundary complete.

Confirmed and reproduced:

| Ticket | Before repair | Root cause | Evidence |
|---|---|---|---|
| FILE-SEC-001 | Unapproved transcripts returned to non-narrators | Complete nested transcript spread after memory filtering | `src/server/projects.ts:195`; `sec001-before.log` |
| FILE-SEC-002 | Contributors read editor-only memories | Contributor grouped with editor despite narrower UI audience | `src/server/projects.ts:178`; `sec002-before.log` |
| FILE-API-001 | Cross-family export rejected outside API error mapper | Missing await inside try/catch | `src/server/api.ts:353`; initial `api-coverage.log` failure |

The fixes preserve existing architecture and use regression tests. The expanded combined suite currently passes 93 tests; final browser/type/lint/build checks are still being completed.

Maintainability observations: `src/components/live/workspace.tsx` is about 1,879 lines and `src/server/projects.ts` about 940. API routing uses a long dispatch function, not framework-generated per-endpoint schemas. Shared demo rules contain explicitly simulated preflight logic; keep it separated from real supplier approval. These are P2 maintainability concerns unless a concrete failure is demonstrated. No broad rewrite or removal is warranted.

Further review remains for browser demo files, tooling, history/secrets and dependencies. See the per-file ledger rather than assuming every listed file has been manually reviewed.
