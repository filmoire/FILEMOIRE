"use client";

import { SuggestionCard } from "@/components/narrator/bits";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useDemo } from "@/lib/store";
import { useEditorViewer, myAccess } from "./shared";

export function EditorReview() {
  const EDITOR_VIEWER = useEditorViewer();
  const projects = useDemo((s) => s.projects).filter((p) => myAccess(p, EDITOR_VIEWER.email)?.status === "active");
  const groups = (["en_attente", "acceptee", "refusee"] as const).map((k) => [k, projects.flatMap((p) => p.suggestions.filter((s) => s.status === k && s.author === myAccess(p, EDITOR_VIEWER.email)!.name).map((s) => ({ p, s })))] as const);
  const total = groups.reduce((n, [, l]) => n + l.length, 0);
  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader eyebrow="Espace éditeur familial" title="Mes propositions" intro="Le narrateur accepte ou refuse chacune de vos propositions. Vous êtes prévenu de chaque décision." />
      {total === 0 && (
        <div className="mt-8">
          <EmptyState title="Aucune proposition pour l'instant">Ouvrez un livre confié et proposez une correction sur un souvenir partagé.</EmptyState>
        </div>
      )}
      {groups.map(([k, list]) =>
        list.length ? (
          <section key={k} className="mt-8" aria-labelledby={`h-${k}`}>
            <h2 id={`h-${k}`} className="text-2xl">
              {{ en_attente: "En attente de décision", acceptee: "Acceptées", refusee: "Refusées" }[k]} ({list.length})
            </h2>
            <div className="mt-4 space-y-3">
              {list.map(({ p, s }) => (
                <div key={s.id}>
                  <p className="mb-1 text-sm text-ink-muted">Livre de {p.narrator.firstName}</p>
                  <SuggestionCard project={p} s={s} canDecide={false} />
                </div>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
