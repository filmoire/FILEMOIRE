"use client";

import { CheckCircle2, ClipboardCheck, PackageCheck, Printer, Truck, TriangleAlert, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { BookBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SimTag } from "@/components/ui/misc";
import { pkg } from "@/lib/catalog";
import { BOOK_FLOW, isLowRes, preflight } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import type { BookStatus, Project } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { OpsHeader, Table } from "./shared";

const NEXT: Partial<Record<BookStatus, [string, typeof Printer]>> = {
  preparation: ["Envoyer à l'impression", Printer],
  impression: ["Marquer expédié", Truck],
  expedie: ["Marquer livré", PackageCheck],
};

export function AdminPrint() {
  const projects = useDemo((s) => s.projects).filter((p) => BOOK_FLOW.indexOf(p.book.status) >= BOOK_FLOW.indexOf("approuve"));
  const ext = useDemo((s) => s.externalProjects).filter((e) => BOOK_FLOW.indexOf(e.status) >= BOOK_FLOW.indexOf("relecture_narrateur"));
  const [pf, setPf] = useState<Project | null>(null);
  const [inc, setInc] = useState<Project | null>(null);
  const [note, setNote] = useState("");
  const st = useDemo.getState;
  const advance = (p: Project) => {
    if (p.book.status === "preparation" && !p.print.preflightRunAt) return toast.error("Lancez d'abord le préflight", { description: "Aucun livre ne part à l'impression sans contrôle." });
    if (p.print.incident) return toast.error("Incident en cours", { description: "Résolvez l'incident avant de continuer." });
    st().advancePrint(p.id);
    toast.success("Statut mis à jour (simulation)", { description: "L'acheteur et le narrateur sont prévenus." });
  };
  return (
    <div className="container-page py-10">
      <OpsHeader title="File d'impression" intro="Préflight, impression, expédition et incidents. Simulation : aucun imprimeur ni transporteur réel n'est contacté." />
      <Alert tone="sim" className="mt-4">Le préflight est simulé : il ne remplace pas la validation d'un fichier selon la fiche technique d'un imprimeur réel (format, fonds perdus, profils couleur), qui reste à faire.</Alert>
      <h2 className="mt-8 text-2xl">Livres validés par leur narrateur</h2>
      {projects.length === 0 ? (
        <p className="mt-3 text-ink-muted">Aucun livre de la démo n'est encore validé. Côté narrateur : Aperçu → « Je valide mon livre » → « Commander l'impression ».</p>
      ) : (
        <Table caption="Livres en production" head={["Livre", "Formule", "Exemplaires", "Statut", "Contrôles", "Actions"]}>
          {projects.map((p) => {
            const low = p.photos.filter((ph) => ph.inBook && ph.chapterId && isLowRes(ph)).length;
            const n = NEXT[p.book.status];
            const NextIcon = n?.[1];
            return (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3 font-medium">
                  {p.book.cover.title}
                  <span className="block text-xs font-normal text-ink-muted">
                    {p.narrator.firstName} {p.narrator.lastName} · {p.print.address?.city ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">{pkg(p.packageCode).name.replace("Filémoire ", "")}</td>
                <td className="px-4 py-3">{p.print.copies}</td>
                <td className="px-4 py-3">
                  <BookBadge s={p.book.status} />
                  {p.print.tracking && <span className="mt-1 block font-mono text-xs">{p.print.tracking}</span>}
                  {p.print.incident && <span className="mt-1 block text-xs font-semibold text-danger">Incident : {p.print.incident}</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {p.print.preflightRunAt ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-4" aria-hidden /> Préflight {fmtDateTime(p.print.preflightRunAt)}</span>
                  ) : (
                    <span className="text-ink-muted">Préflight à lancer</span>
                  )}
                  {low > 0 && <span className="mt-1 flex items-center gap-1 text-warning"><TriangleAlert className="size-4" aria-hidden /> {low} photo(s) basse résolution</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {p.book.status === "approuve" && <span className="text-sm text-ink-muted">En attente de la commande d'impression par le narrateur.</span>}
                    {["preparation", "impression"].includes(p.book.status) && (
                      <Button size="sm" variant="outline" onClick={() => { st().runPreflight(p.id); setPf(useDemo.getState().projects.find((x) => x.id === p.id)!); }}>
                        <ClipboardCheck /> Préflight
                      </Button>
                    )}
                    {n && (
                      <Button size="sm" onClick={() => advance(p)}>
                        {NextIcon && <NextIcon />} {n[0]}
                      </Button>
                    )}
                    {["preparation", "impression", "expedie"].includes(p.book.status) && !p.print.incident && (
                      <Button size="sm" variant="ghost" onClick={() => { setInc(p); setNote(""); }}>
                        <Wrench /> Incident
                      </Button>
                    )}
                    {p.print.incident && (
                      <Button size="sm" variant="secondary" onClick={() => { st().resolveIncident(p.id); toast.success("Incident résolu — production relancée"); }}>
                        Résoudre et relancer
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <h2 className="mt-10 text-2xl">Autres familles (fictives)</h2>
      <Table caption="Autres livres" head={["Commande", "Famille", "Formule", "Statut", "Photos", "Action"]}>
        {ext.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-3 font-mono text-sm">{e.orderRef}</td>
            <td className="px-4 py-3">{e.family}</td>
            <td className="px-4 py-3">{pkg(e.packageCode).name.replace("Filémoire ", "")}</td>
            <td className="px-4 py-3">
              <BookBadge s={e.status} />
              {e.tracking && <span className="mt-1 block font-mono text-xs">{e.tracking}</span>}
            </td>
            <td className="px-4 py-3 text-sm">{e.photosLowRes ? <span className="text-warning">{e.photosLowRes} basse résolution</span> : "OK"}</td>
            <td className="px-4 py-3">
              {["approuve", "preparation", "impression", "expedie"].includes(e.status) ? (
                <Button size="sm" variant="outline" onClick={() => { st().advanceExternal(e.id); toast.success("Statut mis à jour (simulation)"); }}>
                  Étape suivante
                </Button>
              ) : (
                <span className="text-sm text-ink-muted">{e.status === "livre" ? "Terminé" : "En relecture"}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Dialog open={!!pf} onOpenChange={(o) => !o && setPf(null)} title={pf ? `Préflight — ${pf.book.cover.title}` : ""} description="Contrôles simulés. À remplacer par un vrai contrôle du PDF selon les spécifications de l'imprimeur." wide>
        {pf && (
          <ul className="space-y-2">
            {preflight(pf).map((c) => (
              <li key={c.label} className="flex gap-3 rounded-md border border-line bg-white p-3">
                {c.state === "ok" ? <CheckCircle2 className="mt-0.5 size-5 text-success" aria-hidden /> : <TriangleAlert className="mt-0.5 size-5 text-warning" aria-hidden />}
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-sm text-ink-muted">{c.detail}</p>
                </div>
              </li>
            ))}
            <li className="pt-2">
              <SimTag>Préflight simulé</SimTag>
            </li>
          </ul>
        )}
      </Dialog>
      <Dialog
        open={!!inc}
        onOpenChange={(o) => !o && setInc(null)}
        title="Signaler un incident"
        footer={
          <>
            <Button variant="outline" onClick={() => setInc(null)}>Annuler</Button>
            <Button variant="danger" onClick={() => { st().flagIncident(inc!.id, note.trim()); toast("Incident enregistré", { description: "L'acheteur est prévenu d'un retard, sans détail technique." }); setInc(null); }}>Enregistrer l'incident</Button>
          </>
        }
      >
        <Field id="inc-note" label="Description interne" hint="Visible uniquement par l'équipe. Les familles reçoivent un message simple.">
          <Input id="inc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : défaut de reliure, réimpression" aria-describedby="inc-note-hint" />
        </Field>
      </Dialog>
    </div>
  );
}
