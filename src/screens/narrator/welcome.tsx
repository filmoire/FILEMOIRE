"use client";

import { ArrowRight, Eye, Lock, Mic, PenLine, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, ChoiceCards } from "@/components/ui/choice";
import { Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { pkg } from "@/lib/catalog";
import { useNav } from "@/lib/nav";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Visibility } from "@/lib/types";

export function NarratorWelcome() {
  const p = useNarratorProject()!;
  const order = useDemo((s) => s.orders.find((o) => o.id === p.orderId));
  const nav = useNav();
  const [step, setStep] = useState<1 | 2>(1);
  const [vis, setVis] = useState<Visibility>(p.privacy.defaultVisibility);
  const [progressShared, setProgressShared] = useState(p.privacy.buyerSeesProgress);
  const [reminders, setReminders] = useState(p.privacy.reminders === "douces");
  const [cadence, setCadence] = useState(String(p.cadenceDays));
  const [marketing, setMarketing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string>();

  if (p.onboarded)
    return (
      <div className="container-page max-w-2xl py-12">
        <Alert tone="success" title="Votre espace est prêt" action={<Button onClick={() => nav.push("/narrateur")}>Aller à mon espace</Button>}>
          Vos préférences se modifient à tout moment dans « Confidentialité ».
        </Alert>
      </div>
    );

  const finish = () => {
    if (!consent) return setErr("Cochez la case pour confirmer que vous avez compris comment vos souvenirs sont protégés.");
    const st = useDemo.getState();
    st.completeOnboarding(p.id, { defaultVisibility: vis, buyerSeesProgress: progressShared, reminders: reminders ? "douces" : "aucune", marketing });
    st.setCadence(p.id, Number(cadence));
    toast.success(`Bienvenue ${p.narrator.firstName} !`, { description: "Votre première question vous attend." });
    nav.push("/narrateur");
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Étape {step} sur 2</p>
      {step === 1 ? (
        <section className="mt-3 space-y-6" aria-labelledby="h-bienvenue">
          <h1 id="h-bienvenue">Bienvenue, {p.narrator.firstName}</h1>
          {order?.message && (
            <blockquote className="rounded-lg border-l-4 border-or bg-white p-5 font-serif text-xl italic text-prune shadow-soft">
              « {order.message} »
              <footer className="mt-2 font-sans text-sm not-italic text-ink-muted">— {p.buyerName}</footer>
            </blockquote>
          )}
          <p className="text-xl leading-relaxed">
            Chaque semaine, une question simple vous attendra ici. Vous y répondez quand vous voulez, comme vous voulez. À la fin, vos souvenirs deviendront un livre — que vous validerez vous-même.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [PenLine, "Écrire", "Avec vos mots, sans souci de style."],
              [Mic, "Ou raconter à voix haute", pkg(p.packageCode).voice ? "Vous relirez ensuite le texte." : "Disponible avec Héritage et Voix."],
              [ShieldCheck, "Rien d'obligatoire", "Passez ou reportez une question à tout moment."],
              [Lock, "Vos souvenirs vous appartiennent", "Vous choisissez qui peut les lire."],
            ].map(([I, t, d]) => {
              const Icon = I as typeof PenLine;
              return (
                <li key={t as string} className="flex gap-3 rounded-lg border border-line bg-white p-4">
                  <Icon className="mt-1 size-6 shrink-0 text-terre" aria-hidden />
                  <div>
                    <p className="text-lg font-semibold">{t as string}</p>
                    <p className="text-ink-muted">{d as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button size="xl" onClick={() => setStep(2)}>
            Continuer <ArrowRight />
          </Button>
        </section>
      ) : (
        <section className="mt-3 space-y-8" aria-labelledby="h-conf">
          <div>
            <h1 id="h-conf">Votre confidentialité</h1>
            <p className="mt-3 text-lg text-ink-muted">Ces réglages sont modifiables à tout moment. Par défaut, tout reste privé.</p>
          </div>
          <div className="card space-y-6 p-5 sm:p-7">
            <ChoiceCards<Visibility>
              name="defvis"
              legend="Qui peut lire vos nouveaux souvenirs ?"
              value={vis}
              onChange={setVis}
              options={[
                { value: "moi", title: "Moi seul·e (recommandé)", description: "Vous partagerez ensuite souvenir par souvenir." },
                { value: "editeur", title: "Moi et mon éditeur familial", description: "Une personne que vous inviterez pour vous aider." },
                { value: "famille", title: "Ma famille", description: `${p.buyerName} et votre éditeur familial.` },
              ]}
            />
            <Switch id="share-progress" checked={progressShared} onCheckedChange={setProgressShared} label={`${p.buyerName} peut voir ma progression`} hint="Le nombre de questions racontées, jamais le contenu." />
            <Switch id="reminders" checked={reminders} onCheckedChange={setReminders} label="Recevoir des rappels doux" hint="Deux rappels au maximum si une question attend depuis une semaine." />
            <div>
              <label htmlFor="cadence" className="font-medium">
                Rythme des questions
              </label>
              <Select id="cadence" value={cadence} onChange={(e) => setCadence(e.target.value)} className="mt-2 max-w-sm">
                <option value="7">Une question par semaine (recommandé)</option>
                <option value="3">Tous les 3 jours</option>
                <option value="14">Toutes les deux semaines</option>
                <option value="0">À mon rythme (je demande la suivante)</option>
              </Select>
            </div>
            <div className="space-y-3 border-t border-line pt-5">
              <Checkbox id="marketing" checked={marketing} onChange={setMarketing}>
                J'accepte de recevoir des nouvelles de Filémoire (facultatif, désactivé par défaut).
              </Checkbox>
              <Checkbox id="consent" checked={consent} onChange={(v) => { setConsent(v); setErr(undefined); }} invalid={!!err}>
                J'ai compris que mes réponses restent privées tant que je ne les partage pas, que je peux les modifier, les masquer ou demander leur suppression, et que rien ne sera imprimé sans ma validation.
              </Checkbox>
              {err && (
                <p role="alert" className="text-sm font-medium text-danger">
                  {err}
                </p>
              )}
            </div>
          </div>
          <Alert tone="info">
            <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden /> <Eye className="size-4" aria-hidden /></span> Vous pourrez inviter un proche pour vous aider (éditeur familial) depuis la page « Famille ».
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button size="xl" onClick={finish}>
              Commencer mon livre
            </Button>
            <Button size="xl" variant="ghost" onClick={() => setStep(1)}>
              Retour
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
