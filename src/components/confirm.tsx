"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface Ask {
  title: ReactNode;
  body?: ReactNode;
  confirm: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** Fenêtre de confirmation dans la page (jamais window.confirm). */
export function useConfirm() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const node = (
    <Dialog
      open={!!ask}
      onOpenChange={(o) => !o && setAsk(null)}
      title={ask?.title}
      description={ask?.body}
      footer={
        <>
          <Button variant="outline" onClick={() => setAsk(null)}>
            Annuler
          </Button>
          <Button
            variant={ask?.danger ? "danger" : "primary"}
            onClick={() => {
              ask?.onConfirm();
              setAsk(null);
            }}
          >
            {ask?.confirm}
          </Button>
        </>
      }
    />
  );
  return [node, setAsk] as const;
}
