# Hosted acceptance — 4 November 2026

Tested the real `https://www.filemoire.fr` frontend, Render API/worker, Neon
database/private object storage and Resend. These are agent-operated technical
checks using two owner-approved inboxes, not acceptance by real pilot families.

The test manuscript is **Recette technique — 4 novembre 2026**. Its story,
editor correction and solid-colour photo are explicitly fictional. No existing
family manuscript, paid order or printer job was changed.

| Flow | Observed result |
| --- | --- |
| Login | Fresh branded links delivered from `Filémoire <noreply@filemoire.fr>` and consumed successfully for the admin mailbox and the separate approved Gmail mailbox |
| Operations | Admin sign-in alone did not expose operations data; the MFA confirmation screen remained in force. No MFA credential was changed |
| Narrator | Created a personal manuscript, saved a fictional story, then read it in an independently authenticated browser session |
| Photo storage | Synthetic PNG uploaded through the deployed UI and rendered in narrator/editor views after explicit sharing |
| PDF | Downloaded a valid four-page A5 PDF (13,175 bytes). Approved/locked the manuscript; the approved download matched the reviewed PDF byte for byte. Withdrawing approval reopened editing |
| Invitation email | Editor invitation to the explicitly approved Gmail address was Delivered at 13:51 Europe/Paris; Resend message `01a1a69d-42ce-7c41-9d6f-73934b1fdbc8` |
| Recipient binding | The narrator account could not accept the invitation intended for Gmail; the intended Gmail account accepted it successfully |
| Privacy boundary | The accepted editor initially saw zero shared memories. The fictional story and image became visible only after the narrator changed that memory's visibility to the family editor |
| Suggestions | Editor submitted a fictional correction; the original text remained subject to narrator approval. Narrator accepted it and the editor's suggestions table showed **Acceptée** |
| Conflicting changes | An outdated narrator view received “Le livre a changé. Rechargez avant de réessayer.” Refreshing the revision allowed the sharing change without overwriting newer changes |
| Buyer | The same Gmail login could switch to Buyer. Dashboard, gifts, progress and orders rendered their expected empty states; orders finished loading with “Vos commandes, au même endroit.” No Operations role was offered to this account |

The PDF SHA-256 is
`4c27193decd162fb20575d462a273b63e3ffe41a2e3701cb8a7a599adc4edc93`.
Private screenshots and the PDF are saved under
`artifacts/production/acceptance-2026-11-04/` and are excluded from Git.

The fictional manuscript and its accepted editor invitation are retained for
review. Its question rhythm is paused and reminder/marketing options are off.
The two previously blank account display names were filled by these setup flows
as **Test Filémoire** and **Éditeur test**. No permanent deletion was performed.

Chrome's extension rejected local file upload even though it had previously been
enabled. The supported in-app browser upload completed successfully. Download
event capture also timed out; the supported download helper saved the actual PDF,
which was parsed and hash-checked. These automation limitations are not reported
as application upload/PDF failures.

Paid checkout, paid gift creation, purchaser tracking of a paid book, real refunds,
printer submission and physical book quality remain untested on live providers.
They require the missing business/provider setup and approvals. Device-specific
and human usability acceptance also remain pending.
