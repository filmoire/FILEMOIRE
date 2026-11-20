# Saved audio transcription

The selected preview provider is Groq Free, using multilingual `whisper-large-v3`.
This transcribes the saved recording in its spoken language; it does not use browser dictation or automatically translate the story to English.

## Activate

1. Confirm **Free / $0 / Current Plan** in the Filemoire Groq account. Do not upgrade to Developer. The application cannot inspect or enforce the provider's billing plan; the operator must keep it Free.
2. Create a project API key and store it privately, never in Git or chat. Local connection settings go in the Git-ignored `.env.filemoire.transcription`.
3. Review Groq's Data Controls and enable Zero Data Retention for inference if required by the operator. Reflect the selected processor in the published privacy information before enabling it for real user recordings.
4. Set these **server-only** variables on Render's backend/worker (not Vercel, and never `NEXT_PUBLIC_*`):

   ```dotenv
   GROQ_FREE_TIER=true
   TRANSCRIPTION_URL=https://api.groq.com/openai/v1/audio/transcriptions
   TRANSCRIPTION_MODEL=whisper-large-v3
   TRANSCRIPTION_API_KEY=<private Groq API key>
   ```

5. Deploy the code that supports this free-tier opt-in first, then restart the Render backend and worker with the settings. The old free-beta startup check rejects external transcription. Partial configuration or an unapproved endpoint/model remains rejected by the new check.
6. Send a synthetic spoken recording through the provider and check its actual transcript, then test upload → queued job → reviewable text → edited/approved text → reload in an isolated account. A mocked provider test is not evidence of speech quality. Do not send existing private stories for testing.

## Behaviour and limits

- New recordings and uploads queue transcription after successful storage. The narrator sees a processing state; the page refreshes pending transcriptions every five seconds while visible and without an unsaved draft/recording.
- Recordings saved before activation can be submitted with **Transcrire cet audio**, with explicit confirmation. Only the narrator can request it. Reviewed text, locked/deleted books and duplicate concurrent requests are protected.
- The original audio remains encrypted in application storage. An HTTPS multipart request sends a processing copy to Groq; no public audio link is created. Files above 24 MB are locally converted to 16 kHz mono / 48 kbps MP3 before submission. Temporary files are removed after success/failure. The existing 60-minute upload cap is preserved.
- Groq currently documents a 25 MB Free upload limit and shared limits of 7,200 audio seconds/hour and 28,800/day. The exact account limits take precedence. Rate limits can delay transcription; the worker uses its existing bounded retry policy and eventually exposes a retry action. Never enable a paid fallback.
- Render Free can sleep. Transcription needs the running worker, so completion is not guaranteed while the backend is asleep. A manual **Actualiser** action remains available.
- Text is never automatically approved or added to the manuscript. The narrator can edit and validate it. No one else receives the draft transcript.

Sources checked 20 November 2026: [audio API](https://console.groq.com/docs/speech-to-text), [rate limits](https://console.groq.com/docs/rate-limits), [data controls and retention](https://console.groq.com/docs/your-data).
