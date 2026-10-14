# FILE-LIFE-001 — Isolate project cleanup and enforce the cancellation deadline

1. **ID:** FILE-LIFE-001.
2. **Title:** Safe scope and recovery boundaries for deletion.
3. **Description:** Cleanup infers job ownership from email-body substrings and cancellation remains possible after destructive cleanup begins.
4. **Requirement:** FILE-PRIV-002/004; deck14 deletion and privacy; derived recovery requirement.
5. **Business impact:** Another family's future invitation can disappear; late cancellation can restore records pointing at deleted media.
6. **Severity:** P1 integrity/recovery blocker for hosting real family data.
7. **Observed:** Global job scan deletes bodies containing narrator email; cancel-deletion unconditionally clears deletion_at.
8. **Expected:** Delete only exactly associated project jobs. Cancellation works during the disclosed grace period and is rejected when the deadline has passed.
9. **Root cause:** Email substring is not an ownership boundary; external object deletes cannot roll back with SQL.
10. **Files:** src/server/worker.ts:145–189; src/server/projects.ts:750; tests/production/audit.integration.ts.
11. **Implementation tasks:** Add foreign-project job survival and late-cancellation regressions; scope job deletion by projectId; check cancellation deadline under project lock.
12. **Database impact:** No schema migration required; existing deletion_at is the disclosed deadline and cleanup already locks the project.
13. **API impact:** cancel-deletion returns409 once destruction is eligible; repeated cleanup remains idempotent.
14. **Frontend impact:** Explain expired cancellation through standard error; do not promise recovery after deadline.
15. **Security considerations:** Preserve unrelated family jobs; do not restore incomplete data after irreversible object deletion.
16. **Dependencies:** None for local fix; cloud backup deletion remains separate externally blocked work.
17. **Acceptance criteria:** Same/suffix recipient email in a different project's job never causes deletion; pre-deadline cancel still succeeds; post-deadline cancel fails, including after partial storage failure.
18. **Unit tests:** No mirrored predicate-only test; use database-backed workflow.
19. **Integration tests:** Due deletion with another family's scheduled gift; partial delete then cancel then successful retry.
20. **E2E tests:** Existing narrator privacy/deletion UX; deadline response via API.
21. **Verification commands:** pnpm test:integration; pnpm typecheck; pnpm lint.
22. **Complexity:** Small.
23. **Status:** VERIFIED. Both regressions failed before the repair and passed after it. The fresh local suite passed 95 unit/integration cases, TypeScript and ESLint on 14 October 2026. Independent tracing confidence: 10/10 for job scope and 9/10 for cancellation recovery. Evidence: `life001-before.log`, `life001-after.log`, `local-integration-coverage.log` under the ignored audit artifact directory.
