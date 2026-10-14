"use client";

import { toast } from "@/lib/toast";
import { SUPPORT } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { useDemo } from "@/lib/store";
import type { SupportCase } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { OpsHeader } from "./shared";

const KIND: Record<SupportCase["kind"], string> = { question: "Question", devis: "Devis", suppression: "Suppression de données", incident: "Incident" };

export function AdminSupport() {
  const cases = useDemo((s) => s.support);
  return (
    <div className="container-page max-w-5xl py-10">
      <OpsHeader title="Demandes de support" intro="Résoudre un problème technique sans banaliser la sensibilité du contenu." />
      <div className="mt-8 space-y-4">
        {cases.length === 0 && <EmptyState title="Aucune demande" />}
        {cases.map((c) => (
          <article key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-ink-muted">{c.ref}</span>
              <Badge tone={c.kind === "suppression" ? "danger" : c.kind === "devis" ? "or" : "info"}>{KIND[c.kind]}</Badge>
              <Badge tone={SUPPORT[c.status][1]}>{SUPPORT[c.status][0]}</Badge>
              <span className="ml-auto text-sm text-ink-muted">{fmtDateTime(c.createdAt)}</span>
            </div>
            <h2 className="mt-2 text-xl">{c.subject}</h2>
            <p className="text-sm text-ink-muted">De : {c.from}</p>
            <p className="mt-2 text-[15px]">{c.body}</p>
            {c.kind === "suppression" && (
              <Alert tone="warning" className="mt-3">
                Procédure de suppression à exécuter côté serveur après le délai de rétractation de 14 jours (contenus, sauvegardes, fichiers audio et photos). Non exécutée dans le prototype.
              </Alert>
            )}
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor={`s-${c.id}`} className="text-sm">
                Statut
              </label>
              <Select id={`s-${c.id}`} value={c.status} onChange={(e) => { useDemo.getState().setSupportStatus(c.id, e.target.value as SupportCase["status"]); toast.success("Demande mise à jour"); }} className="h-10 w-44">
                <option value="ouverte">Ouverte</option>
                <option value="en_cours">En cours</option>
                <option value="resolue">Résolue</option>
              </Select>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
