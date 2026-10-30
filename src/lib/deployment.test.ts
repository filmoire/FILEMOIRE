import { afterEach, expect, it, vi } from "vitest";
import { deploymentEmailAllowed, isResendTestSender } from "./deployment";

afterEach(() => vi.unstubAllEnvs());

it("normalizes the single test recipient and keeps the staging allowlist in force", () => {
  vi.stubEnv("DEPLOYMENT_STAGE", "production");
  vi.stubEnv("RESEND_TEST_RECIPIENT", " Owner@Example.test ");
  expect(deploymentEmailAllowed("owner@example.test")).toBe(true);
  expect(deploymentEmailAllowed("outside@example.test")).toBe(false);
  vi.stubEnv("DEPLOYMENT_STAGE", "staging");
  vi.stubEnv("STAGING_ALLOWED_EMAILS", "outside@example.test");
  expect(deploymentEmailAllowed("owner@example.test")).toBe(false);
  vi.stubEnv("STAGING_ALLOWED_EMAILS", "owner@example.test");
  expect(deploymentEmailAllowed("owner@example.test")).toBe(true);
  vi.stubEnv("RESEND_TEST_RECIPIENT", "");
  expect(deploymentEmailAllowed("outside@example.test")).toBe(false);
  vi.stubEnv("DEPLOYMENT_STAGE", "production");
  expect(deploymentEmailAllowed("outside@example.test")).toBe(true);
});

it.each([
  "onboarding@resend.dev.attacker.test",
  "Filemoire <onboarding@resend.dev>, second@resend.dev",
  "someone@resend.dev",
  "onboarding@resend.dev\r\nBcc: other@example.test",
])("rejects a different or malformed test sender: %s", (sender) => {
  expect(isResendTestSender(sender)).toBe(false);
});
