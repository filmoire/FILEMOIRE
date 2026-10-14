# FILE-SEC-002 — Respect the editor-only sharing audience

1. **ID:** FILE-SEC-002.
2. **Title:** Respect the editor-only sharing audience.
3. **Description:** Contributors receive memories labeled editor-only..
4. **Requirement:** FILE-PRIV-001; deck slides 7–9, narrator-controlled sharing.
5. **Business impact:** Content disclosed beyond the chosen audience.
6. **Severity:** P0.
7. **Observed:** readable includes contributor when visibility is editeur.
8. **Expected:** editeur is narrator/editor only; famille includes invited contributors.
9. **Root cause:** Contributor was grouped with editor in the server predicate.
10. **Files:** src/server/projects.ts:170–180; src/lib/rules.ts:117–121.
11. **Implementation tasks:** Narrow predicate; test roles and media; clarify family label without expanding access.
12. **Database impact:** None.
13. **API impact:** Filter project lists/detail, suggestions and media consistently.
14. **Frontend impact:** Explain contributor access in invitation UI.
15. **Security considerations:** Do not broaden the selected audience or rely on UUID secrecy.
16. **Dependencies:** None.
17. **Acceptance criteria:** Contributor cannot read or suggest editor-only content; shared family content still works.
18. **Unit tests:** Full role/visibility truth table.
19. **Integration tests:** Real invitation, private media and read/write denial regression.
20. **E2E tests:** Contributor browser/API denial.
21. **Verification commands:** pnpm test:integration; pnpm typecheck; pnpm test:live.
22. **Complexity:** Small.
23. **Status:** VERIFIED.

Verification: baseline regression failed before repair; expanded combined suite93 passed; live browser suite10 passed; typecheck/lint passed. Local synthetic fixtures only. Status history: BACKLOG → READY → IN_PROGRESS → IN_REVIEW → VERIFIED. Final release remains gated.
