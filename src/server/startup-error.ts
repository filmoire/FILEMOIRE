// Only fixed application messages may reach hosted logs. Driver errors can
// contain database URLs, account names or credentials and must stay private.
const safeReasons = new Set([
  "Invalid server configuration",
  "Staging requires a matching live staging build",
  "Staging requires private access and an explicit email allowlist",
  "Staging must keep sales, printing and external transcription disabled",
  "Build and server deployment stages must match",
  "Build and server modes must match",
  "Live production requires HTTPS",
  "Hosted live mode requires private S3 and a configured email provider",
  "Hosted storage requires HTTPS",
  "Live production requires verified database TLS",
  "Free beta requires a live production manuscript build",
  "Free beta requires explicit account and media limits",
  "Free beta keeps paid integrations disabled",
  "Free beta requires a verified Resend sender domain",
  "Free beta requires a verified Resend sender domain or restricted test access",
  "Resend test access requires the onboarding@resend.dev sender",
  "Backend deployments require the frontend APP_ORIGIN",
  "Hosted launcher and deployment stage must match",
  "Hosted applications require a restricted runtime database role",
  "Apply outstanding migrations before deploying",
]);

export function startupFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message === "Legal documents must be reviewed before hosting customer data"
  )
    return "LEGAL_APPROVED is not true. Complete and approve the published legal/privacy documents before enabling public accounts. Retrying this deployment will not resolve the missing approval.";
  if (safeReasons.has(message)) return message;
  return "Check runtime database connectivity, permissions and applied migrations. Unexpected error details are withheld to protect credentials.";
}
