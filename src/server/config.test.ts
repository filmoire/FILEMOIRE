import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "./config";
import { validateFreeBeta } from "./free-beta";
import { startupFailureReason } from "./startup-error";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  for (const [key, value] of Object.entries({
    APP_MODE: "live",
    NEXT_PUBLIC_APP_MODE: "live",
    DEPLOYMENT_STAGE: "production",
    NEXT_PUBLIC_DEPLOYMENT_STAGE: "production",
    DATABASE_URL: "postgres://fixture@localhost/filemoire_test",
    DATABASE_SSL: "true",
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    APP_ORIGIN: "https://staging.example.test",
    STORAGE_DRIVER: "s3",
    S3_BUCKET: "private",
    S3_ENDPOINT: "https://storage.example.test",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "fixture",
    RESEND_TEST_RECIPIENT: "",
    EMAIL_FROM: "test@example.test",
    LEGAL_APPROVED: "false",
    COMMERCIAL_APPROVED: "false",
    PRINT_SPEC_APPROVED: "false",
    CHECKOUT_ENABLED: "false",
    PRINT_ENABLED: "false",
    STAGING_ACCESS_USER: "filemoire",
    STAGING_ACCESS_PASSWORD: "a".repeat(43),
    STAGING_ALLOWED_EMAILS: "allowed@example.test",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    PRINT_API_URL: "",
    PRINT_API_KEY: "",
    TRANSCRIPTION_URL: "",
    TRANSCRIPTION_API_KEY: "",
    TRANSCRIPTION_MODEL: "",
    SMTP_URL: "",
    ACCOUNT_LIMIT: "",
    TOTAL_MEDIA_LIMIT_MB: "",
    PROJECT_STORAGE_LIMIT_MB: "2048",
  }))
    vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
