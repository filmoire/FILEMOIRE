"use client";

import { ArrowRight, Gift, Lock } from "lucide-react";
import { BookBadge, InvitationBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { pkg } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { progress } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

export function BuyerHome() {
  const orders = useDemo((s) => s.orders).filter((o) => !o.external);
  const projects = useDemo((s) => s.projects);
  const notes = useDemo((s) => s.notifications).filter((n) => n.to === "acheteur").slice(0, 5);
  const gifts = orders.filter((o) => o.status === "payee").map((o) => ({ o, p: projects.find((p) => p.id === o.projectId)! })).filter((x) => x.p);
  const pending = orders.filter((o) => o.status === "en_attente");
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Espace acheteur"
        title="Bonjour Sophie"
        intro="Vous suivez ici les cadeaux que vous avez offerts. Les réponses appartiennent aux narrateurs : vous voyez leur avancement, pas leur contenu."
        actions={
          <Button size="lg" asChild>
            <Link href="/acheteur/offrir">
              <Gift /> Offrir un nouveau cadeau
            </Link>
          </Button>
        }
      />
      {pending.length > 0 && (
        <div className="mt-6 rounded-lg border border-warning/30 bg-warning-bg p-4 text-[15px]">
          {pending.length} commande(s) en attente de paiement. <Link href="/acheteur/commandes">Voir mes commandes</Link>
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="h-gifts" className="space-y-4">
          <h2 id="h-gifts" className="text-2xl">Mes cadeaux</h2>
          {gifts.length === 0 && (
            <EmptyState icon={<Gift />} title="Aucun cadeau pour l'instant" action={<Button asChild><Link href="/acheteur/offrir">Offrir Filémoire</Link></Button>}>
              Choisissez une formule, un destinataire et une date : l'invitation partira automatiquement.
            </EmptyState>
          )}
          {gifts.map(({ o, p }) => {
            const pr = progress(p);
            return (
              <article key={o.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl">
                      {p.narrator.firstName} {p.narrator.lastName}
                    </h3>
                    <p className="text-[15px] text-ink-muted">
                      {pkg(p.packageCode).name} · {o.ref}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <InvitationBadge s={p.invitation.status} />
                    <BookBadge s={p.book.status} />
                  </div>
                </div>
                {p.invitation.status === "acceptee" && p.privacy.buyerSeesProgress ? (
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>
                        {pr.answered} question{pr.answered > 1 ? "s" : ""} racontée{pr.answered > 1 ? "s" : ""} sur {pr.total}
                      </span>
                      <span className="font-semibold">{pr.percent} %</span>
                    </div>
                    <Progress value={pr.percent} label={`Progression de ${p.narrator.firstName}`} />
                  </div>
                ) : p.invitation.status === "acceptee" ? (
                  <p className="mt-4 flex items-center gap-2 text-[15px] text-ink-muted">
                    <Lock className="size-4" aria-hidden /> {p.narrator.firstName} a choisi de ne pas partager sa progression détaillée.
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" asChild>
                    <Link href={`/acheteur/suivi?projet=${p.id}`}>
                      Suivre <ArrowRight />
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/acheteur/cadeaux">Invitation</Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
        <aside aria-labelledby="h-news" className="space-y-4">
          <h2 id="h-news" className="text-2xl">Nouvelles</h2>
          <div className="card divide-y divide-line">
            {notes.length === 0 && <p className="p-5 text-[15px] text-ink-muted">Pas encore de nouvelles.</p>}
            {notes.map((n) => (
              <Link key={n.id} href={n.href ?? "/acheteur"} className="block p-4 no-underline hover:bg-creme-200">
                <p className="font-semibold text-ink">{n.title}</p>
                <p className="text-sm text-ink-muted">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{fmtDateTime(n.at)}</p>
              </Link>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-or bg-or-50/40 p-5">
            <p className="font-semibold text-prune">Exemplaires supplémentaires</p>
            <p className="mt-1 text-[15px] text-ink-muted">Un livre identique pour les enfants et petits-enfants.</p>
            <Button variant="link" asChild>
              <Link href="/acheteur/commandes">Commander des exemplaires</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
