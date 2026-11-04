# Legal/privacy and refund drafts — 4 November 2026

`/legal` contains a French/English working draft, not approved launch documents.
The text is maintained in `src/content/legal.ts`. Both languages must be updated
together. Existing privacy links continue to point to `/legal`.

The owner requested publication of version 0.2 on 4 November, keeping its
working-draft status. Publication is not recorded as legal/commercial approval.
Shareable French and English copies are
under `docs/legal/PRIVACY-POLICY.{fr,en}.md` and
`docs/legal/TERMS-REFUNDS.{fr,en}.md`, exported from that same content.

## Details supplied by the owner

- Name: **Intertrad**. Its exact legal identity/form has not been verified.
- Location: **Paris, France**. Street address and postcode remain missing.
- Registration/VAT: owner answered **“no”**. This is recorded as no number
  supplied, not as a claim of exemption or that registration is unnecessary.
- Support/privacy email: **admin-dev@filemoire.fr**, now explicitly designated
  by the owner for these drafts. Owner must ensure the inbox is monitored.

The draft includes service use, limited content permissions, privacy, gift
invitations, withdrawal, refunds/returns, personalised books, statutory
guarantees, complaints and a withdrawal template. Paid offers remain prospective;
no price, printer, delivery promise or discretionary refund benefit is invented.

## Facts checked against the application

- `src/server/auth.ts`: single-use 15-minute login link, 7-day session cookie.
- `src/server/projects.ts`: recipient-bound 30-day invitations, role permissions,
  configurable project-deletion cancellation period.
- `src/server/worker.ts`: deferred deletion removes current project content/media;
  it does not certify cloud-version or backup erasure.
- `src/server/security.ts`, `storage.ts`, `media.ts`: application encryption,
  server-side decryption and photo metadata removal, not end-to-end encryption.
- `src/components/live/workspace.tsx`: preferences, project export, project
  deletion and temporary support access. No account-wide self-service erasure.
- `src/i18n/lang.ts`, `src/components/live/client.ts`: local language preference
  and session-scoped upload identifiers. No advertising/analytics integration
  was found in application source; hosting settings need separate review.
- The test topology uses Vercel, Render, Neon and Resend. The beta launcher
  disables checkout, printing and automatic transcription.

## Owner completion before approval

1. Confirm Intertrad's legal identity/form, applicable registration/VAT status,
   full business address and publication director.
2. Confirm a monitored process for the supplied email, provide a business
   telephone and identify a DPO only if one has actually been appointed.
3. Verify hosts' legal identities/contact details, processor contracts, locations,
   subprocessors and international-transfer arrangements. No claim of exclusively
   EU processing is made.
4. Validate each lawful basis and the handling of sensitive/third-party data and
   minors. Proposed contract/security/consent bases are explicitly provisional.
5. Decide and implement retention for accounts, inactive books, expired tokens,
   invitations, support, audit logs, provider records and backups. Token expiry
   is not deletion. Define account-wide rights handling and restore reconciliation,
   then replace the draft retention limitations with actual policy.
6. Review the terms and any future commercial/refund/printing terms for the launch
   scope. Current draft terms cover testing only and waive no statutory rights.
7. Review both languages and publish completed text before recording approval.

## Sales launch decisions and implementation still needed

- Approve package duration, content, final prices/tax, extra copies, shipping
  costs/territories and promised deadlines; identify the actual printer.
- Decide the additional commercial remedy for an unaccepted/expired gift,
  separate from mandatory consumer rights. Invitation expiry at 30 days is not
  an automatic refund or a waiver of rights.
- Classify each digital/service/physical component. Implement any required
  separate express early-performance/withdrawal acknowledgements and durable
  confirmations; approving a PDF must not silently waive consumer rights.
- Implement and test the free customer-facing online withdrawal function with
  durable acknowledgement required for relevant online contracts from
  19 June 2026 (Consumer Code L221-21). The current admin-only refund endpoint
  does not provide this customer function. Email alone is not its substitute.
- Supply a return address/process, including who pays permissible return costs.
  Final terms need the applicable statutory guarantee information panels
  under decree 2022-946; generic guarantee text is not the final required panel.
- Join the appropriate consumer mediation scheme and publish its actual name,
  postal address and website. No mediator is presumed to be appointed.

These items are owner/legal review and implementation requirements, not
statements that the preview already satisfies them. A qualified French legal
review of the completed documents is recommended before commercial use.

No launch-approval, consent-version, payment, access or environment setting is
changed by this content update. Publishing a draft does not set `LEGAL_APPROVED`.
The legal review remains a separate owner responsibility.

## Official references consulted

- https://entreprendre.service-public.gouv.fr/vosdroits/F37351?lang=fr
- https://www.cnil.fr/fr/informer-les-personnes
- https://www.cnil.fr/fr/les-bases-legales
- https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- https://www.cnil.fr/fr/mes-demarches/les-droits-pour-maitriser-vos-donnees-personnelles
- https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032226844
- https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/delais-de-reflexion-ou-de-retractation-comment-sappliquent-t-ils
- https://entreprendre.service-public.gouv.fr/vosdroits/F33338
- https://www.service-public.gouv.fr/particuliers/vosdroits/F11094
- https://www.legifrance.gouv.fr/eli/decret/2022/6/29/2022-946/jo/texte

These sources guide the draft; they do not approve Filemoire or its configuration.
