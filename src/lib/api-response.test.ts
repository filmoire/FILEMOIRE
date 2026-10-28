import { expect, it } from "vitest";
import { readApiResponse } from "./api-response";

it.each([200, 502, 503])(
  "handles a non-JSON gateway response (%s)",
  async (status) => {
    await expect(
      readApiResponse(
        new Response("<html>Gateway</html>", {
          status,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    ).rejects.toThrow("Réessayez dans une minute");
  },
);
it("preserves backend validation errors and normal JSON", async () => {
  await expect(
    readApiResponse(
      Response.json({ error: "Origine refusée." }, { status: 403 }),
    ),
  ).rejects.toThrow("Origine refusée.");
  await expect(
    readApiResponse(Response.json({ status: "ok" })),
  ).resolves.toEqual({ status: "ok" });
});
