import type { CoverTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

const T = {
  prune: { bg: "bg-prune", text: "text-creme", sub: "text-or-100", frame: "border-or/70", rule: "bg-or" },
  creme: { bg: "bg-[#F7F0E4]", text: "text-prune", sub: "text-terre-700", frame: "border-or", rule: "bg-or" },
  terre: { bg: "bg-terre", text: "text-white", sub: "text-creme", frame: "border-creme/60", rule: "bg-creme/80" },
} as const;

/** Couverture de livre dessinée en CSS (modèles prédéfinis). */
export function BookCoverArt({ template, title, subtitle, author, className, size = "md" }: { template: CoverTemplate; title: string; subtitle?: string; author?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const t = T[template];
  return (
    <div className={cn("relative aspect-[148/210] overflow-hidden rounded-r-md rounded-l-sm shadow-book", t.bg, className)}>
      <div aria-hidden className="absolute inset-y-0 left-0 w-3 bg-black/15" />
      <div className={cn("absolute inset-[7%] flex flex-col items-center justify-between border py-[12%] text-center", t.frame)}>
        <span className={cn("font-sans text-[10px] font-semibold uppercase tracking-[0.3em]", t.sub, size === "sm" && "text-[7px]")}>Filémoire</span>
        <div className="px-3">
          <p className={cn("font-serif font-semibold leading-tight", t.text, size === "sm" ? "text-base" : size === "lg" ? "text-4xl" : "text-2xl")}>{title || "Sans titre"}</p>
          <div className={cn("mx-auto my-3 h-px w-10", t.rule)} />
          {subtitle && <p className={cn("font-serif italic", t.sub, size === "sm" ? "text-[10px]" : "text-base")}>{subtitle}</p>}
        </div>
        <span className={cn("font-serif", t.text, size === "sm" ? "text-[10px]" : "text-sm")}>{author}</span>
      </div>
    </div>
  );
}
