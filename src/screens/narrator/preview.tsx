"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CircleDashed, Lock, Printer, TriangleAlert, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { BookCoverArt } from "@/components/book/cover";
import { BookViewer, PrintableBook } from "@/components/book/viewer";
import { BookPipeline } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader, SimTag } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { BOOK_FLOW, COVER_LABEL, COVER_TEMPLATES, isLocked, printChecklist } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { CoverTemplate } from "@/lib/types";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom du destinataire."),
  line1: z.string().trim().min(4, "Indiquez l'adresse (numéro et rue)."),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Le code postal doit comporter 5 chiffres."),
  city: z.string().trim().min(2, "Indiquez la ville."),
  country: z.string().trim().min(2, "Indiquez le pays."),
});

export function PreviewScreen() {
  const p = useNarratorProject()!;
  const st = useDemo.getState;
  const locked = isLocked(p);
  const [title, setTitle] = useState(p.book.cover.title);
  const [subtitle, setSubtitle] = useState(p.book.cover.subtitle);
  const [dedication, setDedication] = useState(p.book.dedication);
  const checklist = printChecklist(p);
  const blocking = checklist.filter((c) => c.state === "todo" && c.id !== "approval" && c.id !== "delivery");
  const statusIdx = BOOK_FLOW.indexOf(p.book.status);

  // L'impression du navigateur est indisponible dans une page intégrée (iframe) : on masque alors le bouton.
  const [canPrint, setCanPrint] = useState(false);
  useEffect(() => {
    useDemo.getState().markPreviewed(p.id);
    try {
      setCanPrint(window.self === window.top);
    } catch {
      setCanPrint(false);
    }
  }, [p.id]);

  // Les champs de couverture s'appliquent en direct (petit délai pour la saisie).
  useEffect(() => {
    if (locked) return;
    const t = setTimeout(() => {
      if (title !== p.book.cover.title || subtitle !== p.book.cover.subtitle) st().setCover(p.id, { title: title.slice(0, 80), subtitle: subtitle.slice(0, 120) });
      if (dedication !== p.book.dedication) st().setDedication(p.id, dedication.slice(0, 300));
    }, 400);
    return () => clearTimeout(t);
  }, [title, subtitle, dedication, locked, p.id, p.book.cover.title, p.book.cover.subtitle, p.book.dedication, st]);

  return (
    <div className="container-page max-w-6xl py-8">
      <PrintableBook project={p} viewer={{ kind: "narrateur" }} />
      <div className="no-print">
        <PageHeader
          eyebrow="Aperçu du livre"
          title={p.book.cover.title || "Mon livre"}
          intro="Votre livre tel qu'il sera imprimé. Les souvenirs masqués et les brouillons n'y figurent pas."
          actions={
            canPrint && (
            <Button
              variant="secondary"
              onClick={() => {
                toast("Ouverture de l'impression du navigateur", { description: "Choisissez « Enregistrer au format PDF ». Ce PDF est un aperçu illustratif, pas un fichier pour l'imprimeur." });
                setTimeout(() => window.print(), 300);
              }}
            >
              <Printer /> PDF illustratif
            </Button>
            )
          }
        />
        <Alert tone="sim" className="mt-5" title="Aperçu illustratif">
          Mise en page approximative au format A5, générée dans le navigateur. Le fichier envoyé à l'imprimeur sera produit et contrôlé côté serveur selon ses spécifications techniques, qui restent à valider.
        </Alert>

        <section id="couverture" className="mt-8 scroll-mt-24" aria-labelledby="h-cover">
          <h2 id="h-cover" className="text-2xl">
            Couverture et dédicace
          </h2>
          <div className="mt-4 grid gap-6 rounded-xl border border-line bg-white p-5 sm:p-6 lg:grid-cols-[1fr_1.2fr]">
            <fieldset disabled={locked}>
              <legend className="mb-3 text-[15px] font-medium">Modèle de couverture</legend>
              <div className="grid grid-cols-3 gap-3">
                {COVER_TEMPLATES.map((t) => (
                  <label key={t} className={cn("cursor-pointer rounded-lg border-2 p-2 text-center has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-terre/50", p.book.cover.template === t ? "border-prune" : "border-transparent hover:border-or")}>
                    <input type="radio" name="cover" className="sr-only" checked={p.book.cover.template === t} onChange={() => { st().setCover(p.id, { template: t as CoverTemplate }); toast.success(`Couverture « ${COVER_LABEL[t]} »`); }} />
                    <BookCoverArt template={t} title={p.book.cover.title} size="sm" />
                    <span className="mt-2 block text-sm">{COVER_LABEL[t]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-4">
              <Field id="cv-title" label="Titre du livre">
                <Input id="cv-title" value={title} maxLength={80} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field id="cv-sub" label="Sous-titre" optional>
                <Input id="cv-sub" value={subtitle} maxLength={120} disabled={locked} onChange={(e) => setSubtitle(e.target.value)} />
              </Field>
              <Field id="cv-ded" label="Dédicace" optional hint="Une page à part, au début du livre.">
                <Textarea id="cv-ded" value={dedication} maxLength={300} disabled={locked} onChange={(e) => setDedication(e.target.value)} className="min-h-[90px] font-serif text-lg italic" aria-describedby="cv-ded-hint" />
              </Field>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="h-book">
          <h2 id="h-book" className="text-2xl">
            Feuilleter
          </h2>
          <div className="mt-4">
            <BookViewer project={p} viewer={{ kind: "narrateur" }} watermark={locked ? undefined : "Aperçu"} showWarnings />
          </div>
        </section>

        <section className="mt-12" aria-labelledby="h-check">
          <h2 id="h-check" className="text-2xl">
            Prêt pour l'impression ?
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.id} className="flex gap-3 rounded-lg border border-line bg-white p-4">
                {c.state === "ok" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : c.state === "warn" ? <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-ink-soft" aria-hidden />}
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className="sr-only">{c.state === "ok" ? "Fait : " : c.state === "warn" ? "Attention : " : "À faire : "}</span>
                    {c.label}
                  </p>
                  <p className="text-sm text-ink-muted">{c.detail}</p>
                  {c.href && c.state !== "ok" && (
                    <Link href={c.href} className="text-sm">
                      Corriger
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="validation" className="mt-12 scroll-mt-24" aria-labelledby="h-valid">
          <h2 id="h-valid" className="text-2xl">
            Validation et impression
          </h2>
          <div className="mt-4">
            <BookPipeline status={p.book.status} events={p.print.events} />
          </div>
          <div className="mt-6">
            {!locked ? (
              <ApproveForm blocking={blocking.map((b) => b.detail)} />
            ) : p.book.status === "approuve" ? (
              <div className="card space-y-4 p-6">
                <Alert tone="success" title={`Vous avez validé votre livre le ${fmtDate(p.book.approvedAt!)}`}>
                  Livraison : {p.print.address?.name}, {p.print.address?.line1}, {p.print.address?.postalCode} {p.print.address?.city} · {p.print.copies} exemplaire(s).
                </Alert>
                <div className="flex flex-wrap gap-3">
                  <Button size="xl" onClick={() => { const r = st().placePrintOrder(p.id); if (r.ok) toast.success("Commande d'impression simulée", { description: "Aucun imprimeur réel n'a été contacté." }); else toast.error(r.error); }}>
                    <Printer /> Commander l'impression (simulation)
                  </Button>
                  <Button size="xl" variant="ghost" onClick={() => { st().reopenBook(p.id); toast("Validation retirée : vous pouvez de nouveau modifier votre livre."); }}>
                    Retirer ma validation
                  </Button>
                </div>
                <p className="text-sm text-ink-muted">Vous pouvez encore retirer votre validation tant que l'impression n'est pas commandée.</p>
              </div>
            ) : (
              <div className="card space-y-3 p-6">
                <p className="flex items-center gap-2 text-lg font-semibold text-prune">
                  <Lock className="size-5" aria-hidden /> Livre validé et transmis à l'équipe Filémoire
                </p>
                {p.print.incident && <Alert tone="warning" title="Incident en cours de traitement">{p.print.incident}</Alert>}
                {p.print.tracking && (
                  <p className="flex items-center gap-2">
                    <Truck className="size-5 text-terre" aria-hidden /> Suivi {p.print.tracking} <SimTag>Transporteur fictif</SimTag>
                  </p>
                )}
                <ul className="space-y-1 text-sm text-ink-muted">
                  {p.print.events.slice().reverse().map((e, i) => (
                    <li key={i}>
                      {fmtDateTime(e.at)} — {e.note}
                    </li>
                  ))}
                </ul>
                <Alert tone="sim">Impression simulée : aucun imprimeur n'a reçu de commande, aucun livre ne sera livré.</Alert>
              </div>
            )}
          </div>
          {statusIdx < BOOK_FLOW.indexOf("relecture_narrateur") && !locked && (
            <p className="mt-3 text-sm text-ink-muted">Conseil : demandez une relecture à votre éditeur familial depuis l'éditeur de livre, ou validez directement.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ApproveForm({ blocking }: { blocking: string[] }) {
  const p = useNarratorProject()!;
  const [read, setRead] = useState(false);
  const [lockOk, setLockOk] = useState(false);
  const [err, setErr] = useState<string>();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: p.print.address ?? { name: `${p.narrator.firstName} ${p.narrator.lastName}`, line1: "", postalCode: "", city: "", country: "France" },
  });
  const e = formState.errors;
  const submit = handleSubmit((addr) => {
    if (!read || !lockOk) return setErr("Cochez les deux cases pour confirmer votre validation.");
    const r = useDemo.getState().approveBook(p.id, addr);
    if (!r.ok) {
      setErr(r.error);
      toast.error("Validation impossible", { description: r.error });
      return;
    }
    setErr(undefined);
    toast.success("Votre livre est validé", { description: "Vous pouvez maintenant commander l'impression (simulée)." });
  });
  return (
    <form onSubmit={submit} noValidate className="card space-y-5 p-5 sm:p-7">
      <p className="text-lg">Vous seul·e pouvez valider votre livre. Après validation, il est verrouillé : plus aucune modification, de vous ou de votre éditeur familial.</p>
      {blocking.length > 0 && (
        <Alert tone="warning" title="Avant de valider">
          <ul className="list-disc pl-5">
            {blocking.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Alert>
      )}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold text-prune sm:col-span-2">Adresse de livraison (fictive pour la démo)</legend>
        <Field id="ad-name" label="Destinataire" error={e.name?.message}>
          <Input id="ad-name" aria-invalid={!!e.name} aria-describedby={describedBy("ad-name", false, e.name)} {...register("name")} />
        </Field>
        <Field id="ad-line1" label="Adresse" error={e.line1?.message}>
          <Input id="ad-line1" placeholder="3 rue Fictive" aria-invalid={!!e.line1} aria-describedby={describedBy("ad-line1", false, e.line1)} {...register("line1")} />
        </Field>
        <Field id="ad-cp" label="Code postal" error={e.postalCode?.message}>
          <Input id="ad-cp" inputMode="numeric" maxLength={5} aria-invalid={!!e.postalCode} aria-describedby={describedBy("ad-cp", false, e.postalCode)} {...register("postalCode")} />
        </Field>
        <Field id="ad-city" label="Ville" error={e.city?.message}>
          <Input id="ad-city" aria-invalid={!!e.city} aria-describedby={describedBy("ad-city", false, e.city)} {...register("city")} />
        </Field>
        <Field id="ad-country" label="Pays" error={e.country?.message}>
          <Input id="ad-country" aria-invalid={!!e.country} {...register("country")} />
        </Field>
      </fieldset>
      <div className="space-y-3">
        <Checkbox id="ap-read" checked={read} onChange={(v) => { setRead(v); setErr(undefined); }} invalid={!!err && !read}>
          J'ai relu mon livre dans l'aperçu et son contenu me convient.
        </Checkbox>
        <Checkbox id="ap-lock" checked={lockOk} onChange={(v) => { setLockOk(v); setErr(undefined); }} invalid={!!err && !lockOk}>
          Je comprends qu'après validation, le livre est verrouillé et peut être imprimé.
        </Checkbox>
      </div>
      {err && (
        <p role="alert" className="text-sm font-medium text-danger">
          {err}
        </p>
      )}
      <Button type="submit" size="xl">
        Je valide mon livre
      </Button>
    </form>
  );
}
