import { expect, it } from "vitest";
import { startupFailureReason } from "./startup-error";

it("explains a missing launch approval without suggesting a bypass", () => {
  expect(
    startupFailureReason(
      new Error(
        "Legal documents must be reviewed before hosting customer data",
      ),
    ),
  ).toMatch(/LEGAL_APPROVED is not true\. Complete and approve/);
});

it("identifies a known migration failure", () => {
  expect(
    startupFailureReason(
      new Error("Apply outstanding migrations before deploying"),
    ),
  ).toBe("Apply outstanding migrations before deploying");
});

it.each([
  new Error("Connection failed: postgres://owner:fixture-secret@localhost/db"),
  new Error("Invalid server configuration: fixture-secret"),
  { message: "fixture-secret" },
  "fixture-secret",
  null,
])("withholds unexpected error details from hosted logs", (error) => {
  const reason = startupFailureReason(error);
  expect(reason).toContain("details are withheld");
  expect(reason).not.toContain("fixture-secret");
  expect(reason).not.toContain("postgres://");
});
