import { AlertTriangle, CheckCircle2, FlaskConical, Info, Lock, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const map = {
  info: { c: "border-info/25 bg-info-bg text-info", I: Info },
  success: { c: "border-success/25 bg-success-bg text-success", I: CheckCircle2 },
  warning: { c: "border-warning/25 bg-warning-bg text-warning", I: AlertTriangle },
  danger: { c: "border-danger/25 bg-danger-bg text-danger", I: XCircle },
  privacy: { c: "border-prune-100 bg-prune-50 text-prune", I: Lock },
  sim: { c: "border-dashed border-terre/50 bg-white text-terre-700", I: FlaskConical },
} as const;

export function Alert({ tone = "info", title, children, action, className }: { tone?: keyof typeof map; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { c, I } = map[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4", c, className)}>
      <I className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-[15px] text-ink">
        {title && <p className="font-semibold text-inherit">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink/90")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
