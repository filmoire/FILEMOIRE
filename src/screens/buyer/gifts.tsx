"use client";

import { Copy, Mail, RefreshCw, Send, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { InvitationBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { pkg, theme } from "@/lib/catalog";
import { absoluteUrl, Link } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export function BuyerGifts() {
  const orders = useDemo((s) => s.orders).filter((o) => !o.external && o.status === "payee");
  const projects = useDemo((s) => s.projects);
  const [confirmNode, ask] = useConfirm();
  const st = useDemo.getState;
  return (
    <div className="container-page py-10">
      {confirmNode}
      <PageHeader eyebrow="Espace acheteur" title="Mes cadeaux" intro="Le statut de chaque invitation. Une invitation est valable 30 jours ; vous pouvez la renvoyer ou l'annuler tant qu'elle n'est pas acceptée." />
      <div className="mt-8 space-y-5">
        {orders.length === 0 && (
          <EmptyState title="Aucun cadeau pour l'instant" action={<Button asChild><Link href="/acheteur/offrir">Offrir Filémoire</Link></Button>}>
            Vos cadeaux et leurs invitations apparaîtront ici.
          </EmptyState>
        )}
        {orders.map((o) => {
          const p = projects.find((x) => x.id === o.projectId);
          if (!p) return null;
          const inv = p.invitation;
          const link = absoluteUrl(`/invitation/${inv.token}`);
          return (
            <article key={o.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl">
                    Pour {p.narrator.firstName} {p.narrator.lastName}
                  </h2>
                  <p className="text-[15px] text-ink-muted">
                    {pkg(p.packageCode).name} · {theme(p.theme).name} · {p.length} questions · {o.ref}
                  </p>
                </div>
                <InvitationBadge s={inv.status} />
              </div>
              <ol className="mt-5 grid gap-2 text-[15px] sm:grid-cols-3">
                <li className="rounded-md bg-creme-200 p-3">
                  <span className="block text-xs uppercase tracking-wide text-ink-muted">Envoi</span>
                  {inv.sentAt ? fmtDateTime(inv.sentAt) : `Programmé le ${fmtDate(inv.sendAt)}`}
                </li>
                <li className="rounded-md bg-creme-200 p-3">
                  <span className="block text-xs uppercase tracking-wide text-ink-muted">Validité</span>
                  {inv.status === "acceptee" ? "—" : `Jusqu'au ${fmtDate(inv.expiresAt)}`}
                </li>
                <li className="rounded-md bg-creme-200 p-3">
                  <span className="block text-xs uppercase tracking-wide text-ink-muted">Acceptation</span>
                  {inv.acceptedAt ? fmtDateTime(inv.acceptedAt) : "En attente"}
                </li>
              </ol>
              {inv.status === "expiree" && <Alert tone="warning" className="mt-4" title="L'invitation a expiré">Renvoyez-la : un nouveau lien sera créé et l'ancien ne fonctionnera plus.</Alert>}
              {inv.status === "revoquee" && <Alert tone="info" className="mt-4">Invitation annulée. Vous pouvez en envoyer une nouvelle.</Alert>}
              <div className="mt-5 flex flex-wrap gap-2">
                {inv.status === "programmee" && (
                  <Button variant="secondary" onClick={() => { st().sendInvitationNow(p.id); toast.success("Invitation envoyée"); }}>
                    <Send /> Envoyer maintenant
                  </Button>
                )}
                {["envoyee", "expiree", "revoquee"].includes(inv.status) && (
                  <Button variant="secondary" onClick={() => { st().resendInvitation(p.id); toast.success("Nouvelle invitation envoyée", { description: "L'ancien lien ne fonctionne plus." }); }}>
                    <RefreshCw /> {inv.status === "envoyee" ? "Renvoyer" : "Envoyer une nouvelle invitation"}
                  </Button>
                )}
                {["envoyee", "programmee"].includes(inv.status) && (
                  <Button
                    variant="danger-outline"
                    onClick={() => ask({ title: "Annuler l'invitation ?", body: `Le lien envoyé à ${p.narrator.firstName} ne fonctionnera plus. Vous pourrez en envoyer une nouvelle.`, confirm: "Annuler l'invitation", danger: true, onConfirm: () => { st().revokeInvitation(p.id); toast("Invitation annulée"); } })}
                  >
                    <XCircle /> Annuler
                  </Button>
                )}
                {inv.status === "envoyee" && (
                  <>
                    <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(link).then(() => toast.success("Lien copié"), () => toast.error("Copie impossible dans ce navigateur")); }}>
                      <Copy /> Copier le lien
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link href="/demo/boite-mail">
                        <Mail /> Voir l'e-mail
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => { st().expireInvitation(p.id); toast("Démo : invitation expirée"); }}>
                      Démo : faire expirer
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
