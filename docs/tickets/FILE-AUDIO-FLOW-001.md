# FILE-AUDIO-FLOW-001 — Voice-first writing and transcript completion

1. **ID:** FILE-AUDIO-FLOW-001
2. **Title:** Voice-first writing and transcript completion
3. **Description:** Recording controls require an existing text memory; adding a transcript leaves a draft unfinished.
4. **Requirement:** FILE-AUDIO-001, FILE-STORY-001; deck slides 8–9.
5. **Business impact:** Narrators cannot tell their story by voice without typing unrelated text first.
6. **Severity:** P1 MVP workflow blocker.
7. **Observed:** Blank answer rejected; recording rendered only under existing memory; transcript uses memory edit instead of final answer.
8. **Expected:** Create a private blank draft explicitly for recording, then finish it after the narrator approves and adds the transcript.
9. **Root cause:** Text validation applies to both drafts and final answers; transcript addition does not transition question/memory state.
10. **Files:** src/server/projects.ts; src/components/live/workspace.tsx.
11. **Implementation tasks:** Permit empty drafts only; add voice entry action; publish approved transcript through answer command; keep form synchronized when safe.
12. **Database impact:** No migration. Existing draft and question states.
13. **API impact:** Final empty answers still rejected; narrator ownership and revision guard retained.
14. **Frontend impact:** Accessible voice entry and saved/finished feedback.
15. **Security considerations:** Draft remains unavailable to other roles and excluded from the book; only approved transcript is added.
16. **Dependencies:** None for local manual transcription. Automatic provider remains separately blocked.
17. **Acceptance criteria:** A narrator starts with no typed story, records, reviews, approves, adds text and sees it persist in the book after reload.
18. **Unit tests:** Existing composition rules.
19. **Integration tests:** Blank draft privacy, empty final rejection, final composition.
20. **E2E tests:** Real Chromium MediaRecorder on desktop and emulated mobile, starting with no memory.
21. **Verification commands:** pnpm test:integration; pnpm test:live; pnpm typecheck; pnpm lint.
22. **Complexity:** Medium.
23. **Status:** VERIFIED — domain regressions and all 10 live desktop/mobile journeys passed on 14 October 2026.
