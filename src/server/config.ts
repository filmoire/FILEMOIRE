import { z } from "zod";

const schema = z.object({
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, "base64").length === 32,
      "Use a 32-byte base64 key",
    ),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default(".private-media"),
  S3_REGION: z.string().default("eu-west-3"),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  COHORT_LIMIT: z.coerce.number().int().positive().default(30),
  DELETION_GRACE_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  APP_TIMEZONE: z.string().default("Europe/Paris"),
});
export function config() {
  const parsed = schema.safeParse(
    Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")),
  );
  if (!parsed.success) throw new Error("Invalid server configuration");
  const c = parsed.data;
  if (
    process.env.APP_MODE === "live" &&
    process.env.NODE_ENV === "production"
  ) {
    if (process.env.NEXT_PUBLIC_APP_MODE !== "live")
      throw new Error("Build and server modes must match");
    if (process.env.LEGAL_APPROVED !== "true")
      throw new Error(
        "Legal documents must be reviewed before hosting customer data",
      );
    if (!c.APP_ORIGIN.startsWith("https://"))
      throw new Error("Live production requires HTTPS");
    if (
      c.STORAGE_DRIVER !== "s3" ||
      !c.S3_BUCKET ||
      !c.SMTP_URL ||
      !c.EMAIL_FROM
    )
      throw new Error("Live production requires private S3 and SMTP");
    if (process.env.DATABASE_SSL !== "true")
      throw new Error("Live production requires verified database TLS");
  }
  return c;
}
export function configured(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Service unavailable: ${name} is not configured`);
  return value;
}

export const personalDraftsEnabled = () =>
  process.env.PERSONAL_DRAFTS_ENABLED === "true";
export const transcriptionConfigured = () =>
  !!(
    process.env.TRANSCRIPTION_URL &&
    process.env.TRANSCRIPTION_API_KEY &&
    process.env.TRANSCRIPTION_MODEL
  );
