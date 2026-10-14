import path from "node:path";
import { expect, test } from "@playwright/test";
import { collectErrors, fresh, go as goRaw } from "./helpers";
import { missingCollector } from "./i18n-helpers";

const PHOTO = path.join(__dirname, "fixtures", "photo-demo.jpg");

test("English: the 19-step demo works end to end and nothing is left untranslated", async ({ page }) => {
  const mc = missingCollector(page);
  const go = async (p: typeof page, path: string) => {
    await mc.grab();
    await goRaw(p, path);
  };
  const errors = collectErrors(page);
  await fresh(page);
  await page.locator('button[lang="en"]:visible').first().click();
  await expect(page.getByRole("heading", { level: 1, name: "One question at a time, a life to pass on." })).toBeVisible();

  const mainNav = page.getByRole("navigation", { name: "Main navigation" });
  await mainNav.getByRole("link", { name: "Offers" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Choose the journey to give" })).toBeVisible();
  await mainNav.getByRole("link", { name: "Sample book" }).click();
  await page.getByRole("button", { name: "Next page" }).click();

  // Gift purchase
  await mainNav.getByRole("button", { name: "Give Filémoire" }).click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByText("Choose a plan.")).toBeVisible();
  await page.locator('input[name="packageCode"][value="heritage"]').check();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByText("Enter the first name of the person who will tell their story.")).toBeVisible();
  await page.getByRole("button", { name: "Demo: fill in with Madeleine Martin (fictional)" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText("Please accept the demonstration terms to continue.")).toBeVisible();
  await page.locator("#terms").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Simulate a declined payment" }).click();
  await expect(page.getByText("Payment declined").first()).toBeVisible();
  await page.getByRole("button", { name: "Simulate an accepted payment" }).click();
  await expect(page.getByRole("heading", { name: "Thank you, your gift is ready" })).toBeVisible();

  // Invitation → storyteller
  await page.getByRole("link", { name: "Open the e-mail inbox" }).click();
  await page.getByRole("button", { name: /Sophie Martin is giving you Filémoire/ }).click();
  await page.getByRole("link", { name: "Open my invitation" }).click();
  await page.getByRole("button", { name: "Accept the invitation" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start my book" }).click();
  await expect(page.getByText("Tick the box to confirm that you understand how your memories are protected.")).toBeVisible();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Start my book" }).click();

  // Answer, voice, photo
  await page.getByRole("button", { name: "Write my answer" }).click();
  await page.locator("#answer").fill("My parents' bakery in Douarnenez.\n\nThe oven warmed the whole house.");
  await page.getByRole("button", { name: "Save my answer" }).click();
  await expect(page.getByText("Your answer is saved")).toBeVisible();
  await page.getByLabel("Me and my family editor").check();
  await page.getByRole("tab", { name: /Aloud/ }).click();
  await page.getByRole("button", { name: "Record my voice" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Keep this recording" }).click();
  await expect(page.getByText("This text is not your story")).toBeVisible({ timeout: 8000 });
  await page.locator("textarea[id^='tr-']").fill("On Sundays we watched the boats come back.");
  await page.getByRole("button", { name: "Approve this text" }).click();
  await expect(page.getByText("Reviewed and approved")).toBeVisible();
  await page.locator('input[type="file"][accept^="image"]').setInputFiles(PHOTO);
  await expect(page.getByText(/1 photo added/)).toBeVisible();

  const spaceNav = page.getByRole("navigation", { name: "Section navigation" });
  await spaceNav.getByRole("link", { name: "Home" }).click();
  await page.getByRole("button", { name: "Receive the next question now" }).click();
  await page.locator("#answer").fill("A memory I'd rather keep to myself.");
  await page.getByRole("button", { name: "Save my answer" }).click();
  await spaceNav.getByRole("link", { name: "Questions" }).click();
  await spaceNav.getByRole("link", { name: "My book" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Book editor" })).toBeVisible();

  // Family editor
  await spaceNav.getByRole("link", { name: "Family" }).click();
  await page.getByRole("button", { name: "Demo: Thomas Martin (fictional)" }).click();
  await page.getByRole("button", { name: "Send the invitation" }).click();
  await page.getByRole("link", { name: "Demo: open their invitation" }).click();
  await page.getByRole("button", { name: "Accept the invitation" }).click();
  await page.getByRole("button", { name: "Suggest a correction" }).click();
  await page.locator("#sg-after").fill("My parents' bakery, rue Jean-Jaurès, in Douarnenez.\n\nThe oven warmed the whole house.");
  await page.getByRole("button", { name: "Send the suggestion" }).click();
  await expect(page.getByText("Suggestion sent")).toBeVisible();
  await page.locator("#persona").selectOption({ index: 2 });
  await page.getByRole("link", { name: "Review them" }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Hide from the book" }).nth(1).click();
  await expect(page.getByText("Memory hidden from the book")).toBeVisible();

  // Preview, approval, printing
  await spaceNav.getByRole("link", { name: "Preview" }).click();
  await page.getByRole("button", { name: "I approve my book" }).click();
  await expect(page.getByText("Enter the address (number and street).")).toBeVisible();
  await page.locator("#ad-line1").fill("3 Fictive Street");
  await page.locator("#ad-cp").fill("29100");
  await page.locator("#ad-city").fill("Douarnenez");
  await page.locator("#ap-read").check();
  await page.locator("#ap-lock").check();
  await page.getByRole("button", { name: "I approve my book" }).click();
  await expect(page.getByText(/You approved your book on/)).toBeVisible();
  await page.getByRole("button", { name: "Order printing (simulation)" }).click();
  await expect(page.getByText("Book approved and sent to the Filémoire team")).toBeVisible();
  await page.locator("#persona").selectOption("ops");
  await go(page, "/admin/impression");
  const row = page.getByRole("row", { name: /Madeleine/ });
  await row.getByRole("button", { name: "Send to printing" }).click();
  await expect(row).toContainText("Printing preparation");
  await row.getByRole("button", { name: "Preflight" }).click();
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Send to printing" }).click();
  await page.locator("#persona").selectOption("acheteur");
  await go(page, "/acheteur/suivi");
  await expect(page.locator('[aria-current="step"]')).toContainText("Being printed");
  await go(page, "/demo/boite-mail");
  const mails = page.locator("main ul li button");
  for (let i = 0; i < (await mails.count()); i++) await mails.nth(i).click();
  await expect(page.getByRole("button", { name: /Demo guide · 19\/19/ })).toBeVisible();

  const missing = await mc.result(/Douarnenez|bakery|oven|boats|keep to myself|Fictive/);
  expect(missing, missing.join("\n")).toEqual([]);
  expect(errors).toEqual([]);
});
