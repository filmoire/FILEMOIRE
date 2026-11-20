# Invitation, editor and media acceptance — 20 November 2026

## Live manual checks

Target: `https://www.filemoire.fr`, using separate existing narrator and editor accounts and the fictional book **QA transcription — 20 novembre 2026**.

- The invitation from `noreply@filemoire.fr` was present in the recipient inbox. It had been opened for QA and was marked read.
- Signing in alone had not accepted the invitation. Clicking **Accept invitation** successfully granted the intended family-editor membership.
- The editor could open the one shared fictional memory and submit a correction.
- The original text remained unchanged after submission. **My suggestions** displayed the correction as **To approve**.
- The editor did not have narrator controls for book validation or story ownership.
- The admin account's Operations workspace required its authenticator check; it was not bypassed.
- The narrator's authorized sign-in email was found in the correct Gmail inbox at 15:02 Paris time. It was grouped into an existing conversation; provider acceptance was independently confirmed by actual mailbox receipt.
- The existing Chrome session had completed narrator sign-in and the correction was already approved. After refreshing the live QA book, the account was **Zain Subhani**, the workspace was **Storyteller**, and the memory contained the proposed change: **roses rouges et blanches**. The pending suggestion controls were gone. The agent verified the resulting state rather than performing or witnessing the approval click.

## Live media and transcription checks

The user authorized a fresh sign-in email for the isolated in-app browser. The message arrived at 15:13 Paris time and the normal confirmation flow opened the narrator's existing account.

- Uploaded a benign PNG illustration to the fictional QA memory. Transfer completed and the private image rendered at its expected 640 × 138 resolution. Edited and saved its caption as **TEST QA — illustration de contrôle, sans photo personnelle.**
- Uploaded a 4.593625-second synthetic French WAV through the actual audio file input. The production transcription worker returned **Awaiting review** and the expected spoken text: **Ceci est un test technique. Ma grand-mère cultivait des roses dans son jardin.**
- Played the saved audio through the page's player. Playback progressed, its duration matched the fixture, media readiness was complete, and the player reported no error.
- Edited the generated transcript to label it as synthetic QA content, then approved it through the narrator UI. The status changed to **Approved**, with **Transcript approved.** confirmation and **Add to story** enabled.
- Added the approved transcript to the fictional memory. **Transcript added to the memory.** appeared and the original approved correction remained intact above the appended text.
- Reloaded the page and waited for the authenticated workspace to load. The QA book, corrected story, appended transcript, approved transcription status, saved photo caption and rendered image all persisted. Browser console checks returned no warnings or errors.

The browser's Playwright click opened a comment focus instead of the file chooser; the supported native accessibility click opened the chooser successfully. File selection took longer than expected in the automation bridge. These limitations are distinct from the completed application upload and transcription behavior.

## Issue fixed

After invitation acceptance, the app navigated to `/espace` without the invited book. An account with Operations privileges or its own manuscript could therefore land in a different workspace and appear to have lost the invitation.

Acceptance now carries the server-returned project ID into the dashboard URL. When no explicit workspace is requested, the dashboard selects the role from that book's server-authorized membership and opens shared-book content for editors/contributors. Explicit workspace links continue to take precedence. The accept button is disabled while the request is pending.

## Automated verification

An isolated localhost PostgreSQL database and local app server exercised three recipient configurations, each on desktop and mobile:

1. An operations account that also owns a manuscript, invited as editor.
2. An existing narrator invited as editor to another book.
3. An existing narrator invited as a contributor without suggestion rights.

All **6 tests passed**. They cover acceptance, correct-book routing, reload persistence and role restrictions. Editor cases also prove the original stays unchanged, editor self-approval returns HTTP 403, and a narrator-authorized approval updates both the shared memory and suggestion status.

The frontend production build, lint/types and frontend backend-dependency isolation check passed.

The full [GitHub CI run 44747598241](https://github.com/filmoire/FILEMOIRE/actions/runs/44747598241) completed successfully for commit `8dc20ce377b594bb40dd12049b54b55d42722754`, including live end-to-end tests and the Vercel frontend / Render backend topology checks.

## Scope and limitations

- The requested pending checks are complete: live narrator approval state, manual photo/audio upload and transcript review, and full CI for the deployed code change.
- Audio testing used an uploaded synthetic file. It does not certify a physical microphone, device permissions or every browser/device combination.
- No ambient microphone audio was recorded, no real payment was made, and no actual family story was changed.

This report does not certify full production readiness or completion of unrelated launch requirements.
