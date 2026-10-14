# FILE-API-001 — Map asynchronous export errors consistently

1. **ID:** FILE-API-001.
2. **Title:** Map asynchronous export errors consistently.
3. **Description:** Returning the export Promise without await bypasses the handler catch..
4. **Requirement:** Derived operational API requirement.
5. **Business impact:** Forbidden or failed exports produce an unhandled framework response instead of safe structured error.
6. **Severity:** P1.
7. **Observed:** Cross-family export rejects handleApi with HttpError instead of returning404.
8. **Expected:** Return safe404/403/503 JSON for pre-stream failures; preserve safe stream error behavior.
9. **Root cause:** Missing await inside try/catch.
10. **Files:** src/server/api.ts:353.
11. **Implementation tasks:** Await export before returning; keep ownership assertion regression.
12. **Database impact:** None.
13. **API impact:** Standard response shape and request ID.
14. **Frontend impact:** Existing client receives understandable failure.
15. **Security considerations:** Never reveal database or private story data in errors.
16. **Dependencies:** None.
17. **Acceptance criteria:** Cross-family export returns404; narrator export still downloads; failed storage does not expose internals.
18. **Unit tests:** Not separately required; meaningful handler integration test.
19. **Integration tests:** HTTP cross-family export test that failed before repair.
20. **E2E tests:** Existing narrator export journey.
21. **Verification commands:** pnpm test:integration; pnpm typecheck; pnpm lint.
22. **Complexity:** Small.
23. **Status:** VERIFIED.

Verification: baseline regression failed before repair; expanded combined suite93 passed; live browser suite10 passed; typecheck/lint passed. Local synthetic fixtures only. Status history: BACKLOG → READY → IN_PROGRESS → IN_REVIEW → VERIFIED. Final release remains gated.
