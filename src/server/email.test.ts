import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendEmail } from "./email";
const smtpSend = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({ sendMail: smtpSend })),
}));
beforeEach(() => {
  for (const [key, value] of Object.entries({
    NODE_ENV: "test",
    DATABASE_URL: "postgres://localhost/test",
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    APP_MODE: "live",
    NEXT_PUBLIC_APP_MODE: "live",
    DEPLOYMENT_STAGE: "staging",
    NEXT_PUBLIC_DEPLOYMENT_STAGE: "staging",
    STAGING_ACCESS_USER: "filemoire",
    STAGING_ACCESS_PASSWORD: "a".repeat(43),
    STAGING_ALLOWED_EMAILS: "allowed@example.test",
    CHECKOUT_ENABLED: "false",
    PRINT_ENABLED: "false",
    LEGAL_APPROVED: "false",
    COMMERCIAL_APPROVED: "false",
    PRINT_SPEC_APPROVED: "false",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "test-secret",
    EMAIL_FROM: "sender@example.test",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    PRINT_API_URL: "",
    PRINT_API_KEY: "",
    TRANSCRIPTION_URL: "",
    TRANSCRIPTION_API_KEY: "",
    TRANSCRIPTION_MODEL: "",
  }))
    vi.stubEnv(key, value);
  smtpSend.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const message = {
  id: "queued-job-id",
  to: "allowed@example.test",
  subject: "Login",
  text: "Private login link",
};
it("uses HTTPS with a stable idempotency key across retries", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ id: "provider-id" }));
  vi.stubGlobal("fetch", fetch);
  await sendEmail(message);
  await sendEmail(message);
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [url, options] of fetch.mock.calls) {
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers["Idempotency-Key"]).toBe("filemoire/queued-job-id");
    expect(JSON.parse(options.body)).toEqual({
      from: "sender@example.test",
      to: [message.to],
      subject: message.subject,
      text: message.text,
    });
  }
  expect(smtpSend).not.toHaveBeenCalled();
});
it.each([403, 429, 503])(
  "leaves provider failures retryable without leaking the response body (%s)",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive provider detail", { status }),
        ),
    );
    await expect(sendEmail(message)).rejects.toThrow(
      `Email provider rejected delivery (${status})`,
    );
  },
);
it("does not accept an unconfirmed delivery", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  await expect(sendEmail(message)).rejects.toThrow(/did not confirm/);
});
it("blocks outside recipients before contacting either email provider", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    sendEmail({ ...message, to: "outsider@example.test" }),
  ).rejects.toThrow(/not allowed/);
  vi.stubEnv("EMAIL_PROVIDER", "smtp");
  await expect(
    sendEmail({ ...message, to: "outsider@example.test" }),
  ).rejects.toThrow(/not allowed/);
  expect(fetch).not.toHaveBeenCalled();
  expect(smtpSend).not.toHaveBeenCalled();
});
it("preserves SMTP delivery and its stable message identifier", async () => {
  vi.stubEnv("EMAIL_PROVIDER", "smtp");
  vi.stubEnv("SMTP_URL", "smtp://localhost:1025");
  vi.stubEnv("APP_ORIGIN", "https://staging.example.test");
  await sendEmail(message);
  expect(smtpSend).toHaveBeenCalledWith(
    expect.objectContaining({
      to: [message.to],
      messageId: "<queued-job-id@staging.example.test>",
    }),
  );
});
