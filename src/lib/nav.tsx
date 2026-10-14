"use client";

/**
 * Navigation abstraite : implémentation Next.js (App Router).
 * La version HTML autonome remplace ce module par src/html/nav.tsx (routeur par hash).
 */
import NextLink from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";

export type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function Link({ href, ...rest }: LinkProps) {
  return <NextLink href={href} {...rest} />;
}

export function useNav() {
  const r = useRouter();
  const pathname = usePathname() ?? "/";
  return { pathname, push: (h: string) => r.push(h), replace: (h: string) => r.replace(h) };
}

export function useRouteParam(name: string): string | undefined {
  const p = useParams();
  const v = p?.[name];
  return Array.isArray(v) ? v[0] : v;
}

/** Chemin d'un fichier de /public. */
export const asset = (path: string) => path;

/** URL absolue d'une route (QR codes, liens copiables). */
export const absoluteUrl = (path: string) => (typeof window === "undefined" ? path : window.location.origin + path);

/** Paramètre de requête (?nom=valeur), lu côté client pour rester compatible avec le rendu statique. */
export function useQueryParam(name: string): string | null {
  const pathname = usePathname();
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    setV(new URLSearchParams(window.location.search).get(name));
  }, [pathname, name]);
  return v;
}
