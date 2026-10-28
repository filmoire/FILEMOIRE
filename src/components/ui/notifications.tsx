"use client";

import {
  CircleCheck,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { Toaster } from "sonner";
import { useLang } from "@/i18n/lang";

/** One notification surface for live and demo workflows. Inline guidance stays visible. */
export function Notifications() {
  const lang = useLang((s) => s.lang);
  return (
    <Toaster
      theme="light"
      position="bottom-right"
      offset={24}
      mobileOffset={16}
      closeButton
      duration={6000}
      visibleToasts={3}
      containerAriaLabel="Notifications"
      icons={{
        success: (
          <CircleCheck className="size-5 text-success" aria-hidden="true" />
        ),
        error: (
          <CircleAlert className="size-5 text-danger" aria-hidden="true" />
        ),
        info: <Info className="size-5 text-info" aria-hidden="true" />,
        warning: (
          <TriangleAlert className="size-5 text-warning" aria-hidden="true" />
        ),
        loading: (
          <LoaderCircle
            className="size-5 animate-spin text-prune motion-reduce:animate-none"
            aria-hidden="true"
          />
        ),
      }}
      toastOptions={{
        closeButtonAriaLabel:
          lang === "en" ? "Dismiss notification" : "Fermer la notification",
        classNames: {
          toast:
            "!rounded-xl !border !border-line !bg-creme !p-5 !text-ink !shadow-lift !font-sans",
          title: "!text-sm !font-semibold !leading-snug",
          description: "!text-sm !leading-relaxed !text-ink-muted",
          success: "!border-success/30",
          error: "!border-danger/40",
          info: "!border-info/30",
          warning: "!border-warning/30",
          closeButton:
            "!size-7 !border-line !bg-white !text-ink hover:!bg-creme-200 focus-visible:!outline-terre",
        },
      }}
    />
  );
}
