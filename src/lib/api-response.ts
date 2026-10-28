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
  // A disabled or outdated API returns this generic route-level 404. The
  // current frontend page exists; resource-specific 404s must remain intact.
  if (response.status === 404 && value?.error === "Page introuvable.")
    throw new Error(
      "Ce service est indisponible pour le moment. Vous pouvez continuer à consulter le site public.",
    );
  if (!response.ok)
    throw new Error(
      typeof value?.error === "string"
        ? value.error
        : "Une erreur est survenue.",
    );
  return value;
}
