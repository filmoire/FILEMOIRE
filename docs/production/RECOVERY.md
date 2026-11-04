# Recovery and monitoring — 4 November 2026

## Verified recovery

The fresh private snapshot `artifacts/production/cloud-backup-Pgx2k5` was taken
on 4 November at 13:48 Europe/Paris and verified first in a temporary,
network-isolated PostgreSQL 18 container, then on Neon:

```
PASS cloud database dumped with verified TLS
PASS 6 encrypted objects copied; referenced media hashes verified
PASS restored 22 tables and decrypted 5 project payloads
PASS hosted restore: 22 tables and 5 decrypted projects
PASS hosted storage restore: 6 encrypted objects and 6 referenced media hashes
PASS production database and media unchanged; drill resources expire with their branch
```

The hosted drill used branch `br-lively-bread-b9ngel7t`
(`recovery-drill-20261104`) in project `bold-lake-94447602`. It expires on
4 November at **16:00 Europe/Paris**. The script created a new empty database and
a new private bucket there; it did not overwrite either production or the
branch's inherited data. No web server or worker was started against restored
sessions/jobs. The private `hosted-restore.json` beside the snapshot records the
exact database and bucket names. This verifies restoration, not a production
cutover or application rollback.

The production project currently retains six hours of recovery history. Its
snapshot schedule returned an empty list. Neither fact constitutes an independent
scheduled backup or an off-device encryption-key backup.

## Repeat safely

1. Take a fresh snapshot with `scripts/production/backup-cloud.mjs`, using the
   production direct database URL, private storage settings and **matching
   production encryption key**. Keep that key separate from the snapshot.
   The earlier `.env.local` staging key is different: do not substitute it.
2. Create an isolated `recovery-drill-*` Neon branch with an expiry within
   24 hours. Use an explicit project/parent ID, `--no-secrets`, and the default
   suspension setting on Free (a custom interval is rejected).
3. Pull that branch's Postgres/object-storage variables into a **new private,
   Git-ignored file**, never into the existing production env file. Inspect the
   branch metadata returned by Neon and save `projectId`, `branchId`,
   `branchName`, `host`, and `expiresAt` in a target JSON file.
4. Run:

   ```sh
   node --import tsx scripts/production/restore-hosted.mjs \
     /absolute/private/backup-directory \
     /absolute/private/drill-branch.env \
     /absolute/private/production-key.env \
     /absolute/private/drill-target.json
   ```

The script rejects the production database host, pooled endpoints, normal branch
names, expired/non-temporary targets, cross-branch storage and invalid object
paths before connecting. It restores into a new randomly named database, checks
all table counts, decrypts project payloads, restores encrypted objects to a new
private bucket, downloads them and checks ciphertext and referenced plaintext
hashes. PostgreSQL uses verified TLS. There is no `DROP DATABASE` or `--clean`
operation. Guard regression tests cover production-host and storage isolation.

Treat database dumps as confidential: account metadata is not covered by the
application's per-payload encryption. The current snapshots are private local
files, not encrypted off-device archives. Do not upload them to a public/shared
folder or commit them to Git. Branch expiry removes the temporary cloud drill;
retain the local evidence according to the owner's future retention policy.

## Availability monitoring

`.github/workflows/monitor.yml` runs anonymously four times daily (00:23, 06:23,
12:23, 18:23 UTC) and can be started manually. It checks homepage content, the
sign-in form, database health **through the Vercel-to-Render proxy**, the catalog
and the PNG logo. Each failure is retried once, with a bounded request timeout
for cold starts. It uses no production credentials, cookies or private data,
does not send email or create accounts, and is not a keep-awake workaround for
Render Free.

Failures make the GitHub Actions run fail. The owner must enable/verify their
GitHub Actions failure notifications and nominate an incident responder before
calling alerts operational. This monitor does not inspect worker heartbeats,
queue failures, storage capacity or email delivery. Those need a protected
monitoring connection and an agreed alert destination.

## Pending owner inputs

The owner confirmed on 4 November that backup storage/key vault are **not ready**.
Therefore the following remain pending:

- A private off-device backup destination, archive encryption, retention and
  scheduled execution with least-privilege credentials.
- Separately protected encryption-key escrow, with a second recovery operator
  and a tested key retrieval process.
- Alert recipient/ownership, failure-notification delivery test and protected
  worker/queue monitoring.
- Deletion reconciliation when restoring old backups, and an application
  cutover/rollback rehearsal.

Do not describe the successful restore drill as completion of these items.

## Additional local preparation

The age-encrypted archive helper and protected worker/queue monitor are now implemented and tested. No private backup destination/vault or live monitor credential has been configured. See [LAUNCH-HANDOFF.md](LAUNCH-HANDOFF.md) for commands, safeguards and activation steps. These additions do not change the pending off-device backup, alert-delivery or cutover status above.
