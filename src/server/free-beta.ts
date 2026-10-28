import { config } from "./config";

/** This profile never enables sales or bypasses the production legal/HTTPS gates. */
export function validateFreeBeta() {
  const c = config();
  if (
    c.DEPLOYMENT_STAGE !== "production" ||
    process.env.NODE_ENV !== "production" ||
    process.env.APP_MODE !== "live" ||
    process.env.PERSONAL_DRAFTS_ENABLED !== "true"
  )
    throw new Error("Free beta requires a live production manuscript build");
  if (
    !c.ACCOUNT_LIMIT ||
    c.ACCOUNT_LIMIT > 30 ||
    !c.TOTAL_MEDIA_LIMIT_MB ||
    c.TOTAL_MEDIA_LIMIT_MB > 1024 ||
    c.PROJECT_STORAGE_LIMIT_MB > 100
  )
    throw new Error("Free beta requires explicit account and media limits");
  if (
    [
      "CHECKOUT_ENABLED",
      "PRINT_ENABLED",
      "COMMERCIAL_APPROVED",
      "PRINT_SPEC_APPROVED",
    ].some((key) => process.env[key] !== "false") ||
    [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "PRINT_API_URL",
      "PRINT_API_KEY",
      "TRANSCRIPTION_URL",
      "TRANSCRIPTION_API_KEY",
      "TRANSCRIPTION_MODEL",
    ].some((key) => !!process.env[key])
  )
    throw new Error("Free beta keeps paid integrations disabled");
  if (
    c.EMAIL_PROVIDER !== "resend" ||
    /@resend\.dev\b/i.test(c.EMAIL_FROM ?? "")
  )
    throw new Error("Free beta requires a verified Resend sender domain");
}
