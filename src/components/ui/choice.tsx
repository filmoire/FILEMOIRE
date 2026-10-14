import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Groupe de choix radio présenté en cartes (cibles tactiles larges). */
export function ChoiceCards<T extends string>({
  name,
  value,
  onChange,
  options,
  legend,
  columns = 1,
  error,
}: {
  name: string;
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; title: ReactNode; description?: ReactNode; aside?: ReactNode; disabled?: boolean }[];
  legend: ReactNode;
  columns?: 1 | 2 | 3;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-medium text-ink">{legend}</legend>
      <div className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3")}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-lg border bg-white p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-terre/50",
                checked ? "border-prune bg-prune-50/60 shadow-soft" : "border-line hover:border-or",
                o.disabled && "cursor-not-allowed opacity-55",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={checked} disabled={o.disabled} onChange={() => onChange(o.value)} className="mt-1 size-5 shrink-0 accent-prune" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 font-semibold text-ink">
                  {o.title}
                  {o.aside}
                </span>
                {o.description && <span className="mt-0.5 block text-sm text-ink-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Checkbox({ id, checked, onChange, children, invalid }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; invalid?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[15px]">
      <input id={id} type="checkbox" checked={checked} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-prune" />
      <span>{children}</span>
    </label>
  );
}
