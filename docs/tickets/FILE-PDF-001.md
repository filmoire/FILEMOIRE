# FILE-PDF-001 — Preserve approved PDF bytes across composition changes

1. **ID:** FILE-PDF-001
2. **Title:** Preserve approved PDF bytes across composition changes
3. **Description:** A change in book composition at the same persisted revision caused the proof upsert to replace an approved version's PDF pointer while retaining its old approval and content hash.
4. **Requirement:** Final approval must identify the exact reviewed artifact; derived production integrity requirement.
5. **Business impact:** A narrator downloading an approved historical version could receive bytes they had not approved.
6. **Severity:** P1 document integrity; independent verifier severity 5/10, confidence 10/10.
7. **Observed:** The old hash-qualified lookup missed the approved revision; the unconditional conflict handler overwrote its media pointer. The personal-book QR change supplies a real composition-change prerequisite.
8. **Expected:** Approved versions retain their original PDF and provenance. Missing approved artifacts fail safely. Draft regeneration updates its snapshot and hash together.
9. **Root cause:** Revision conflict handling did not distinguish approved artifacts from mutable drafts.
10. **Files:** src/server/proofs.ts:15–69; tests/production/proofs.integration.ts.
11. **Implementation tasks:** Retrieve the latest approved version for locked books, preserve its bytes after preference revisions, fail on missing approved media, restrict upsert to drafts and update draft provenance atomically.
12. **Database impact:** No schema migration; existing version rows remain authoritative.
13. **API impact:** Default proof downloads retain the approved version; missing approved media returns 503.
14. **Frontend impact:** To include newer composition rules in an approved book, the narrator must reopen it, review the new PDF and approve again.
15. **Security considerations:** No cross-project exploit was found. This finding does not prove unapproved printing: print submission separately checks content hashes. No production records were modified during verification.
16. **Dependencies:** None for the local repair. Restoration of an already missing historical PDF requires its original backup.
17. **Acceptance criteria:** Default and explicit-version downloads preserve approved bytes and all approval fields after changed fingerprints and preference revisions; missing approved media cannot trigger regeneration; regenerated drafts update hash and payload.
18. **Unit tests:** Existing book-hash and composition tests.
19. **Integration tests:** Three real PostgreSQL/storage/PDF regressions in proofs.integration.ts.
20. **E2E tests:** Existing desktop/mobile PDF review, approval and download workflow.
21. **Verification commands:** pnpm exec vitest run --config vitest.audit.config.mts --coverage; pnpm test:live; pnpm typecheck; pnpm lint.
22. **Complexity:** Small.
23. **Status:** VERIFIED — 100 domain tests and all 10 live desktop/mobile journeys passed on 14 October 2026.
