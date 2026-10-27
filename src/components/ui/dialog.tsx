"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { tr } from "@/i18n/core";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
  initialFocusRef,
  appearance,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  initialFocusRef?: RefObject<HTMLButtonElement | null>;
  appearance?: "dashboard";
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=open]:animate-fade-up" />
        <D.Content
          onOpenAutoFocus={
            initialFocusRef
              ? (e) => {
                  e.preventDefault();
                  initialFocusRef.current?.focus();
                }
              : undefined
          }
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-creme p-5 shadow-lift sm:p-7",
            wide ? "max-w-3xl" : "max-w-lg",
            appearance === "dashboard" && "dashboard dash-dialog",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <D.Title className="font-serif text-2xl font-semibold text-prune">
              {title}
            </D.Title>
            <D.Close
              className="-mr-2 -mt-1 rounded-md p-2 text-ink-muted hover:bg-creme-200"
              aria-label={tr("Fermer")}
            >
              <X className="size-5" />
            </D.Close>
          </div>
          {description ? (
            <D.Description className="mt-2 text-ink-muted">
              {description}
            </D.Description>
          ) : (
            <D.Description className="sr-only">
              Fenêtre de dialogue
            </D.Description>
          )}
          {children && <div className="mt-5">{children}</div>}
          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
