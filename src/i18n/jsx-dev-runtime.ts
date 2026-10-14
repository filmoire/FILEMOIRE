/** Runtime JSX (développement) : traduit les textes au rendu, puis délègue à React. */
import * as R from "react/jsx-dev-runtime";
export type { JSX } from "react/jsx-dev-runtime";
import { getLang, translateProps } from "./core";
import { isLive } from "@/lib/mode";

export const Fragment = R.Fragment;
type A = Parameters<typeof R.jsxDEV>;

export function jsxDEV(type: A[0], props: A[1], key: A[2], isStatic: A[3], source?: A[4], self?: A[5]) {
  if (getLang() === "fr") return R.jsxDEV(type, props, key, isStatic, source, self);
  const p = translateProps(props as Record<string, unknown>, isLive && typeof type !== "string") as A[1];
  return R.jsxDEV(type, p, key, Array.isArray((p as { children?: unknown }).children), source, self);
}
