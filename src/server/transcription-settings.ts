export const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

/** This opt-in must only be set after confirming the Groq account is on Free. */
export function groqFreeTranscriptionConfigured() {
  return (
    process.env.GROQ_FREE_TIER === "true" &&
    process.env.TRANSCRIPTION_URL === GROQ_TRANSCRIPTION_URL &&
    !!process.env.TRANSCRIPTION_API_KEY &&
    ["whisper-large-v3", "whisper-large-v3-turbo"].includes(
      process.env.TRANSCRIPTION_MODEL ?? "",
    )
  );
}
