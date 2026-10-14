# Working locally

Run `node scripts/local/start.mjs` from the repository. No provider account is required. The launcher starts a real PostgreSQL database, Mailpit, migrations, the Next.js website and the queue worker. It binds the web server to loopback, starts at port 3100, and selects the next available port if necessary. `FILEMOIRE_PORT=3200 node scripts/local/start.mjs` selects a different starting port. If this launcher is already running, a second invocation prints its address instead of starting duplicate workers.

## First use

1. Open the address printed by the launcher, normally http://localhost:3100.
2. Choose **Commencer mon histoire** and enter an email address. For local testing you can use a fictional address such as `writer@example.test`.
3. Open http://localhost:8025. Open the newest login message for that address, follow its link and choose **Confirmer ma connexion**.
4. Enter your name and book title, choose a theme, read the privacy information and create your private manuscript.
5. Answer a question. Drafts save automatically; **Enregistrer ma réponse** adds the finished answer to your book. Reloading the page preserves your work.
6. Add a photo or record audio beneath a saved memory. Without a transcription service, listen and type the transcript yourself; the original recording remains downloadable.
7. In **Famille**, invite another email address. Invitations also arrive in Mailpit. To test another person, use a separate browser profile or sign out first, sign in with the invited address and accept their invitation. Access still depends on each memory’s visibility setting.
8. In **Livre**, edit the cover and chapter order, download the PDF, then approve the manuscript. Personal manuscripts require no delivery address and cannot submit a print order. Remove approval before editing again.
9. In **Confidentialité**, export your story and media or schedule deletion with the displayed cancellation period.

Each account can hold five personal manuscripts. They have 52 immediately available questions, photos, audio and private audio links, and do not create an order or claim a purchased package. The original paid-gift workflow remains separate. Personal creation is controlled by `PERSONAL_DRAFTS_ENABLED`, enabled by the local launcher and disabled by default in general deployment configuration.

## Persistence and restarting

Press `Ctrl+C` in the launcher terminal to stop the website and worker. The database and inbox remain running. Use `docker compose -f compose.dev.yml stop` to stop those too. Restart with the same launch command; migrations are applied once and the saved encryption key is reused.

Keep these together in your backups:

- PostgreSQL data in the Docker named volume `<compose-project>_db_data`, normally `filemoire_db_data` for a clone named `FILEMOIRE` (use a database dump for a portable backup). The existing local checkout named `filemoire-prototype` uses `filemoire-prototype_db_data`.
- Encrypted media in `.private-media/`.
- The private key in `.env.filemoire.local`, stored with restricted access.

Do not delete the Docker volume or regenerate the key to fix a startup problem. Test suites use a separate database named `filemoire_test`; they do not use your local `filemoire` database.

## What runs locally

Authentication, authorization, story saves, family permissions, encrypted files, audio recording, PDF generation, approval, exports, scheduling and deletion requests use the real server implementation. Mailpit receives actual SMTP messages from the worker but does not deliver them outside this computer. Anyone with access to this local inbox can open its login links; this setup is for local development.

The launcher explicitly disables checkout, external transcription and printing. It does not change legal/commercial approval switches. Public hosting, verified email delivery, payments, automatic transcription and physical printing need their provider configuration and the launch checks in STATUS.md. This local setup is not a public deployment.

## Troubleshooting

- **Docker unavailable:** start Docker Desktop and rerun the command.
- **Missing FFmpeg:** install FFmpeg (including ffprobe), then rerun.
- **Dependencies missing:** use `corepack pnpm@10.28.0 install --frozen-lockfile`.
- **Port occupied:** the launcher finds a free website port automatically. PostgreSQL and Mailpit use 55432, 1025 and 8025; stop the conflicting service or adjust compose and local configuration together.
- **Expired login link:** request a new one and open the newest message. Links expire after 15 minutes and work once.
- **No message:** keep the launcher running so its worker can send queued mail. Check the local inbox, not your real email account.
- **Original prototype still visible:** use the address printed by this launcher. A separate `next dev` process may still be serving the demo on another port.

For an externally configured backend, use RUNBOOK.md instead of the local launcher.
