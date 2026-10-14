# Pilot and release acceptance

No real families have been recruited or contacted, and no book has been ordered. Those outcomes cannot be replaced by seeded test accounts or generated PDFs.

## Before recruitment

The owner confirms the three paid plans, question catalogue, commercial prices and entitlements; approves legal and privacy documents; selects hosting, SMTP, transcription and print providers; and assigns a support owner. Configure and test staging, monitoring and backup restoration. Complete the security and accessibility reviews. Keep sales and printing disabled until their gates are met.

## Controlled pilot

Recruit 30 consenting families through the owner's approved process. Use pseudonymous IDs in the measurement sheet, keeping contact details in the protected operational system. Include users who need larger text, people unfamiliar with recording controls, varied devices, voices and accents. Start with a small first group to resolve usability failures before expanding the cohort.

Measure invitation delivery and activation, first-answer completion, successful draft recovery after interruption, photo/audio upload failures, transcription correction burden, weekly answer participation and support minutes. Test private versus family/editor visibility, invitation revocation, export and deletion with participants. Record actual outcomes in `pilot-results.csv`; it is intentionally empty.

Produce five physical books using the selected printer and the exact approved PDF. Check dimensions, trim and bleed, binding/spine, colour, image resolution, font rendering, page order, cover, packaging, address accuracy and tracking. Scan every printed QR from devices other than the narrator's, verify access-code failure and revocation, and test the intended long-term hosting arrangement. Obtain named acceptance of each physical book and resolve every material defect.

## Device and accessibility acceptance

Automated Chromium desktop/mobile and axe checks are included. Also test Safari/iPhone, Android hardware, desktop browsers, real microphone permissions, slow/interrupted connections, VoiceOver/TalkBack/NVDA, keyboard-only interaction, zoom and actual senior users. Simulated microphone hardware and emulated phone viewports are not substitutes.

## Go-live record

Attach evidence for each field in `deployment/launch-evidence.example.json`, record open risks and owners, then run the readiness command. The command validates presence and technical state; a human must verify the evidence. Require owner sign-off, functioning support, alerts, supplier capacity and a rollback rehearsal before removing cohort limits or publishing live sales.
