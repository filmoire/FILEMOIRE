"use client";
import { isLive } from "@/lib/mode";

import * as Popover from "@radix-ui/react-popover";
import { CalendarClock, FlaskConical, Mail, Map, RotateCcw, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useVisited } from "@/lib/guide";
import { Link, useNav } from "@/lib/nav";
import { homeOf, personaFromKey, personaKey, personaLabel } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Persona, Scenario } from "@/lib/types";
import { fmtShort } from "@/lib/utils";

export function DemoBar() {
  return isLive ? null : <DemoBarContent />;
}
function DemoBarContent() {
  const hydrated = useDemo((s) => s.hydrated);
  const persona = useDemo((s) => s.persona);
  const projects = useDemo((s) => s.projects);
  const scenario = useDemo((s) => s.scenario);
  const offset = useDemo((s) => s.clockOffsetDays);
  const emails = useDemo((s) => s.emails.length);
  const nav = useNav();
  const [confirm, setConfirm] = useState<Scenario | null>(null);

  if (!hydrated) return <div className="no-print h-11 bg-prune" />;

  const options: Persona[] = [
    { role: "visiteur" },
    { role: "acheteur" },
    ...projects.filter((p) => p.invitation.status === "acceptee").map((p) => ({ role: "narrateur" as const, projectId: p.id })),
    { role: "editeur" },
    ...projects.flatMap((p) => p.editors.filter((e) => e.status === "active" && e.email !== "thomas.martin@demo.filemoire.test").map((e) => ({ role: "editeur" as const, email: e.email, name: e.name }))).filter((e, i, all) => all.findIndex((x) => x.email === e.email) === i),
    { role: "ops" },
  ];
  const switchTo = (k: string) => {
    const p = personaFromKey(k);
    useDemo.getState().setPersona(p);
    nav.push(homeOf(p));
  };
  const advance = () => {
    useDemo.getState().advanceDays(7);
    toast.success("Une semaine a passé (horloge de démonstration)", { description: "Invitations programmées, nouvelles questions et rappels doux ont été traités." });
  };
  const doReset = () => {
    if (!confirm) return;
    useDemo.getState().resetScenario(confirm);
    useVisited.getState().clear();
    setConfirm(null);
    const p = useDemo.getState().persona;
    nav.push(homeOf(p));
    toast.success(confirm === "avance" ? "Scénario « Projet avancé » chargé" : "Démonstration réinitialisée", { description: confirm === "avance" ? "Vous êtes Madeleine Martin, 8 semaines après le début de son parcours." : "Rien n'est encore acheté : commencez par « Offrir Filémoire »." });
  };

  return (
    <div className="no-print bg-prune text-creme" role="region" aria-label="Barre de démonstration">
      <div className="container-page flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 py-1.5 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-or-100">
          <FlaskConical className="size-4" aria-hidden /> Prototype
        </span>
        <label htmlFor="persona" className="sr-only sm:not-sr-only sm:text-creme/80">
          Vous êtes
        </label>
        <select
          id="persona"
          value={personaKey(persona)}
          onChange={(e) => switchTo(e.target.value)}
          className="h-8 max-w-[15rem] rounded-md border border-creme/30 bg-prune-700 px-2 text-sm text-creme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or"
        >
          {options.map((o) => (
            <option key={personaKey(o)} value={personaKey(o)}>
              {personaLabel(o, projects)}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="hidden items-center gap-1 text-creme/80 md:inline-flex" title="Date de l'horloge de démonstration">
            <CalendarClock className="size-4" aria-hidden /> {offset ? `Date simulée : ${fmtShort(Date.now() + offset * 86_400_000)}` : "Aujourd'hui"}
          </span>
          <button onClick={advance} className="h-8 rounded-md border border-creme/30 px-2.5 hover:bg-prune-600">
            +1 semaine
          </button>
          <Link href="/demo/boite-mail" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-creme/30 px-2.5 no-underline hover:bg-prune-600">
            <Mail className="size-4" aria-hidden /> E-mails <span className="rounded-full bg-terre px-1.5 text-xs font-semibold">{emails}</span>
          </Link>
          <button onClick={() => useDemo.getState().toggleGuide()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-creme/30 px-2.5 hover:bg-prune-600">
            <Map className="size-4" aria-hidden /> Guide
          </button>
          <Popover.Root>
            <Popover.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-creme/30 px-2.5 hover:bg-prune-600" aria-label="Réglages de la démonstration">
              <Settings2 className="size-4" aria-hidden /> <span className="hidden sm:inline">Démo</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={6} className="z-50 w-80 rounded-lg border border-line bg-white p-4 text-ink shadow-lift">
                <p className="font-serif text-lg font-semibold text-prune">Scénario de démonstration</p>
                <p className="mt-1 text-sm text-ink-muted">Actuel : {scenario === "avance" ? "Projet avancé" : "Parcours complet"}</p>
                <div className="mt-3 grid gap-2">
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => setConfirm("complet")}>
                    <RotateCcw /> Parcours complet (depuis l'achat)
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => setConfirm("avance")}>
                    <RotateCcw /> Projet avancé (8 semaines)
                  </Button>
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Données fictives, stockées uniquement dans ce navigateur (localStorage et IndexedDB). Paiement, e-mails, transcription, préflight et impression sont simulés.
                </p>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "avance" ? "Charger le projet avancé ?" : "Réinitialiser la démonstration ?"}
        description="Toutes les actions réalisées dans ce navigateur seront effacées (commandes, réponses, enregistrements, photos importées)."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={doReset}>
              Oui, réinitialiser
            </Button>
          </>
        }
      />
    </div>
  );
}
