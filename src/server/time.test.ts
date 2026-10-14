import { expect, it } from "vitest";
import { giftDeliveryTime } from "./time";
it("sends gifts at 09:00 Paris time in winter and summer", () => {
  expect(giftDeliveryTime("2026-12-24", "Europe/Paris").toISOString()).toBe(
    "2026-12-24T08:00:00.000Z",
  );
  expect(giftDeliveryTime("2026-07-14", "Europe/Paris").toISOString()).toBe(
    "2026-07-14T07:00:00.000Z",
  );
});
