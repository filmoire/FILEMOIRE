export type LoginDeliveryStatus = "pending" | "sent" | "failed" | "expired";
export type LoginDeliveryResult = LoginDeliveryStatus | "delayed";

/** Bounded polling, cancelled when the user leaves or starts a new request. */
export async function waitForLoginDelivery(
  receipt: string,
  signal: AbortSignal,
): Promise<LoginDeliveryResult> {
  for (let attempt = 0; attempt < 20; attempt++) {
    signal.throwIfAborted();
    const response = await fetch(
      `/api/v1/auth/delivery/${encodeURIComponent(receipt)}`,
      {
        cache: "no-store",
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      },
    );
    if (!response.ok) return "delayed";
    const result = (await response.json()) as { status?: unknown };
    if (["sent", "failed", "expired"].includes(String(result.status)))
      return result.status as LoginDeliveryStatus;
    if (result.status !== "pending") return "delayed";
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, 2000);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  return "delayed";
}
