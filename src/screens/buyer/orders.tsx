"use client";

import { BookCopy, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { OrderBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, SimTag } from "@/components/ui/misc";
import { EXTRA_COPY_PRICE, pkg, theme } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { BOOK_FLOW } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import { fmtDate, fmtDateTime, fmtEur } from "@/lib/utils";

export function BuyerOrders() {
  const orders = useDemo((s) => s.orders).filter((o) => !o.external);
  const projects = useDemo((s) => s.projects);
  const [copiesFor, setCopiesFor] = useState<string | null>(null);
  const [n, setN] = useState(1);
  const [err, setErr] = useState<string>();
  const target = orders.find((o) => o.id === copiesFor);
  const buy = () => {
    if (!Number.isInteger(n) || n < 1 || n > 10) return setErr("Choisissez entre 1 et 10 exemplaires.");
    useDemo.getState().buyExtraCopies(copiesFor!, n);
    toast.success(`${n} exemplaire(s) ajouté(s)`, { description: "Paiement test accepté — aucune somme débitée." });
    setCopiesFor(null);
  };
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Espace acheteur" title="Mes commandes" intro="Détail des commandes, paiements de test et exemplaires supplémentaires." />
      <div className="mt-8 space-y-5">
        {orders.length === 0 && <EmptyState icon={<Receipt />} title="Aucune commande" action={<Button asChild><Link href="/acheteur/offrir">Offrir Filémoire</Link></Button>} />}
        {orders.map((o) => {
          const p = projects.find((x) => x.id === o.projectId);
          const printed = p && BOOK_FLOW.indexOf(p.book.status) >= BOOK_FLOW.indexOf("impression");
          return (
            <article key={o.id} id={o.id} className="card scroll-mt-24 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl">{o.ref}</h2>
                  <p className="text-[15px] text-ink-muted">
                    Passée le {fmtDate(o.createdAt)} · pour {o.recipient.firstName} {o.recipient.lastName}
                  </p>
                </div>
                <OrderBadge s={o.status} />
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
                <div className="flex justify-between gap-3 border-b border-line py-1.5"><dt>{pkg(o.packageCode).name}</dt><dd>{theme(o.theme).name}</dd></div>
                <div className="flex justify-between gap-3 border-b border-line py-1.5"><dt>Coffret cadeau</dt><dd>{o.giftBox ? "Oui" : "Non"}</dd></div>
                <div className="flex justify-between gap-3 border-b border-line py-1.5"><dt>Exemplaires</dt><dd>{1 + o.extraCopies}</dd></div>
                <div className="flex justify-between gap-3 border-b border-line py-1.5 font-semibold"><dt>Total TTC indicatif</dt><dd>{fmtEur(o.total)}</dd></div>
              </dl>
              {o.payments.length > 0 && (
                <div className="mt-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    Paiements <SimTag>test</SimTag>
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                    {o.payments.map((pay, i) => (
                      <li key={i}>
                        {fmtDateTime(pay.at)} — {pay.label} — {fmtEur(pay.amount)} — {pay.status === "acceptee" ? "accepté" : "refusé"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {o.status === "payee" && !printed && (
                  <Button variant="secondary" onClick={() => { setCopiesFor(o.id); setN(1); setErr(undefined); }}>
                    <BookCopy /> Commander des exemplaires
                  </Button>
                )}
                {o.status === "payee" && printed && <p className="text-sm text-ink-muted">Le livre est en impression : les exemplaires supplémentaires se commandent désormais auprès du support.</p>}
                {o.status === "en_attente" && (
                  <>
                    <Button onClick={() => { const r = useDemo.getState().payOrder(o.id, "acceptee"); if (r.ok) toast.success("Paiement test accepté"); }}>Payer (simulation)</Button>
                    <Button variant="ghost" onClick={() => useDemo.getState().cancelOrder(o.id)}>Annuler la commande</Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Dialog
        open={!!copiesFor}
        onOpenChange={(x) => !x && setCopiesFor(null)}
        title="Exemplaires supplémentaires"
        description={target ? `Livres identiques à celui de ${target.recipient.firstName}, imprimés après sa validation.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setCopiesFor(null)}>Annuler</Button>
            <Button onClick={buy}>Payer {fmtEur((Number.isFinite(n) ? n : 0) * EXTRA_COPY_PRICE)} (simulation)</Button>
          </>
        }
      >
        <Field id="copies" label={`Nombre d'exemplaires (${fmtEur(EXTRA_COPY_PRICE)} l'unité, prix indicatif)`} error={err}>
          <Input id="copies" type="number" min={1} max={10} value={Number.isFinite(n) ? n : ""} onChange={(e) => setN(e.target.valueAsNumber)} className="max-w-[8rem]" aria-invalid={!!err} />
        </Field>
        <Alert tone="sim" className="mt-4">Paiement simulé : aucune carte n'est demandée.</Alert>
      </Dialog>
    </div>
  );
}
