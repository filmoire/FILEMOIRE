import { confirmAction } from "./confirmation";
export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? "Une erreur est survenue.");
  return value;
}
export async function uploadFile(
  projectId: string,
  memoryId: string,
  file: File,
  kind: "photo" | "audio",
  progress: (n: number) => void,
) {
  // Only the opaque upload ID is kept in session storage; never media bytes or narrative content.
  const fingerprint = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `${projectId}:${memoryId}:${file.name}:${file.size}:${file.lastModified}`,
      ),
    ),
  );
  const key = `filemoire-upload:${Array.from(fingerprint, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  let uploadId = sessionStorage.getItem(key);
  let received: number[] = [];
  let chunkSize = 4 * 1024 * 1024;
  if (uploadId) {
    try {
      const status = await api<{
        parts: number[];
        chunkSize: number;
        status: string;
      }>(`uploads/${uploadId}`);
      if (status.status === "complete") {
        sessionStorage.removeItem(key);
        return;
      }
      received = status.parts;
      chunkSize = status.chunkSize;
    } catch {
      uploadId = null;
    }
  }
  if (!uploadId) {
    const init = await api<{ id: string; chunkSize: number }>(
      `projects/${projectId}/uploads`,
      {
        memoryId,
        kind,
        bytes: file.size,
        mime: file.type,
        caption: kind === "photo" ? file.name.replace(/\.[^.]+$/, "") : "",
      },
    );
    uploadId = init.id;
    chunkSize = init.chunkSize;
    sessionStorage.setItem(key, uploadId);
  }
  for (let part = 0; part < Math.ceil(file.size / chunkSize); part++) {
    if (!received.includes(part)) {
      const r = await fetch(`/api/v1/uploads/${uploadId}/${part}`, {
        method: "PUT",
        body: file.slice(part * chunkSize, (part + 1) * chunkSize),
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!r.ok) {
        const value = await r.json();
        throw new Error(
          value.error ??
            "Import interrompu. Sélectionnez à nouveau le même fichier pour reprendre.",
        );
      }
    }
    progress(
      Math.round(
        (Math.min(file.size, (part + 1) * chunkSize) / file.size) * 100,
      ),
    );
  }
  await api(`uploads/${uploadId}/complete`, {});
  sessionStorage.removeItem(key);
}

let unsavedDraft = false;
const activeRecordings = new Set<string>();
export function markRecording(value: boolean, key: string) {
  if (value) activeRecordings.add(key);
  else activeRecordings.delete(key);
}
export function markUnsaved(value: boolean) {
  unsavedDraft = value;
}
export const hasUnsavedChanges = () =>
  unsavedDraft || activeRecordings.size > 0;
export async function confirmNavigation() {
  return (
    !hasUnsavedChanges() ||
    confirmAction(
      "Du texte ou un enregistrement n’est pas encore sauvegardé. Quitter cet écran et perdre les modifications ?",
      "Quitter sans enregistrer",
    )
  );
}
