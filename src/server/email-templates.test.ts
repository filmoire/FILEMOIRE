import { expect, it } from "vitest";
import {
  renderEmail,
  renderLegacyEmail,
  type EmailTemplate,
} from "./email-templates";

const origin = "https://www.filemoire.fr";
const invitation = {
  token: "test-invitation",
  email: "rose@example.test",
  name: "Rose",
};
const templates: EmailTemplate[] = [
  { kind: "login", token: "test-login" },
  { kind: "family-invitation", ...invitation, role: "editor" },
  {
    kind: "gift-invitation",
    ...invitation,
    buyerName: "Sophie",
    message: "À toi de raconter.",
  },
  { kind: "invitation-renewed", ...invitation },
  { kind: "order-confirmation", reference: "FM-TEST", totalCents: 17900 },
  {
    kind: "withdrawal-receipt",
    reference: "request-fixture",
    orderReference: "FM-TEST",
    name: "Camille",
    email: "camille@example.test",
    receivedAt: "2026-11-04T12:00:00.000Z",
    declaration: "Je notifie ma décision de me rétracter.",
    language: "fr",
  },
  { kind: "question", question: "Quel souvenir vous fait sourire ?" },
  { kind: "reminder", question: "Quel souvenir vous fait sourire ?" },
  {
    kind: "support-reply",
    name: "Rose",
    message: "Votre demande est résolue.\nMerci.",
  },
];

it("renders English withdrawal receipts with complete dated details and escaped declarations", () => {
  const message = renderEmail(
    {
      kind: "withdrawal-receipt",
      reference: "receipt-123",
      orderReference: "FM-TEST",
      name: "<script>bad()</script>",
      email: "fixture@example.test",
      receivedAt: "2026-11-04T14:00:00.000Z",
      declaration: "Withdraw <img src=x onerror=alert(1)>",
      language: "en",
    },
    origin,
  );
  expect(message.html).toContain('<html lang="en">');
  expect(message.html).not.toContain("<script>");
  expect(message.html).not.toContain("<img src=x");
  expect(message.text).toContain("receipt-123");
  expect(message.text).toContain("2026-11-04T14:00:00.000Z");
  expect(message.text).toContain("not confirmation of a completed refund");
  expect(message.text).toContain("Your memories remain yours.");
});

it.each(templates)(
  "renders $kind with a working brand, text fallback and same-origin action",
  (template) => {
    const email = renderEmail(template, origin);
    expect(email.html).toContain('<html lang="fr">');
    expect(email.html).toContain(`${origin}/brand/filemoire-logo.png`);
    expect(email.html).toContain('alt="Filémoire"');
    expect(email.html).toContain("@media(max-width:480px)");
    expect(email.html).toContain('role="presentation"');
    expect(email.text).toContain("Vos souvenirs restent à vous.");
    expect(email.html).not.toMatch(/<script|<form|<iframe|@import|url\(/i);
    for (const [, href] of email.html.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href.replaceAll("&amp;", "&"));
      expect(url.origin).toBe(origin);
      expect(email.text).toContain(url.href);
    }
    expect(Buffer.byteLength(email.html)).toBeLessThan(20000);
  },
);

it("keeps login and invitation tokens in fragments, with their actual expiry and no tracking", () => {
  const login = renderEmail({ kind: "login", token: "private-token" }, origin);
  const family = renderEmail(
    { kind: "family-invitation", ...invitation, role: "contributor" },
    origin,
  );
  expect(login.html).toContain("/acces#token=private-token");
  expect(login.text).toContain("15 minutes");
  expect(login.text).toContain("Une seule utilisation");
  expect(family.text).toContain("30 jours");
  expect(family.text).toContain("Contributeur familial");
  expect(family.text).toContain(invitation.email);
  expect(family.html).toContain("/rejoindre#token=test-invitation");
  expect(login.html).not.toContain("?token=");
  expect(login.html).not.toContain("utm_");
});

it("escapes names, personal messages and support replies instead of accepting HTML", () => {
  const attack = '<img src=x onerror="alert(1)"> & "hello"';
  for (const template of [
    {
      kind: "gift-invitation",
      ...invitation,
      name: attack,
      buyerName: attack,
      message: attack,
    },
    { kind: "support-reply", name: attack, message: attack },
    { kind: "question", question: attack },
  ] as EmailTemplate[]) {
    const email = renderEmail(template, origin);
    expect(email.html).not.toContain(attack);
    expect(email.html).toContain("&lt;img src=x onerror=&quot;");
    expect(email.text).toContain(attack);
  }
});

it("encodes token input without changing the action destination", () => {
  const token = 'a&b="< >#?';
  const email = renderEmail({ kind: "login", token }, origin);
  const href = email.text.match(/https:\/\/[^\s]+\/acces#token=[^\s]+/)![0];
  expect(new URL(href).pathname).toBe("/acces");
  expect(new URLSearchParams(new URL(href).hash.slice(1)).get("token")).toBe(
    token,
  );
  expect(email.html).not.toContain(token);
});

it.each([
  "javascript:alert(1)",
  "http://example.com",
  "https://user:secret@example.com",
  "https://example.com/path",
  "https://example.com?token=bad",
])("rejects an unsafe app origin: %s", (appOrigin) => {
  expect(() => renderEmail(templates[0], appOrigin)).toThrow();
});

it("keeps plain-text caller content safe and readable", () => {
  const html = renderLegacyEmail(
    "<strong>Old subject</strong>",
    "First line\n<script>private</script>\nhttp://example.test",
    origin,
  );
  expect(html).toContain("&lt;strong&gt;Old subject&lt;/strong&gt;");
  expect(html).toContain(
    "First line<br />&lt;script&gt;private&lt;/script&gt;",
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="http://example.test"');
});

it("renders paid order amounts without implying dispatch and keeps empty gift messages empty", () => {
  const order = renderEmail(
    { kind: "order-confirmation", reference: "FM-123", totalCents: 17949 },
    origin,
  );
  expect(order.text).toMatch(/179,49\s*€/);
  expect(order.text).toContain("déjà imprimé ou expédié");
  expect(order.html).toContain("role=buyer&amp;vue=commandes");
  const gift = renderEmail(
    {
      kind: "gift-invitation",
      ...invitation,
      buyerName: "Sophie",
      message: "",
    },
    origin,
  );
  expect(gift.html).not.toContain("Un mot pour vous");
});
