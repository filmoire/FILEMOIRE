"use client";

/** Notifications éphémères (sonner), traduites dans la langue de l'interface. */
import { toast as base, type ExternalToast } from "sonner";
import { tr } from "@/i18n/core";

type Msg = Parameters<typeof base>[0];
const m = (x: Msg) => (typeof x === "string" ? tr(x) : x);
const o = (x?: ExternalToast) => (x && typeof x.description === "string" ? { ...x, description: tr(x.description) } : x);

export const toast = Object.assign((x: Msg, opts?: ExternalToast) => base(m(x), o(opts)), {
  success: (x: Msg, opts?: ExternalToast) => base.success(m(x), o(opts)),
  error: (x: Msg, opts?: ExternalToast) => base.error(m(x), o(opts)),
  warning: (x: Msg, opts?: ExternalToast) => base.warning(m(x), o(opts)),
  info: (x: Msg, opts?: ExternalToast) => base.info(m(x), o(opts)),
});
