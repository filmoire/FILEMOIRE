"use client";

import * as S from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Switch({ id, checked, onCheckedChange, label, hint, disabled }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        {hint && <p className="text-sm text-ink-muted" id={`${id}-hint`}>{hint}</p>}
      </div>
      <S.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn("relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-prune data-[state=unchecked]:bg-creme-300 disabled:opacity-50")}
      >
        <S.Thumb className="block size-6 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
      </S.Root>
    </div>
  );
}
