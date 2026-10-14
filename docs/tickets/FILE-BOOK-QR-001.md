# FILE-BOOK-QR-001 — Consistent audio QR preview for personal books

1. **ID:** FILE-BOOK-QR-001
2. **Title:** Consistent audio QR preview for personal books
3. **Description:** Personal projects allow audio links but shared book composition drops them; narrator API redacts tokens and preview points to a disabled demo route.
4. **Requirement:** FILE-AUDIO-003, FILE-BOOK-002; deck slide 9; existing personal manuscript promise.
5. **Business impact:** Approved personal books omit the enabled QR, or the screen preview targets an unavailable page.
6. **Severity:** P1 output correctness.
7. **Observed:** Package-only QR eligibility, unconditional token redaction, /ecouter demo URL.
8. **Expected:** Personal QR appears in preview and PDF and uses live /ecoute fragment URL; only narrator can retrieve management token.
9. **Root cause:** Live and demo output paths/entitlements are mixed.
10. **Files:** src/lib/rules.ts; src/server/projects.ts; src/components/book/viewer.tsx.
11. **Implementation tasks:** Include personal QR entitlement; preserve narrator token only; route live QR to /ecoute#token=; add regressions.
12. **Database impact:** None.
13. **API impact:** Narrator receives its existing token; other roles remain redacted.
14. **Frontend impact:** Preview targets the same listening route as PDF.
15. **Security considerations:** Never expose token in other role snapshots; family code remains required; existing revocation stays enforced.
16. **Dependencies:** Physical printed scan requires an externally approved print sample.
17. **Acceptance criteria:** Personal composition includes enabled approved audio, narrator QR points to live route, all other role snapshots redact token.
18. **Unit tests:** Personal composition and package regression.
19. **Integration tests:** Narrator/non-narrator response boundaries.
20. **E2E tests:** Voice-first personal manuscript preview QR and protected listen page.
21. **Verification commands:** pnpm test; pnpm test:integration; pnpm test:live; pnpm typecheck; pnpm lint.
22. **Complexity:** Small.
23. **Status:** VERIFIED — domain regressions and all 10 live desktop/mobile journeys passed on 14 October 2026.
