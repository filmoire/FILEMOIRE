# Filémoire workspace UX contract

## Product context

Family storytelling, gifting and service operations. French/English interface, Gregorian dates formatted in the active locale; stored instants retain their existing semantics. Accessibility target: WCAG 2.2 AA. The supplied October 2026 screenshots govern appearance; simulated state and instructions in the reference HTML are not business policy.

## Business-context sources

`src/server/projects.ts` is authoritative for sharing, revisions, invitation transitions and narrator approval; `auth.ts` for session/MFA; `payments.ts` and `printing.ts` for paid entitlements; `support.ts` for support requests. `docs/PRODUCTION.md` and `docs/production/SECURITY-REVIEW.md` record deployment and privacy constraints. Reviewed 22 October 2026.

## Visual contract

See `DESIGN.md`. Scoped runtime tokens live in `src/app/dashboard.css`; existing public and printed-book tokens remain in Tailwind. No dark theme is introduced.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | `components/ui/input.tsx` Select | This contract | Native: OS popup accepted by supplied HTML | Keyboard and open popup |
| Date | Input type=date | Existing checkout contract | Native OS calendar accepted | Checkout locale/state tests |
| Form | Shared Input/Textarea and `live/form.tsx` | Server schemas | Explicit save, client constraint messages | Invalid submit and retry |
| Scrollbar | Global CSS | DESIGN.md | Native width, token colors, forced colors | Computed styles |
| Toast | `live/shell.tsx` Message | Existing live feedback | Persistent success/error live regions | E2E |
| CRUD | `live/client.ts` API + server commands | Server schemas/revisions | Stay inline after save; return to book after creation | E2E |
| Confirmation | Shared Dialog + live confirmation provider | Existing permission/domain rules | Async confirmation; guarded navigation | Focus, cancel, failure |

## Navigation and state

Role destinations are real links under `/espace`, identified by `role`, `vue`, and optional opaque project ID. Browser Back and reload restore destinations. Buyer and editor landing pages are available before a purchase or invitation, including their empty states. Project contents derive exclusively from authorized memberships; operations require server-provided admin status. Narrators retain their existing authoring workspace. Account creation retains the personal-book entry flow. Locale changes do not remount forms or recorders.

Search/filter/page state for operational lists is URL-owned. Search terms in the question catalogue are public editorial text; private support-message search is not offered. Tables use bounded server pages (25 rows), known totals, stable ordering and Previous/Next controls. Empty and no-results states are distinct; retry keeps the current context. No bulk selection is introduced.

## Forms and feedback

Use app-owned constraint messages and noValidate in modified forms. Preserve non-sensitive input after errors, focus the first invalid control, prevent duplicate submission and announce pending state. Native select/date popups remain platform-owned. Long textareas keep internal scrolling and sufficient height. Unsaved in-app navigation uses an accessible confirmation; actual tab close retains beforeunload protection. No local narrative cache is added.

## Permission and mutation boundaries

UI role selection never grants access. Buyer progress respects the narrator preference. Editors receive only current shared content; proposal history displays only their own safe metadata and never restores old private text. Operations display operational metadata; reading a book requires the existing expiring support grant and fresh MFA. Financial, printing and external-email actions retain their existing explicit confirmation and server gates. No external side effects are exercised against real customer data during design testing.

Changes are pessimistic. Version conflicts preserve entered text and ask for refresh; no silent overwrite or offline queue. Cancellation is available only before invitation acceptance. Deletion keeps the existing retention deadline. Errors remain visible with retry or correction, and a session/permission failure does not pretend to be an empty list.

## Route document title policy

Active destination followed by “· Filémoire”, localized, with no personal names. Existing public route title behavior remains intact. Unknown or unauthorized views fall back to the first allowed role destination; protected API calls retain their 403/404 policy.

## Verification

Existing live story/recording/PDF/locale tests plus role-dashboard tests cover navigation, real data, permission isolation, empty states, failure recovery, keyboard, narrow screens and language switching. Static skill audit evidence is stored under ignored `artifacts/production/design-2026-10-22/`.

## Designer completion — 26 October 2026

Gift preparation follows seven steps using the shared `Form`: package, journey, recipient, message, date/options, review and payment. Required fields validate before advancing. Previous steps and language changes retain controlled values in memory. Nothing is saved in browser storage; leaving the page warns about unsaved entries. Checkout uses `src/server/payments.ts` for authoritative totals, availability and terms. Each edited payload gets a new idempotency key; retries of the same payload reuse it. A closed checkout remains disabled and server enforcement is tested even with stale availability in the browser. Quote and extra-copy enquiries use the existing connected public contact form.

Operations list DTOs in `src/server/dashboard.ts` explicitly allow recipient/buyer names, package/options, invitation state, progress counts and image-quality counts. They exclude story text, captions, manuscript versions, media paths and delivery addresses. This metadata is separate from the fresh, expiring support-grant check used to read a book. Print transitions still use `src/server/printing.ts`; approved books awaiting a narrator request never start production from the operations list.

Support status controls persist open/in-progress/closed through `PATCH admin/support/:id` with fresh MFA and an expected-status check. Replied remains a status produced only by the reply command; changing a status cannot send mail. A previously sent reply cannot be sent twice. Question activation persists with the same optimistic revision checks as editing; inactive questions are excluded only from future journey generation. Existing book questions remain snapshots.
