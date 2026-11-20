# Invitation and editor acceptance — 20 November 2026

## Live manual checks

Target: `https://www.filemoire.fr`, using the existing admin-dev account and the fictional book **QA transcription — 20 novembre 2026**.

- The invitation from `noreply@filemoire.fr` was present in the recipient inbox. It had been opened for QA and was marked read.
- Signing in alone had not accepted the invitation. Clicking **Accept invitation** successfully granted the intended family-editor membership.
- The editor could open the one shared fictional memory and submit a correction.
- The original text remained unchanged after submission. **My suggestions** displayed the correction as **To approve**.
- The editor did not have narrator controls for book validation or story ownership.
- The admin account's Operations workspace required its authenticator check; it was not bypassed.

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

## Remaining manual acceptance

- Approval of this live correction by the actual narrator remains untested. The available admin-dev account is the editor of this book. Selecting its Storyteller role does not make it that book's narrator. The user chose to continue with the admin-dev account.
- Live audio/photo upload and transcript review still need completion; previous browser-extension file chooser attempts were blocked. Automated transcription checks do not substitute for that manual upload check.
- No ambient microphone audio was recorded, no real payment was made, and no actual family story was changed in this invitation test.

This report does not certify full production readiness or completion of all manual QA.
