import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, intro, actions, className }: { eyebrow?: ReactNode; title: ReactNode; intro?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p className="mt-3 text-lg text-ink-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-or/70 bg-white/60 px-6 py-10 text-center">
      {icon && <div className="text-or [&_svg]:size-9">{icon}</div>}
      <p className="font-serif text-xl font-semibold text-prune">{title}</p>
      {children && <div className="max-w-md text-ink-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold text-prune">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

export function GoldRule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("gold-rule", className)} />;
}

export function SimTag({ children = "Simulation" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-dashed border-terre/60 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-terre-700">{children}</span>;
}
