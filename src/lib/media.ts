"use client";

/**
 * Stockage local des médias (photos, enregistrements) dans IndexedDB.
 * Limites : les fichiers restent dans CE navigateur, peuvent être effacés par le navigateur
 * et ne sont ni chiffrés ni sauvegardés. En production : stockage objet chiffré côté serveur.
 */
import { createStore, del, get, set } from "idb-keyval";
import { useEffect, useState } from "react";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("filemoire-prototype-media", "blobs"));
const urlCache = new Map<string, string>();
/** Repli si IndexedDB est indisponible (navigation privée, iframe) : fichiers perdus au rechargement. */
const memoryBlobs = new Map<string, Blob>();

export async function putBlob(key: string, blob: Blob) {
  try {
    await set(key, blob, db());
  } catch {
    memoryBlobs.set(key, blob);
  }
}

export async function deleteBlob(key: string) {
  memoryBlobs.delete(key);
  try {
    await del(key, db());
  } catch {
    /* rien */
  }
  const u = urlCache.get(key);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(key);
}

export async function blobUrl(key: string): Promise<string | null> {
  if (urlCache.has(key)) return urlCache.get(key)!;
  try {
    let b = memoryBlobs.get(key);
    if (!b) b = await get<Blob>(key, db()).catch(() => undefined);
    if (!b) return null;
    const u = URL.createObjectURL(b);
    urlCache.set(key, u);
    return u;
  } catch {
    return null;
  }
}

/** URL affichable d'un média : chemin statique (démo) ou blob IndexedDB. `null` si le fichier a disparu. */
export function useMediaUrl(m: { src?: string; blobKey?: string } | undefined) {
  const [url, setUrl] = useState<string | null | undefined>(m?.src ?? (m?.blobKey ? urlCache.get(m.blobKey) : undefined));
  useEffect(() => {
    let alive = true;
    if (m?.src) setUrl(m.src);
    else if (m?.blobKey) void blobUrl(m.blobKey).then((u) => alive && setUrl(u));
    else setUrl(null);
    return () => {
      alive = false;
    };
  }, [m?.src, m?.blobKey]);
  return url;
}

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

export function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(u);
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      reject(new Error("image illisible"));
    };
    img.src = u;
  });
}

export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const u = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = Number.isFinite(a.duration) ? a.duration : 0;
      URL.revokeObjectURL(u);
      resolve(d);
    };
    a.onerror = () => {
      URL.revokeObjectURL(u);
      resolve(0);
    };
    a.src = u;
  });
}
