"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { QuestionBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { theme } from "@/lib/catalog";
import { Link, useNav, useQueryParam } from "@/lib/nav";
import { progress, sortedChapters } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { QuestionStatus } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

const FILTERS: [string, string, QuestionStatus[] | null][] = [
  ["tout", "Toutes", null],
  ["araconter", "À raconter", ["disponible", "brouillon"]],
  ["repondue", "Racontées", ["repondue"]],
  ["reportee", "Reportées", ["reportee"]],
  ["passee", "Passées", ["passee"]],
  ["avenir", "À venir", ["verrouillee"]],
];

export function QuestionsList() {
  const p = useNarratorProject()!;
  const q0 = useQueryParam("filtre");
  const [f, setF] = useState("tout");
  useEffect(() => {
    if (q0 && FILTERS.some(([k]) => k === q0)) setF(q0);
  }, [q0]);
  const nav = useNav();
  const pr = progress(p);
  const flt = FILTERS.find(([k]) => k === f)![2];
  const chapters = sortedChapters(p);
  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader eyebrow={theme(p.theme).name} title="Mes questions" intro={`${pr.total} questions, une à la fois. ${p.cadenceDays ? `Une nouvelle question tous les ${p.cadenceDays === 7 ? "sept" : p.cadenceDays} jours.` : "Vous demandez la suivante quand vous voulez."}`} />
      <div className="card mt-6 p-5">
        <div className="flex flex-wrap justify-between gap-2 text-[15px]">
          <span>
            <strong>{pr.answered}</strong> racontée{pr.answered > 1 ? "s" : ""} · {pr.drafts} brouillon{pr.drafts > 1 ? "s" : ""} · {pr.skipped} passée{pr.skipped > 1 ? "s" : ""} · {pr.postponed} reportée{pr.postponed > 1 ? "s" : ""}
          </span>
          <span className="font-semibold">{pr.percent} %</span>
        </div>
        <Progress value={pr.percent} label="Progression" className="mt-2" />
        <p className="mt-2 text-sm text-ink-muted">Seules les questions racontées comptent dans la progression.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer les questions">
        {FILTERS.map(([k, l, sts]) => (
          <button key={k} onClick={() => setF(k)} aria-pressed={f === k} className={cn("rounded-full border px-4 py-2 text-[15px]", f === k ? "border-prune bg-prune text-creme" : "border-line bg-white hover:border-or")}>
            {l}
            {sts && <span className="ml-1.5 opacity-70">({p.questions.filter((x) => sts.includes(x.status)).length})</span>}
          </button>
        ))}
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            const id = useDemo.getState().requestNextQuestion(p.id);
            if (id) {
              toast.success("Nouvelle question disponible");
              nav.push(`/narrateur/questions/${id}`);
            } else toast("Toutes les questions sont déjà disponibles.");
          }}
        >
          <Sparkles /> Recevoir la suivante
        </Button>
      </div>
      <div className="mt-6 space-y-8">
        {chapters.map((c) => {
          const qs = p.questions.filter((x) => x.chapter === c.key && (!flt || flt.includes(x.status)));
          if (!qs.length) return null;
          return (
            <section key={c.id} aria-labelledby={`h-${c.id}`}>
              <h2 id={`h-${c.id}`} className="text-2xl">
                {c.title}
              </h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
                {qs.map((q) => (
                  <li key={q.id}>
                    <Link href={`/narrateur/questions/${q.id}`} className={cn("flex items-center gap-4 px-4 py-4 no-underline hover:bg-creme-200 sm:px-5", q.status === "verrouillee" && "text-ink-muted")}>
                      <span className="w-8 shrink-0 text-center font-serif text-lg text-ink-soft">{q.index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[16px]", q.status !== "verrouillee" && "text-ink")}>{q.text}</span>
                        {q.status === "verrouillee" && q.availableAt < Number.MAX_SAFE_INTEGER && <span className="text-sm">Disponible le {fmtDate(q.availableAt)}</span>}
                        {q.status === "reportee" && q.postponedUntil && <span className="text-sm text-info">Revient le {fmtDate(q.postponedUntil)}</span>}
                      </span>
                      <QuestionBadge s={q.status} />
                      <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
