"use client";

import { BookOpen, Inbox, Lock } from "lucide-react";
import { BookBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { canRead } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import { useEditorViewer, myAccess } from "./shared";

export function EditorHome() {
  const EDITOR_VIEWER = useEditorViewer();
  const projects = useDemo((s) => s.projects);
  const mine = projects.filter((p) => myAccess(p, EDITOR_VIEWER.email));
  const active = mine.filter((p) => myAccess(p, EDITOR_VIEWER.email)!.status === "active");
  const invited = mine.filter((p) => myAccess(p, EDITOR_VIEWER.email)!.status === "invitee");
  const revoked = mine.filter((p) => myAccess(p, EDITOR_VIEWER.email)!.status === "revoquee");
  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader eyebrow="Espace éditeur familial" title={`Bonjour ${mine.map((p) => myAccess(p, EDITOR_VIEWER.email)?.name).find(Boolean)?.split(" ")[0] ?? ""}`} intro="Vous aidez à relire et organiser des livres de famille. Vous ne voyez que ce que chaque narrateur choisit de vous partager, et vos modifications sont des propositions." />
      {invited.map((p) => (
        <Alert key={p.id} tone="info" className="mt-6" title={`${p.narrator.firstName} ${p.narrator.lastName} vous invite`} action={<Button size="sm" asChild><Link href={`/invitation/${myAccess(p, EDITOR_VIEWER.email)!.token}`}>Voir l'invitation</Link></Button>}>
          Acceptez l'invitation pour accéder aux souvenirs partagés.
        </Alert>
      ))}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {active.length === 0 && invited.length === 0 && (
          <div className="md:col-span-2">
            <EmptyState icon={<Inbox />} title="Aucun livre ne vous est confié">
              Un narrateur peut vous inviter depuis sa page « Famille ». L'invitation arrive par e-mail (menu « E-mails » de la démo).
            </EmptyState>
          </div>
        )}
        {active.map((p) => {
          const shared = p.memories.filter((m) => canRead(p, m, EDITOR_VIEWER)).length;
          const mine = p.suggestions.filter((s) => s.author === myAccess(p, EDITOR_VIEWER.email)!.name);
          return (
            <article key={p.id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl">Le livre de {p.narrator.firstName}</h2>
                <BookBadge s={p.book.status} />
              </div>
              <p className="mt-2 text-ink-muted">
                {shared} souvenir(s) partagé(s) avec vous · {mine.filter((s) => s.status === "en_attente").length} proposition(s) en attente · {mine.filter((s) => s.status === "acceptee").length} acceptée(s)
              </p>
              {p.book.status === "relecture_editoriale" && <Alert tone="info" className="mt-4">{p.narrator.firstName} vous demande une relecture.</Alert>}
              <Button className="mt-5" asChild>
                <Link href={`/editeur/livres/${p.id}`}>
                  <BookOpen /> Ouvrir le livre
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
      {revoked.length > 0 && (
        <p className="mt-6 flex items-center gap-2 text-[15px] text-ink-muted">
          <Lock className="size-4" aria-hidden /> Accès retiré par le narrateur : {revoked.map((p) => `livre de ${p.narrator.firstName}`).join(", ")}.
        </p>
      )}
    </div>
  );
}
