import { afterEach, expect, it, vi } from "vitest";
import { waitForLoginDelivery } from "./login-delivery";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each(["sent", "failed", "expired"])(
  "returns confirmed %s state",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status })),
    );
    expect(
      await waitForLoginDelivery("receipt", new AbortController().signal),
    ).toBe(status);
  },
);

it("does not turn a queued request into a successful send", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ status: "pending" }));
  vi.stubGlobal("fetch", fetch);
  const result = waitForLoginDelivery("receipt", new AbortController().signal);
  await vi.advanceTimersByTimeAsync(40_000);
  expect(await result).toBe("delayed");
  expect(fetch).toHaveBeenCalledTimes(20);
});

it("updates a queued request when the worker rejects it", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "pending" }))
      .mockResolvedValueOnce(Response.json({ status: "failed" })),
  );
  const result = waitForLoginDelivery("receipt", new AbortController().signal);
  await vi.advanceTimersByTimeAsync(2000);
  expect(await result).toBe("failed");
});

it("cancels in-flight polling when leaving the page", async () => {
  const controller = new AbortController();
  const fetch = vi.fn().mockImplementation(
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          "abort",
          () => reject(options.signal.reason),
          { once: true },
        );
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = waitForLoginDelivery("receipt", controller.signal);
  const rejection = expect(result).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  await rejection;
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not report success if a rolling deployment cannot check delivery", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })),
  );
  expect(
    await waitForLoginDelivery("receipt", new AbortController().signal),
  ).toBe("delayed");
});
