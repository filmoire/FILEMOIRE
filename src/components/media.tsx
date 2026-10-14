"use client";

import { ImageOff } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { asset } from "@/lib/nav";
import { useMediaUrl } from "@/lib/media";
import type { AudioRec, Photo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PhotoImg({ photo, className, alt }: { photo: Pick<Photo, "src" | "blobKey" | "caption">; className?: string; alt?: string }) {
  const url = useMediaUrl(photo);
  if (url === null)
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 bg-creme-200 p-3 text-center text-xs text-ink-muted", className)}>
        <ImageOff className="size-6" aria-hidden />
        Fichier indisponible dans ce navigateur
      </div>
    );
  if (!url) return <div className={cn("animate-pulse bg-creme-200", className)} />;
  return <img src={url.startsWith("/") ? asset(url) : url} alt={alt ?? photo.caption ?? ""} className={cn("object-cover", className)} loading="lazy" />;
}

export function AudioPlayer({ audio, label }: { audio: Pick<AudioRec, "src" | "blobKey">; label: string }) {
  const url = useMediaUrl(audio);
  if (url === null) return <p className="text-sm text-ink-muted">Fichier audio indisponible dans ce navigateur (stockage local effacé).</p>;
  if (!url) return <div className="h-12 animate-pulse rounded-full bg-creme-200" />;
  return <audio controls preload="metadata" src={url.startsWith("/") ? asset(url) : url} aria-label={label} className="h-12 w-full" />;
}

export function QrImage({ value, size = 120, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    void QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#34202D", light: "#FFFFFF" } }).then(setSrc).catch(() => setSrc(undefined));
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={`QR code vers ${value}`} className={className} /> : <div style={{ width: size, height: size }} className="animate-pulse bg-creme-200" />;
}
