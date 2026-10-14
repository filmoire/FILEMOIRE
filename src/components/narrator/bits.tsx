"use client";

import { Check, Eye, Lock, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { suggestionLabel, VISIBILITY_LABEL, wordDiff } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import type { Project, Suggestion, Visibility } from "@/lib/types";
import { cn, fmtDateTime } from "@/lib/utils";

const VIS_ICON = { moi: Lock, editeur: Eye, famille: Users } as const;

export function VisibilityPicker({ project, memoryId, value, compact, disabled }: { project: Project; memoryId: string; value: Visibility; compact?: boolean; disabled?: boolean }) {
  const editor = project.editors.find((e) => e.status !== "revoquee");
  const hint: Record<Visibility, string> = {
    moi: "Personne d'autre ne peut le lire.",
    editeur: editor ? `${editor.name} peut le lire et proposer des corrections.` : "Votre futur éditeur familial pourra le lire.",
    famille: `${project.buyerName}${editor ? ` et ${editor.name}` : ""} peuvent le lire.`,
  };
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-[15px] font-medium">Qui peut lire ce souvenir ?</legend>
      <div className={cn("grid gap-2", !compact && "sm:grid-cols-3")}>
        {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => {
          const I = VIS_ICON[v];
          const on = value === v;
          return (
            <label key={v} className={cn("flex cursor-pointer gap-2 rounded-md border p-3 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-terre/50", on ? "border-prune bg-prune-50" : "border-line bg-white hover:border-or")}>
              <input
                type="radio"
                name={`vis-${memoryId}`}
                checked={on}
                className="mt-0.5 size-4 accent-prune"
                onChange={() => {
                  useDemo.getState().setVisibility(project.id, memoryId, v);
                  toast.success("Visibilité mise à jour", { description: hint[v] });
                }}
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <I className="size-4 text-prune" aria-hidden /> {VISIBILITY_LABEL[v]}
                </span>
                {!compact && <span className="mt-0.5 block text-ink-muted">{hint[v]}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SuggestionCard({ project, s, canDecide }: { project: Project; s: Suggestion; canDecide: boolean }) {
  const chapterTitle = (id: string) => project.chapters.find((c) => c.id === id)?.title ?? "?";
  const before = s.kind === "ordre_chapitres" ? (JSON.parse(s.before) as string[]).map(chapterTitle).join(" → ") : s.before;
  const after = s.kind === "ordre_chapitres" ? (JSON.parse(s.after) as string[]).map(chapterTitle).join(" → ") : s.after;
  const diff = s.kind === "texte" ? wordDiff(before, after) : null;
  const decide = (accept: boolean) => {
    useDemo.getState().decideSuggestion(project.id, s.id, accept);
    toast.success(accept ? "Modification acceptée" : "Modification refusée", { description: accept ? "Le livre a été mis à jour. L'ancienne version reste dans l'historique." : "Rien n'a été changé." });
  };
  return (
    <article className="rounded-lg border border-info/30 bg-info-bg/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-info">
          {suggestionLabel(s)} · proposée par {s.author} · {fmtDateTime(s.createdAt)}
        </p>
        {s.status !== "en_attente" && <Badge tone={s.status === "acceptee" ? "success" : "neutral"}>{s.status === "acceptee" ? "Acceptée" : "Refusée"}</Badge>}
      </div>
      {s.note && <p className="quote mt-2 text-[17px]">« {s.note} »</p>}
      {diff ? (
        <p className="mt-3 rounded-md bg-white p-3 font-serif text-[17px] leading-relaxed" aria-label="Différences proposées" translate="no">
          {diff.map((d, i) =>
            d.k === "same" ? (
              <span key={i} translate="no">{d.t}</span>
            ) : d.k === "del" ? (
              <del key={i} className="bg-danger-bg text-danger decoration-danger/70">
                <span className="sr-only">supprimé : </span>
                <span translate="no">{d.t}</span>
              </del>
            ) : (
              <ins key={i} className="bg-success-bg text-success no-underline">
                <span className="sr-only">ajouté : </span>
                <span translate="no">{d.t}</span>
              </ins>
            ),
          )}
        </p>
      ) : (
        <div className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          <p className="rounded-md bg-white p-3">
            <span className="block text-xs uppercase tracking-wide text-ink-muted">Avant</span>
            {before}
          </p>
          <p className="rounded-md bg-white p-3">
            <span className="block text-xs uppercase tracking-wide text-ink-muted">Proposé</span>
            {after}
          </p>
        </div>
      )}
      {canDecide && s.status === "en_attente" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => decide(true)}>
            <Check /> Accepter
          </Button>
          <Button size="sm" variant="outline" onClick={() => decide(false)}>
            <X /> Refuser
          </Button>
        </div>
      )}
    </article>
  );
}

export function EditTextDialog({ title, initial, onSave, onClose, hint }: { title: string; initial: string; onSave: (t: string) => string | void; onClose: () => void; hint?: string }) {
  const [t, setT] = useState(initial);
  const [err, setErr] = useState<string>();
  return (
    <Dialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={hint}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (!t.trim()) return setErr("Le texte ne peut pas être vide.");
              const e = onSave(t);
              if (e) setErr(e);
              else onClose();
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <label htmlFor="edit-text" className="sr-only">
        Texte
      </label>
      <Textarea id="edit-text" value={t} onChange={(e) => setT(e.target.value)} className="min-h-[300px] font-serif text-lg" aria-invalid={!!err} />
      {err && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {err}
        </p>
      )}
    </Dialog>
  );
}
