import nodemailer from "nodemailer";
import { stagingEmailAllowed } from "@/lib/deployment";
import { config, configured } from "./config";

export async function sendEmail(message: {
  id: string;
  to: string;
  subject: string;
  text: string;
}) {
  const c = config();
  // Also guard queued invitations and reminders, not only login requests.
  if (!stagingEmailAllowed(message.to))
    throw new Error("Staging email recipient is not allowed");
  const body = {
    from: configured("EMAIL_FROM"),
    to: [message.to],
    subject: message.subject,
    text: message.text,
  };
  if (c.EMAIL_PROVIDER === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configured("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `filemoire/${message.id}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(`Email provider rejected delivery (${response.status})`);
    const result = (await response.json()) as { id?: unknown };
    if (typeof result.id !== "string" || !result.id)
      throw new Error("Email provider did not confirm delivery");
    return;
  }
  const smtp = nodemailer.createTransport(configured("SMTP_URL"));
  await smtp.sendMail({
    ...body,
    messageId: `<${message.id}@${new URL(c.APP_ORIGIN).hostname}>`,
  });
}
