/** Runtime JSX : traduit les textes au rendu, puis délègue à React. */
import * as R from "react/jsx-runtime";
export type { JSX } from "react/jsx-runtime";
import { getLang, translateProps } from "./core";

export const Fragment = R.Fragment;
type Props = Parameters<typeof R.jsx>[1];

export function jsx(type: Parameters<typeof R.jsx>[0], props: Props, key?: Parameters<typeof R.jsx>[2]) {
  if (getLang() === "fr") return R.jsx(type, props, key);
  const p = translateProps(props as Record<string, unknown>) as Props;
  return Array.isArray((p as { children?: unknown }).children) ? R.jsxs(type, p, key) : R.jsx(type, p, key);
}

export function jsxs(type: Parameters<typeof R.jsxs>[0], props: Props, key?: Parameters<typeof R.jsxs>[2]) {
  if (getLang() === "fr") return R.jsxs(type, props, key);
  const p = translateProps(props as Record<string, unknown>) as Props;
  return Array.isArray((p as { children?: unknown }).children) ? R.jsxs(type, p, key) : R.jsx(type, p, key);
}
