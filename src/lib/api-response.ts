const unavailable =
  "Le service se réveille ou est temporairement indisponible. Réessayez dans une minute.";

export async function readApiResponse<T>(response: Response): Promise<T> {
  // Hosting gateways can return HTML while a free backend wakes up or restarts.
  // Never show that HTML or a JSON parser exception to someone writing a story.
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(unavailable);
  const value = await response.json().catch(() => {
    throw new Error(unavailable);
  });
  if (!response.ok)
    throw new Error(
      typeof value?.error === "string"
        ? value.error
        : "Une erreur est survenue.",
    );
  return value;
}
