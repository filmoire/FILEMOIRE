"use client";

import { BookOpenText, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { BookViewer } from "@/components/book/viewer";
import { BookBadge, InvitationBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { pkg } from "@/lib/catalog";
import { progress } from "@/lib/rules";
import { useDemo, useNow } from "@/lib/store";
import type { Project } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { OpsHeader, Table } from "./shared";

export function AdminProjects() {
  const projects = useDemo((s) => s.projects);
  const ext = useDemo((s) => s.externalProjects);
  const now = useNow();
  const [reading, setReading] = useState<Project | null>(null);
  const tryRead = (p: Project) => {
    if (p.privacy.supportAccessUntil && p.privacy.supportAccessUntil > now) setReading(p);
    else toast.error("Accès refusé", { description: `Le contenu de ce livre est privé. ${p.narrator.firstName} doit accorder un accès temporaire depuis sa page « Confidentialité ».` });
  };
  return (
    <div className="container-page py-10">
      <OpsHeader title="Projets et parcours" intro="Avancement et statuts. Le bouton « Lire » ne fonctionne qu'avec une autorisation active du narrateur." />
      <Table caption="Projets" head={["Narrateur / famille", "Formule", "Invitation", "Parcours", "Livre", "Accès support", ""]}>
        {projects.map((p) => {
          const pr = progress(p);
          const access = p.privacy.supportAccessUntil && p.privacy.supportAccessUntil > now;
          return (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium">
                {p.narrator.firstName} {p.narrator.lastName}
                <span className="block text-xs font-normal text-ink-muted">offert par {p.buyerName}</span>
              </td>
              <td className="px-4 py-3">{pkg(p.packageCode).name.replace("Filémoire ", "")}</td>
              <td className="px-4 py-3">
                <InvitationBadge s={p.invitation.status} />
              </td>
              <td className="px-4 py-3">
                {pr.answered}/{pr.total} <span className="text-xs text-ink-muted">({pr.skipped} passée(s))</span>
              </td>
              <td className="px-4 py-3">
                <BookBadge s={p.book.status} />
              </td>
              <td className="px-4 py-3 text-sm">{access ? <span className="text-warning">Jusqu'au {fmtDateTime(p.privacy.supportAccessUntil!)}</span> : <span className="inline-flex items-center gap-1 text-ink-muted"><Lock className="size-3.5" aria-hidden /> Aucun</span>}</td>
              <td className="px-4 py-3">
                <Button size="sm" variant={access ? "secondary" : "ghost"} onClick={() => tryRead(p)}>
                  <BookOpenText /> Lire
                </Button>
              </td>
            </tr>
          );
        })}
        {ext.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-3 font-medium">
              {e.family}
              <span className="block text-xs font-normal text-ink-muted">{e.orderRef}</span>
            </td>
            <td className="px-4 py-3">{pkg(e.packageCode).name.replace("Filémoire ", "")}</td>
            <td className="px-4 py-3">
              <InvitationBadge s={e.invitation} />
            </td>
            <td className="px-4 py-3">
              {e.answered}/{e.total}
            </td>
            <td className="px-4 py-3">
              <BookBadge s={e.status} />
            </td>
            <td className="px-4 py-3 text-sm text-ink-muted">Aucun</td>
            <td className="px-4 py-3">
              <Button size="sm" variant="ghost" onClick={() => toast.error("Accès refusé", { description: "Aucune autorisation du narrateur pour ce projet." })}>
                <BookOpenText /> Lire
              </Button>
            </td>
          </tr>
        ))}
      </Table>
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)} wide title={reading ? `Manuscrit de ${reading.narrator.firstName} ${reading.narrator.lastName}` : ""}>
        {reading && (
          <>
            <Alert tone="warning" className="mb-4" title="Accès temporaire accordé par le narrateur">
              Motif : {reading.privacy.supportAccessReason} · jusqu'au {fmtDate(reading.privacy.supportAccessUntil!)}. En production, cette lecture serait journalisée.
            </Alert>
            <BookViewer project={reading} viewer={{ kind: "ops", now }} watermark="Support" />
          </>
        )}
      </Dialog>
    </div>
  );
}
