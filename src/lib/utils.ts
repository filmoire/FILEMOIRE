import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { locale } from "@/i18n/core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAY = 86_400_000;

let counter = 0;
/** Identifiant court, suffisant pour un prototype local. */
export function uid(prefix: string) {
  counter = (counter + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${counter}`;
}

/** Jeton d'URL lisible (invitations, QR). */
export function token(len = 10) {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function orderRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return `FM-2026-${s}`;
}

const fmts = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();
function fmt<T extends Intl.DateTimeFormat | Intl.NumberFormat>(key: string, make: (loc: string) => T): T {
  const loc = locale();
  const k = `${loc}|${key}`;
  if (!fmts.has(k)) fmts.set(k, make(loc));
  return fmts.get(k) as T;
}

/** Formats de date et de montant dans la langue de l'interface. */
export const fmtDate = (ms: number) => fmt("d", (l) => new Intl.DateTimeFormat(l, { day: "numeric", month: "long", year: "numeric" })).format(new Date(ms));
export const fmtShort = (ms: number) => fmt("s", (l) => new Intl.DateTimeFormat(l, { day: "numeric", month: "short" })).format(new Date(ms));
export const fmtDateTime = (ms: number) => fmt("dt", (l) => new Intl.DateTimeFormat(l, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })).format(new Date(ms));
export const fmtTime = (ms: number) => fmt("t", (l) => new Intl.DateTimeFormat(l, { hour: "2-digit", minute: "2-digit" })).format(new Date(ms));
export const fmtEur = (cents: number) => fmt("eur", (l) => new Intl.NumberFormat(l, { style: "currency", currency: "EUR" })).format(cents / 100);
export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Date ISO (AAAA-MM-JJ) d'un instant, en heure locale. */
export function isoDay(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Début de journée locale pour une date ISO. */
export function dayStart(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
