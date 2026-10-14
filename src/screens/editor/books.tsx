"use client";

import { BookBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { canRead } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import { fmtDate } from "@/lib/utils";
import { useEditorViewer, myAccess } from "./shared";

export function EditorBooks() {
  const EDITOR_VIEWER = useEditorViewer();
  const projects = useDemo((s) => s.projects).filter((p) => myAccess(p, EDITOR_VIEWER.email));
  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader eyebrow="Espace éditeur familial" title="Livres confiés" />
      <ul className="mt-8 space-y-3">
        {projects.length === 0 && <EmptyState title="Aucun livre">Vous n'avez été invité sur aucun livre pour l'instant.</EmptyState>}
        {projects.map((p) => {
          const a = myAccess(p, EDITOR_VIEWER.email)!;
          return (
            <li key={p.id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl font-semibold text-prune">Le livre de {p.narrator.firstName} {p.narrator.lastName}</p>
                <p className="text-sm text-ink-muted">
                  Invité le {fmtDate(a.invitedAt)} · {a.status === "active" ? `${p.memories.filter((m) => canRead(p, m, EDITOR_VIEWER)).length} souvenir(s) partagé(s)` : "—"} · {a.canSuggest ? "peut proposer" : "lecture seule"}
                </p>
              </div>
              {a.status === "active" ? <BookBadge s={p.book.status} /> : <Badge tone={a.status === "invitee" ? "warning" : "neutral"}>{a.status === "invitee" ? "Invitation à accepter" : "Accès retiré"}</Badge>}
              {a.status === "active" && (
                <Button variant="secondary" asChild>
                  <Link href={`/editeur/livres/${p.id}`}>Ouvrir</Link>
                </Button>
              )}
              {a.status === "invitee" && (
                <Button asChild>
                  <Link href={`/invitation/${a.token}`}>Voir l'invitation</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
