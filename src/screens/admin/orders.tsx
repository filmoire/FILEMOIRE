"use client";

import { useState } from "react";
import { InvitationBadge, OrderBadge } from "@/components/status";
import { Select } from "@/components/ui/input";
import { pkg } from "@/lib/catalog";
import { useDemo } from "@/lib/store";
import type { Order } from "@/lib/types";
import { fmtDate, fmtEur } from "@/lib/utils";
import { OpsHeader, Table } from "./shared";

export function AdminOrders() {
  const orders = useDemo((s) => s.orders);
  const projects = useDemo((s) => s.projects);
  const ext = useDemo((s) => s.externalProjects);
  const [f, setF] = useState<Order["status"] | "">("");
  const list = orders.filter((o) => !f || o.status === f).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="container-page py-10">
      <OpsHeader
        title="Commandes"
        intro="Paiements de test uniquement : aucune transaction réelle."
        actions={
          <label className="flex items-center gap-2 text-sm">
            Statut
            <Select value={f} onChange={(e) => setF(e.target.value as Order["status"] | "")} className="h-10 w-48">
              <option value="">Toutes ({orders.length})</option>
              <option value="payee">Payées</option>
              <option value="en_attente">En attente</option>
              <option value="annulee">Annulées</option>
            </Select>
          </label>
        }
      />
      <Table caption="Liste des commandes" head={["Référence", "Date", "Acheteur", "Formule", "Options", "Total TTC", "Paiement", "Invitation"]}>
        {list.map((o) => {
          const p = projects.find((x) => x.id === o.projectId);
          const e = ext.find((x) => x.orderRef === o.ref);
          const inv = p?.invitation.status ?? e?.invitation;
          return (
            <tr key={o.id}>
              <td className="px-4 py-3 font-mono text-sm">{o.ref}</td>
              <td className="px-4 py-3">{fmtDate(o.createdAt)}</td>
              <td className="px-4 py-3">{o.buyerName}</td>
              <td className="px-4 py-3">{pkg(o.packageCode).name.replace("Filémoire ", "")}</td>
              <td className="px-4 py-3 text-sm text-ink-muted">
                {o.giftBox ? "Coffret · " : ""}
                {o.extraCopies ? `+${o.extraCopies} ex.` : "—"}
              </td>
              <td className="px-4 py-3">{fmtEur(o.total)}</td>
              <td className="px-4 py-3">
                <OrderBadge s={o.status} />
                {o.payments.some((x) => x.status === "refusee") && <span className="mt-1 block text-xs text-danger">{o.payments.filter((x) => x.status === "refusee").length} refus de test</span>}
              </td>
              <td className="px-4 py-3">{inv ? <InvitationBadge s={inv} /> : "—"}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