const staging = () => {
  vi.stubEnv("DEPLOYMENT_STAGE", "staging");
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_STAGE", "staging");
};
describe("hosted deployment boundaries", () => {
  it("keeps legal approval mandatory for public production", () => {
    expect(config).toThrow(/Legal documents/);
    vi.stubEnv("LEGAL_APPROVED", "true");
    expect(config().EMAIL_PROVIDER).toBe("resend");
  });
  it("reports the actual beta approval failure before database startup", () => {
    let failure: unknown;
    try {
      validateFreeBeta();
    } catch (error) {
      failure = error;
    }
    expect(startupFailureReason(failure)).toContain(
      "LEGAL_APPROVED is not true",
    );
  });
  it("permits private staging without asserting legal approval", () => {
    staging();
    expect(config().DEPLOYMENT_STAGE).toBe("staging");
  });
  it.each([
    ["STAGING_ACCESS_PASSWORD", "short"],
    ["STAGING_ACCESS_USER", ""],
    ["STAGING_ALLOWED_EMAILS", ""],
    ["STAGING_ALLOWED_EMAILS", "invalid-email"],
    ["NEXT_PUBLIC_DEPLOYMENT_STAGE", "production"],
    ["APP_MODE", "demo"],
    ["CHECKOUT_ENABLED", "true"],
    ["PRINT_ENABLED", "true"],
    ["LEGAL_APPROVED", "true"],
    ["STRIPE_SECRET_KEY", "sk_live_fixture"],
    ["STRIPE_WEBHOOK_SECRET", "whsec_fixture"],
    ["PRINT_API_KEY", "fixture"],
    ["TRANSCRIPTION_URL", "https://ai.example.test"],
    ["APP_ORIGIN", "http://example.test"],
    ["DATABASE_SSL", "false"],
    ["STORAGE_DRIVER", "local"],
    ["S3_ENDPOINT", "http://storage.example.test"],
    ["RESEND_API_KEY", ""],
    ["EMAIL_PROVIDER", "unknown"],
    ["DEPLOYMENT_STAGE", "typo"],
  ])("rejects unsafe staging setting %s", (name, value) => {
    staging();
    vi.stubEnv(name, value);
    expect(config).toThrow();
  });
  it("still accepts the SMTP adapter for existing production deployments", () => {
    vi.stubEnv("LEGAL_APPROVED", "true");
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("SMTP_URL", "smtps://smtp.example.test");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(config().EMAIL_PROVIDER).toBe("smtp");
  });
  it("requires bounded capacity, a real sender, and production approval for the free beta", () => {
    vi.stubEnv("LEGAL_APPROVED", "true");
    vi.stubEnv("PERSONAL_DRAFTS_ENABLED", "true");
    expect(validateFreeBeta).toThrow(/limits/);
    vi.stubEnv("ACCOUNT_LIMIT", "30");
    vi.stubEnv("PROJECT_STORAGE_LIMIT_MB", "100");
    vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "1024");
    expect(validateFreeBeta).not.toThrow();
    vi.stubEnv("EMAIL_FROM", "Filemoire <onboarding@resend.dev>");
    expect(validateFreeBeta).toThrow(/sender/);
    vi.stubEnv("EMAIL_FROM", "Filemoire <noreply@filemoire.fr>");
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    expect(validateFreeBeta).toThrow(/paid/);
    vi.stubEnv("CHECKOUT_ENABLED", "false");
    vi.stubEnv("LEGAL_APPROVED", "false");
    expect(validateFreeBeta).toThrow(/Legal/);
  });
  it("allows the shared sender only with one explicit test recipient", () => {
    vi.stubEnv("LEGAL_APPROVED", "true");
    vi.stubEnv("PERSONAL_DRAFTS_ENABLED", "true");
    vi.stubEnv("ACCOUNT_LIMIT", "30");
    vi.stubEnv("PROJECT_STORAGE_LIMIT_MB", "100");
    vi.stubEnv("TOTAL_MEDIA_LIMIT_MB", "1024");
    vi.stubEnv("EMAIL_FROM", "Filemoire test <onboarding@resend.dev>");
    expect(validateFreeBeta).toThrow(/sender/);
    vi.stubEnv("RESEND_TEST_RECIPIENT", "owner@example.test");
    expect(validateFreeBeta).not.toThrow();
    vi.stubEnv("RESEND_TEST_RECIPIENT", "one@example.test,two@example.test");
    expect(validateFreeBeta).toThrow(/configuration/);
    vi.stubEnv("RESEND_TEST_RECIPIENT", "owner@example.test");
    vi.stubEnv("EMAIL_FROM", "Filemoire <noreply@filemoire.fr>");
    expect(validateFreeBeta).toThrow(/onboarding@resend.dev/);
    vi.stubEnv("EMAIL_FROM", "onboarding@resend.dev");
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    expect(validateFreeBeta).toThrow(/onboarding@resend.dev/);
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("LEGAL_APPROVED", "false");
    expect(validateFreeBeta).toThrow(/Legal/);
    vi.stubEnv("LEGAL_APPROVED", "true");
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    expect(validateFreeBeta).toThrow(/paid/);
  });
  it.each(["0", "-1", "invalid", "1.5"])(
    "rejects invalid capacity limits %s",
    (value) => {
      staging();
      vi.stubEnv("ACCOUNT_LIMIT", value);
      expect(config).toThrow();
    },
  );
  it("accepts Neon storage variables and enforces HTTPS on their endpoint", () => {
    staging();
    vi.stubEnv("S3_REGION", "");
    vi.stubEnv("S3_ENDPOINT", "");
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "https://storage.example.test");
    expect(config()).toMatchObject({
      S3_REGION: "eu-central-1",
      S3_ENDPOINT: "https://storage.example.test",
    });
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "http://storage.example.test");
    expect(config).toThrow(/HTTPS/);
  });
  it("preserves explicit app storage settings when AWS defaults also exist", () => {
    staging();
    vi.stubEnv("S3_REGION", "eu-west-3");
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "https://another.example.test");
    expect(config()).toMatchObject({
      S3_REGION: "eu-west-3",
      S3_ENDPOINT: "https://storage.example.test",
    });
  });
});
