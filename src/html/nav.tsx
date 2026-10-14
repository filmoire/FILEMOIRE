"use client";

/**
 * Navigation abstraite : implémentation « routeur par hash » pour la version HTML autonome.
 * Mêmes exports que src/lib/nav.tsx (version Next.js) ; esbuild substitue ce module au build.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { ASSETS } from "./assets";

interface Route {
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
}

const Ctx = createContext<Route>({ path: "/", query: new URLSearchParams(), params: {} });
let pendingAnchor: string | null = null;

function parse(): { path: string; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [p, q = ""] = raw.split("?");
  return { path: p.startsWith("/") ? p : `/${p}`, query: new URLSearchParams(q) };
}

/** Transforme « /chemin?x=1#ancre » en hash et retient l'ancre pour défiler après l'affichage. */
function toHash(href: string) {
  const [pq, anchor] = href.split("#");
  return { hash: `#${pq || "/"}`, anchor: anchor || null };
}

export function navigate(href: string, replace = false) {
  if (!href || href === "#") return;
  const { hash, anchor } = toHash(href);
  pendingAnchor = anchor;
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  if (replace) {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = hash;
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function HashRouter({ patterns, children }: { patterns: string[]; children: ReactNode }) {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const on = () => setLoc(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    const a = pendingAnchor;
    pendingAnchor = null;
    const t = setTimeout(() => {
      const el = a ? document.getElementById(a) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0 });
    }, 60);
    return () => clearTimeout(t);
  }, [loc]);
  const value = useMemo(() => {
    let params: Record<string, string> = {};
    for (const p of patterns) {
      const m = matchRoute(p, loc.path);
      if (m) {
        params = m;
        break;
      }
    }
    return { ...loc, params };
  }, [loc, patterns]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRoute = () => useContext(Ctx);

export type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function Link({ href, onClick, ...rest }: LinkProps) {
  const { hash } = toHash(href);
  return (
    <a
      href={href === "#" ? "#/" : hash}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}

export function useNav() {
  const { path } = useContext(Ctx);
  return { pathname: path, push: (h: string) => navigate(h), replace: (h: string) => navigate(h, true) };
}

export function useRouteParam(name: string): string | undefined {
  return useContext(Ctx).params[name];
}

export function useQueryParam(name: string): string | null {
  return useContext(Ctx).query.get(name);
}

/** Fichiers de /public intégrés au fichier HTML (data URI). */
export const asset = (path: string) => ASSETS[path] ?? path;

/** URL absolue d'une route : adresse de la page + hash (QR codes, liens copiables). */
export const absoluteUrl = (path: string) => `${window.location.origin}${window.location.pathname}#${path}`;
