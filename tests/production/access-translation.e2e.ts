import { expect, test, type Locator } from "@playwright/test";

/** Simulate Translate replacing React's text nodes, even if an extension ignores the opt-out. */
async function replaceTextNodes(control: Locator) {
  const count = await control.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.textContent?.trim()) nodes.push(node);
    }
    for (const node of nodes) {
      const outer = document.createElement("font");
      const inner = document.createElement("font");
      inner.textContent = node.textContent;
      outer.appendChild(inner);
      node.replaceWith(outer);
    }
    return nodes.length;
  });
  expect(count).toBeGreaterThan(0);
}

const copy = {
  fr: {
    language: "Français",
    email: "Adresse e-mail",
    submit: "Recevoir mon lien",
    busy: "Envoi en cours…",
    again: "Recevoir un nouveau lien",
    sent: "Consultez votre messagerie pour ouvrir votre lien de connexion.",
    failed: "Le lien n’a pas pu être envoyé. Réessayez dans quelques minutes.",
  },
  en: {
    language: "English",
    email: "E-mail address",
    submit: "Send me a sign-in link",
    busy: "Sending…",
    again: "Request a new link",
    sent: "Check your email to open your sign-in link.",
    failed: "Your link could not be sent. Please try again in a few minutes.",
  },
};

for (const lang of ["fr", "en"] as const) {
  for (const status of ["sent", "failed"] as const) {
    test(`sign-in survives replaced text nodes: ${lang}, delivery ${status}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      // This exercises rendering only: no real account, database or email request.
      await page.route("**/api/v1/**", (route) => route.abort());
      await page.route("**/api/v1/auth/request", (route) =>
        route.fulfill({
          status: 202,
          json: { receipt: "translation-fixture" },
        }),
      );
      let finishDelivery!: () => void;
      const delivery = new Promise<void>((resolve) => {
        finishDelivery = resolve;
      });
      await page.route(
        "**/api/v1/auth/delivery/translation-fixture",
        async (route) => {
          await delivery;
          await route.fulfill({ json: { status } });
        },
      );

      const text = copy[lang];
      await page.goto("/acces?retour=/offrir");
      await page
        .getByRole("button", { name: text.language, exact: true })
        .click();
      await page
        .getByLabel(text.email, { exact: true })
        .fill("translation@example.test");
      const submit = page.locator('form button[type="submit"]');
      await expect(submit).toHaveText(text.submit);
      await replaceTextNodes(submit);
      try {
        await submit.click();
        await expect(submit).toBeDisabled();
        await expect(submit).toHaveText(text.busy);
        expect(errors).toEqual([]);
        // Repeat while pending: the reverse spinner transition must also be safe.
        await replaceTextNodes(submit);
      } finally {
        finishDelivery();
      }
      await expect(submit).toBeEnabled();
      await expect(submit).toHaveText(
        status === "sent" ? text.again : text.submit,
      );
      await expect(
        page
          .getByRole(status === "sent" ? "status" : "alert")
          .filter({
            hasText: text[status],
          })
          .first(),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(errors).toEqual([]);
      if (lang === "fr" && status === "sent") {
        await page.screenshot({
          path: `/tmp/filemoire-translation-${testInfo.project.name}.png`,
        });
      }
    });
  }
}

test("native language switching preserves the sign-in form with browser translation opted out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/acces?retour=/offrir");
  await expect(page.locator("html")).toHaveAttribute("translate", "no");
  await expect(page.locator('meta[name="google"]')).toHaveAttribute(
    "content",
    "notranslate",
  );
  await page
    .getByLabel("Adresse e-mail", { exact: true })
    .fill("translation@example.test");
  for (const lang of ["en", "fr", "en"] as const) {
    await page
      .getByRole("button", { name: copy[lang].language, exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(
      page.getByLabel(copy[lang].email, { exact: true }),
    ).toHaveValue("translation@example.test");
    await expect(
      page.getByRole("button", { name: copy[lang].submit, exact: true }),
    ).toBeEnabled();
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Your Filémoire workspace" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
