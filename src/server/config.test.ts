import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "./config";

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
});
