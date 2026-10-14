# English and French interface

Use the **FR / EN** buttons in the header. French is the default. The selection is remembered in this browser and applies to public pages, sign-in, invitations, audio listening, the account workspace and the privacy page. It persists across navigation, reloads and sign-in. No paid translation service is used.

This is an interface preference. Personal stories, transcripts, names, captions and book titles remain as entered; changing the interface does not rewrite stored content or regenerate an approved PDF. Generated emails and the server-generated book’s fixed editorial text retain their existing language. Public fictional examples can be shown in English.

## Implementation

- Reuses `src/i18n/lang.ts`, the existing browser preference and the French-source English dictionary in `src/i18n/en.ts`.
- Live page roots subscribe to language changes without remounting forms or recorders. The live provider hydrates the preference and updates the document language and page title.
- JSX translation preserves React child positions, including empty conditional slots. Custom component data props are preserved; interface children are translated. User-authored text is explicitly marked `translate="no"`.
- Dates, currency in the gift form and confirmation dialogs follow the selected interface language. API error messages are translated for display; API request values and response contracts are unchanged.
- New page roots should subscribe to `useLang((s) => s.lang)`. Add new interface strings to the existing dictionary; protect user-authored content instead of using it as a translation key.

## Local verification

Language-specific desktop and emulated-mobile journeys cover both directions, persistence, public pages, sign-in, gift-form inputs, unsaved story/cover text, unchanged stored content and switching during actual MediaRecorder capture. Accessibility and horizontal-overflow checks run on the English privacy screen. Unit regressions cover child-slot stability and protection of manuscript data. Final verification against application commit `9424f5b`: **102 domain tests, 14 live browser tests and 25 demo/HTML browser tests passed** (141 total, excluding repeated focused runs). TypeScript, ESLint, both live/demo optimized builds and the standalone HTML build passed. The local working site returned health `ok` and sign-in HTTP 200.

Generated evidence is under `artifacts/production/language-2026-10-14/` (ignored by Git). Testing uses the isolated `filemoire_test` database; working local manuscripts are preserved.
