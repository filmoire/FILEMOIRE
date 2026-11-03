# Legal/privacy draft — 3 November 2026

`/legal` contains a French/English working draft, not approved launch documents.
The text is maintained in `src/content/legal.ts`. Both languages must be updated
together. Existing privacy links continue to point to `/legal`.

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

1. Confirm the actual legal operator/data controller, legal form, applicable
   registration/VAT details, business address and publication director.
2. Supply monitored contact email/telephone and privacy contact/DPO if appointed.
   The known developer login email has not been assigned this role.
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

No launch-approval, consent-version, payment, access or environment setting is
changed by this content update. Publishing a draft does not set `LEGAL_APPROVED`.
The legal review remains a separate owner responsibility.

## Official references consulted

- https://entreprendre.service-public.gouv.fr/vosdroits/F37351?lang=fr
- https://www.cnil.fr/fr/informer-les-personnes
- https://www.cnil.fr/fr/les-bases-legales
- https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- https://www.cnil.fr/fr/mes-demarches/les-droits-pour-maitriser-vos-donnees-personnelles

These sources guide the draft; they do not approve Filemoire or its configuration.
