import { test, expect } from "@playwright/test";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  account,
  pendingOrder,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { pool } from "../../src/server/db";
import { hash } from "../../src/server/security";
import { applyStripeEvent } from "../../src/server/payments";
import {
  accessProject,
  acceptInvite,
  invite,
  projectView,
  updateProject,
} from "../../src/server/projects";
import { contact } from "../../src/server/support";

test.beforeAll(configureTests);
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);
for (const filled of [false, true])
  test(`all designer tabs render ${filled ? "populated" : "empty"} backend states without overflow`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120000);
    if (info.project.name === "live-desktop")
      await page.setViewportSize({ width: 1440, height: 900 });
    const admin = await account("design-ops@example.test");
    if (filled) {
      const narrator = await account();
      const order = await pendingOrder(admin, narrator, "heritage");
      await applyStripeEvent(order.event);
      const pid = await acceptInvite(
        narrator,
        await newestEmailToken(narrator.email),
      );
      let v = projectView(await accessProject(pool(), narrator, pid));
      v = await updateProject(narrator, pid, v.revision, {
        type: "onboard",
        consentVersion: "2026-10-13",
        accepted: true,
      });
      v = await updateProject(narrator, pid, v.revision, {
        type: "answer",
        questionId: v.project.questions[0].id,
        text: "A family memory shared by its storyteller.",
        visibility: "editeur",
        draft: false,
      });
      await invite(narrator, pid, {
        name: admin.name,
        email: admin.email,
        role: "editor",
      });
      await acceptInvite(admin, await newestEmailToken(admin.email));
      await updateProject(
        admin,
        pid,
        (await accessProject(pool(), admin, pid)).revision,
        {
          type: "suggest",
          memoryId: v.project.memories[0].id,
          text: "A proposed correction to this family memory.",
          note: "A date correction",
        },
      );
      const pending = await pendingOrder(admin, await account());
      await applyStripeEvent(pending.event);
      await contact({
        name: "Local requester",
        email: "local@example.test",
        topic: "question",
        message: "Could you help me with my family invitation?",
      });
    }
    await requestLogin(admin.email);
    await page.goto(`/acces#token=${await newestEmailToken(admin.email)}`);
    await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
    await expect(page).toHaveURL(/\/espace/);
    const token = (await context.cookies()).find(
      (c) => c.name === "filemoire_session",
    )!.value;
    await pool().query(
      "UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1",
      [hash(token)],
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [role, views] of Object.entries({
      buyer: ["accueil", "cadeaux", "suivi", "commandes"],
      editor: ["accueil", "livres", "propositions"],
      operations: [
        "accueil",
        "commandes",
        "projets",
        "questions",
        "impression",
        "support",
      ],
    })) {
      for (const view of views) {
        await page.goto(
          `/espace?role=${role}&vue=${view}${!filled && view === "questions" ? "&q=no-matching-question-fixture" : ""}`,
        );
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator("main").getByText(/^Chargement/)).toHaveCount(
          0,
        );
        await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
        const logos = page.getByRole("img", { name: "Filémoire", exact: true });
        await expect(logos).toHaveCount(2);
        await expect
          .poll(() =>
            logos.evaluateAll((images) =>
              images.every(
                (image) =>
                  image instanceof HTMLImageElement &&
                  image.complete &&
                  image.naturalWidth > 0,
              ),
            ),
          )
          .toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (filled && role === "buyer" && view === "accueil")
          await expect(page.locator(".dash-rows .dash-row")).toHaveCount(2);
        await page.screenshot({
          path: `artifacts/production/design-2026-10-26/matrix/${info.project.name}-${role}-${view}-${filled ? "populated" : "empty"}.png`,
          fullPage: true,
        });
        if (role === "buyer" && view === "commandes" && filled) {
          await page
            .getByRole("button", { name: "Voir le détail", exact: true })
            .first()
            .click();
          await expect(page.getByRole("dialog")).toContainText("Camille Test");
          await page.getByRole("dialog").press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
      }
    }
    expect(errors).toEqual([]);
  });
