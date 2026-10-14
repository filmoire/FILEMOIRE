import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-creme-200 text-ink border-line",
  prune: "bg-prune-50 text-prune border-prune-100",
  terre: "bg-terre-50 text-terre-700 border-terre-100",
  or: "bg-or-50 text-or-700 border-or-100",
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/20",
  danger: "bg-danger-bg text-danger border-danger/20",
  info: "bg-info-bg text-info border-info/20",
  sim: "bg-white text-terre-700 border-dashed border-terre/60",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...p} />;
}
