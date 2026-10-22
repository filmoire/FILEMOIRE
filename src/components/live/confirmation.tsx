"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tr } from "@/i18n/core";
import { useLang } from "@/i18n/lang";

type Request = {
  message: string;
  action?: string;
  resolve: (value: boolean) => void;
};
let listener: ((request: Request) => void) | undefined;
export function confirmAction(
  message: string,
  action = "Confirmer",
): Promise<boolean> {
  return new Promise((resolve) => {
    if (listener) listener({ message, action, resolve });
    else resolve(false);
  });
}
export function LiveConfirmation() {
  useLang((s) => s.lang);
  const [request, setRequest] = useState<Request | null>(null);
  const active = useRef<Request | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    listener = (next) => {
      active.current?.resolve(false);
      active.current = next;
      trigger.current = document.activeElement as HTMLElement;
      setRequest(next);
    };
    return () => {
      listener = undefined;
      active.current?.resolve(false);
    };
  }, []);
  const close = (confirmed: boolean) => {
    active.current?.resolve(confirmed);
    active.current = null;
    setRequest(null);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <Dialog
      appearance="dashboard"
      open={!!request}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      title={tr(request?.action ?? "Confirmer")}
      description={tr(request?.message ?? "")}
      initialFocusRef={cancel}
      footer={
        <>
          <Button ref={cancel} variant="outline" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => close(true)}>
            {tr(request?.action ?? "Confirmer")}
          </Button>
        </>
      }
    />
  );
}
