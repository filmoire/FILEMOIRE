"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { guideProject, guideSteps, useVisited } from "@/lib/guide";
import { useNav } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

export function GuidePanel() {
  const state = useDemo();
  const visited = useVisited((s) => s.paths);
  const nav = useNav();
  const steps = guideSteps(state, visited);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  if (!state.guideOpen)
    return (
      <button
        onClick={() => state.toggleGuide(true)}
        className="no-print fixed bottom-4 right-4 z-40 rounded-full bg-prune px-4 py-2.5 text-sm font-semibold text-creme shadow-lift hover:bg-prune-700"
      >
        Guide de démo · {done}/{steps.length}
      </button>
    );

  const go = (i: number) => {
    const s = steps[i];
    const p = guideProject(state);
    if (s.persona === "narrateur") {
      if (p && p.invitation.status === "acceptee") state.setPersona({ role: "narrateur", projectId: p.id });
    } else if (s.persona) state.setPersona(s.persona);
    nav.push(s.href);
  };

  return (
    <aside className="no-print fixed inset-x-2 bottom-2 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white shadow-lift sm:inset-x-auto sm:right-4 sm:w-[380px]" aria-label="Guide de démonstration">
      <div className="sticky top-0 z-10 border-b border-line bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-xl font-semibold text-prune">Guide de démonstration</p>
            <p className="text-sm text-ink-muted">
              {done} étape{done > 1 ? "s" : ""} sur {steps.length} · scénario {state.scenario === "avance" ? "projet avancé" : "parcours complet"}
            </p>
          </div>
          <button onClick={() => state.toggleGuide(false)} className="rounded-md p-1.5 text-ink-muted hover:bg-creme-200" aria-label="Réduire le guide">
            <X className="size-5" />
          </button>
        </div>
        <Progress value={(done / steps.length) * 100} label="Avancement du guide" className="mt-3" />
      </div>
      <ol className="divide-y divide-line">
        {steps.map((s, i) => (
          <li key={s.n} className={cn("flex gap-3 p-3 px-4", next?.n === s.n && "bg-terre-50/60")}>
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                s.done ? "border-success bg-success text-white" : "border-line text-ink-muted",
              )}
              aria-hidden
            >
              {s.done ? <Check className="size-3.5" /> : s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px] font-medium", s.done && "text-ink-muted line-through decoration-ink-soft/50")}>
                <span className="sr-only">{s.done ? "Fait : " : "À faire : "}</span>
                {s.title}
              </p>
              {next?.n === s.n && <p className="mt-0.5 text-sm text-ink-muted">{s.how}</p>}
            </div>
            <Button size="sm" variant={next?.n === s.n ? "primary" : "ghost"} onClick={() => go(i)} aria-label={`Aller à l'étape ${s.n} : ${s.title}`}>
              <ChevronRight />
            </Button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
