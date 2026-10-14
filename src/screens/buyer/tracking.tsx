"use client";

import { Headphones, Lock, Sparkles, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { BookPipeline, InvitationBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader, SimTag, Stat } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { CHAPTERS, VOICE_UPGRADE_PRICE, pkg } from "@/lib/catalog";
import { Link, useQueryParam } from "@/lib/nav";
import { canRead, progress, sortedChapters } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import { fmtDate, fmtDateTime, fmtEur, paragraphsSafe } from "./tracking-utils";

export function BuyerTracking() {
  const q = useQueryParam("projet");
  const orders = useDemo((s) => s.orders).filter((o) => !o.external && o.status === "payee");
  const projects = useDemo((s) => s.projects).filter((p) => orders.some((o) => o.projectId === p.id));
  const [sel, setSel] = useState<string>();
  const [confirmNode, ask] = useConfirm();
  const p = projects.find((x) => x.id === (sel ?? q)) ?? projects.at(-1);
  if (!p)
    return (
      <div className="container-page py-10">
        <EmptyState title="Rien à suivre pour l'instant" action={<Button asChild><Link href="/acheteur/offrir">Offrir Filémoire</Link></Button>}>
          Après votre premier cadeau, vous suivrez ici l'avancement du livre.
        </EmptyState>
      </div>
    );
  const pr = progress(p);
  const shared = p.memories.filter((m) => canRead(p, m, { kind: "acheteur" }));
  const chaptersTouched = new Set(p.questions.filter((x) => x.status === "repondue").map((x) => x.chapter));
  const last = p.memories.reduce((m, x) => Math.max(m, x.updatedAt), 0);
  return (
    <div className="container-page py-10">
      {confirmNode}
      <PageHeader
        eyebrow="Suivi du projet"
        title={`Le livre de ${p.narrator.firstName}`}
        intro={`${pkg(p.packageCode).name} · offert par ${p.buyerName}`}
        actions={
          projects.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              Projet
              <Select value={p.id} onChange={(e) => setSel(e.target.value)} className="h-10 w-56">
                {projects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.narrator.firstName} {x.narrator.lastName}
                  </option>
                ))}
              </Select>
            </label>
          )
        }
      />
      <Alert tone="privacy" className="mt-6" title="Vous voyez l'avancement, pas le contenu">
        Les réponses de {p.narrator.firstName} sont privées. Vous ne lisez que les souvenirs qu'elle ou il choisit de partager « avec la famille ».
      </Alert>

      <section className="mt-8" aria-labelledby="h-etat">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="h-etat" className="text-2xl">Invitation et parcours</h2>
          <InvitationBadge s={p.invitation.status} />
        </div>
        {p.invitation.status !== "acceptee" ? (
          <p className="mt-3 text-ink-muted">
            Le parcours commencera quand {p.narrator.firstName} aura accepté l'invitation. <Link href="/acheteur/cadeaux">Gérer l'invitation</Link>
          </p>
        ) : p.privacy.buyerSeesProgress ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Questions racontées" value={`${pr.answered} / ${pr.total}`} sub={`${pr.percent} % du parcours`} />
              <Stat label="Chapitres commencés" value={`${chaptersTouched.size} / ${new Set(p.questions.map((x) => x.chapter)).size}`} sub={[...chaptersTouched].map((k) => CHAPTERS.find((c) => c.key === k)?.title).join(", ") || "—"} />
              <Stat label="Photos ajoutées" value={p.photos.length} />
              <Stat label="Dernière activité" value={last ? fmtDate(last) : "—"} />
            </div>
            <Progress value={pr.percent} label="Progression du parcours" className="mt-5" />
            <p className="mt-2 text-sm text-ink-muted">Les questions passées ne sont pas comptées comme racontées.</p>
          </>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-ink-muted">
            <Lock className="size-4" aria-hidden /> {p.narrator.firstName} a choisi de ne pas partager sa progression détaillée.
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="h-livre">
        <h2 id="h-livre" className="text-2xl">Le livre</h2>
        <div className="mt-4">
          <BookPipeline status={p.book.status} events={p.print.events} />
        </div>
        {p.print.incident && <Alert tone="warning" className="mt-4" title="Petit retard">Notre équipe traite un incident de fabrication. Vous serez prévenue dès que le livre repart.</Alert>}
        {p.print.tracking && (
          <p className="mt-4 flex items-center gap-2 text-[15px]">
            <Truck className="size-5 text-terre" aria-hidden /> Suivi : <strong>{p.print.tracking}</strong> <SimTag>Transporteur fictif</SimTag>
          </p>
        )}
        {p.print.events.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-ink-muted">
            {p.print.events.slice().reverse().map((e, i) => (
              <li key={i}>
                {fmtDateTime(e.at)} — {e.note}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="h-partages">
        <h2 id="h-partages" className="text-2xl">Souvenirs partagés avec la famille</h2>
        {shared.length === 0 ? (
          <p className="mt-3 text-ink-muted">Aucun souvenir partagé pour l'instant. C'est normal : {p.narrator.firstName} choisit ce qu'elle ou il partage, et quand.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {shared.map((m) => (
              <article key={m.id} className="card p-5">
                <p className="text-sm text-terre-700">{sortedChapters(p).find((c) => c.id === m.chapterId)?.title}</p>
                <p className="quote mt-1 text-lg">{p.questions.find((x) => x.id === m.questionId)?.text}</p>
                <div className="mt-3 space-y-2 font-serif text-[17px]">
                  {paragraphsSafe(m.text).map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {p.packageCode === "heritage" && p.book.status === "brouillon" && (
        <section className="mt-10 rounded-xl border border-dashed border-or bg-or-50/40 p-6" aria-labelledby="h-voix">
          <h2 id="h-voix" className="flex items-center gap-2 text-2xl">
            <Headphones className="size-6 text-terre" aria-hidden /> Passer à Filémoire Voix
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">Pour que la famille puisse encore entendre sa voix : les enregistrements autorisés par {p.narrator.firstName} deviennent écoutables via un QR code privé dans le livre.</p>
          <Button
            className="mt-4"
            onClick={() => ask({ title: "Passer à Filémoire Voix ?", body: `Supplément de ${fmtEur(VOICE_UPGRADE_PRICE)} (prix indicatif), payé en simulation. ${p.narrator.firstName} reste libre d'activer ou non le QR de chaque enregistrement.`, confirm: `Payer ${fmtEur(VOICE_UPGRADE_PRICE)} (simulation)`, onConfirm: () => { useDemo.getState().upgradeToVoice(p.id); toast.success("Filémoire Voix activé", { description: "Paiement test accepté." }); } })}
          >
            <Sparkles /> Ajouter la voix (+{fmtEur(VOICE_UPGRADE_PRICE)})
          </Button>
        </section>
      )}
    </div>
  );
}
