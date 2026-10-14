import { cn } from "@/lib/utils";

export function Progress({ value, label, className, tone = "terre" }: { value: number; label: string; className?: string; tone?: "terre" | "prune" | "or" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className={cn("h-2.5 w-full overflow-hidden rounded-full bg-creme-300", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone === "terre" ? "bg-terre" : tone === "prune" ? "bg-prune" : "bg-or")} style={{ width: `${v}%` }} />
    </div>
  );
}
