# FILE-SEC-001 — Redact unapproved audio transcripts

1. **ID:** FILE-SEC-001.
2. **Title:** Enforce transcript approval in server projections.
3. **Description:** Non-narrator API responses include unapproved audio transcript text that the UI hides.
4. **Requirement:** FILE-PRIV-001; deck slides 7–9 and 14, narrator control and correction.
5. **Business impact:** Family members/buyers can read draft transcription without narrator approval.
6. **Severity:** P0; private draft content exposure.
7. **Observed:** `projectView` filters audios by memory ID, then spreads the complete transcript object.
8. **Expected:** Only the narrator receives draft transcripts. Other authorized readers receive approved text only.
9. **Root cause:** Server projection omitted the transcript approval check used by the frontend.
10. **Files:** `src/server/projects.ts:181–225`; `src/components/live/workspace.tsx:458–460`; regression in `tests/production/audit.integration.ts`.
11. **Tasks:** Reproduce with buyer/editor/contributor and temporary support; redact unapproved text; verify approved text and narrator access remain intact.
12. **Database:** No schema/data migration.
13. **API:** Project list/detail response redaction.
14. **Frontend:** No new interface needed; existing intended rendering preserved.
15. **Security:** Protect both automatic `a_relire` and manually saved unapproved transcripts, including metadata added later.
16. **Dependencies:** None; local synthetic fixtures only.
17. **Acceptance:** No unapproved transcript text appears in non-narrator serialized views; narrator retains it; approved text remains visible to authorized readers.
18. **Unit tests:** Projection cases for each role/status.
19. **Integration tests:** Database-backed project reads with draft and approved transcripts.
20. **E2E tests:** Existing family privacy journey plus direct API assertions.
21. **Verification:** `pnpm test:integration`; `pnpm typecheck`; `pnpm lint`; `pnpm test:live`.
22. **Complexity:** Small.
23. **Status:** VERIFIED. Independently verified, confidence 9/10. No external dependency.

Evidence: baseline `projects.ts:195` keeps all audio objects belonging to readable memories; `209–214` spreads their full transcript. Worker `128–132` saves provider output as `a_relire`; command `639–647` supports unapproved text. The browser-only check does not secure JSON responses.

Verification: baseline regression failed before repair; expanded combined suite93 passed; live browser suite10 passed; typecheck/lint passed. Local synthetic fixtures only. Status history: BACKLOG → READY → IN_PROGRESS → IN_REVIEW → VERIFIED. Final release remains gated.
