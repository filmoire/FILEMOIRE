import { expect, test } from "@playwright/test";

test("live public illustrations load while demo application routes stay blocked", async ({
  page,
  request,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const hero = page.locator('img[src="/demo/jardin.svg"]');
  await expect(hero).toBeVisible();
  await expect
    .poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  await page
    .getByRole("link", { name: "Voir un livre exemple", exact: true })
    .click();
  await expect(page).toHaveURL(/\/livre-exemple$/);
  await expect(
    page.getByRole("heading", { name: "« Au fil de Rose »" }),
  ).toBeVisible();
  const next = page.getByRole("button", { name: "Page suivante", exact: true });
  const seen = new Set<string>();
  for (let turn = 0; turn < 100; turn++) {
    for (const illustration of await page.locator('img[src^="/demo/"]').all()) {
      await expect
        .poll(() =>
          illustration.evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
      seen.add((await illustration.getAttribute("src"))!);
    }
    if (await next.isDisabled()) break;
    await next.click();
  }
  await expect(next).toBeDisabled();
  expect([...seen].sort()).toEqual([
    "/demo/atelier.svg",
    "/demo/cuisine.svg",
    "/demo/jardin.svg",
  ]);

  for (const path of [
    "/demo/boite-mail",
    "/demo/not-an-asset.svg",
    "/invitation/madeleine-demo",
    "/ecouter/exemple-rose",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const audio = await request.get("/demo/exemple-enregistrement.wav");
  expect(audio.status()).toBe(200);
  expect((await audio.body()).subarray(0, 4).toString()).toBe("RIFF");
  expect(pageErrors).toEqual([]);
});
