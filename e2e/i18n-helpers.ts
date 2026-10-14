import { writeFileSync } from "node:fs";
import { test, type Page } from "@playwright/test";

/** Accumule les textes non traduits sur toute la session (y compris à travers les rechargements). */
export function missingCollector(page: Page) {
  const all = new Set<string>();
  const grab = async () => {
    try {
      const list = await page.evaluate(() => [...((window as unknown as { __I18N_MISSING__?: Set<string> }).__I18N_MISSING__ ?? [])]);
      list.forEach((s) => all.add(s));
    } catch {
      /* page en cours de navigation */
    }
  };
  page.on("framenavigated", () => void 0);
  return {
    grab,
    async result(ignore?: RegExp) {
      await grab();
      const list = [...all].filter((s) => !ignore || !ignore.test(s)).sort();
      writeFileSync(`test-results/i18n-missing-${test.info().project.name}-${test.info().title.slice(0, 20).replace(/\W+/g, "_")}.json`, JSON.stringify(list, null, 1));
      return list;
    },
  };
}
