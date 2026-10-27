"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, CreditCard, Gift, Mail, PartyPopper, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { BookCoverArt } from "@/components/book/cover";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, ChoiceCards } from "@/components/ui/choice";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader, SimTag } from "@/components/ui/misc";
import { EXTRA_COPY_PRICE, GIFT_BOX_PRICE, PACKAGES, THEMES, pkg, theme } from "@/lib/catalog";
import { Link, useNav, useQueryParam } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import type { PackageCode, ThemeCode } from "@/lib/types";
import { cn, DAY, dayStart, fmtDate, fmtEur, isoDay } from "@/lib/utils";

const RELATIONS = ["Ma mère", "Mon père", "Ma grand-mère", "Mon grand-père", "Un proche", "Autre"];

const today = () => isoDay(useDemo.getState().now());

const schema = z
  .object({
    packageCode: z.enum(["essentiel", "heritage", "voix"], { error: "Choisissez une formule." }),
    theme: z.enum(["vie", "migration", "metier", "couple", "parentalite", "recettes", "retraite"], { error: "Choisissez un parcours." }),
    firstName: z.string().trim().min(1, "Indiquez le prénom de la personne qui va raconter.").max(40, "40 caractères maximum."),
    lastName: z.string().trim().min(1, "Indiquez son nom.").max(60, "60 caractères maximum."),
    email: z.string().trim().min(1, "Indiquez son adresse e-mail : l'invitation y sera envoyée.").email("Cette adresse e-mail ne semble pas valide (exemple : prenom@domaine.fr)."),
    relation: z.string().min(1, "Précisez votre lien avec cette personne."),
    message: z.string().max(600, "600 caractères maximum."),
    sendMode: z.enum(["now", "date"]),
    deliveryDate: z.string(),
    giftBox: z.boolean(),
    extraCopies: z.number({ error: "Indiquez un nombre (0 si aucun)." }).int("Nombre entier uniquement.").min(0, "Minimum 0.").max(10, "10 exemplaires maximum en ligne."),
    terms: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.sendMode === "date") {
      const t = today();
      if (!v.deliveryDate) ctx.addIssue({ path: ["deliveryDate"], code: "custom", message: "Choisissez la date d'envoi de l'invitation." });
      else if (v.deliveryDate < t) ctx.addIssue({ path: ["deliveryDate"], code: "custom", message: "Cette date est déjà passée. Choisissez aujourd'hui ou une date à venir." });
      else if (dayStart(v.deliveryDate) > dayStart(t) + 365 * DAY) ctx.addIssue({ path: ["deliveryDate"], code: "custom", message: "La date doit être dans les 12 prochains mois." });
    }
  });
type FormValues = z.infer<typeof schema>;

const STEPS = [
  { key: "formule", label: "Formule", fields: ["packageCode"] },
  { key: "parcours", label: "Parcours", fields: ["theme"] },
  { key: "destinataire", label: "Destinataire", fields: ["firstName", "lastName", "email", "relation"] },
  { key: "message", label: "Message", fields: ["message"] },
  { key: "date", label: "Date et options", fields: ["sendMode", "deliveryDate", "giftBox", "extraCopies"] },
  { key: "recap", label: "Récapitulatif", fields: ["terms"] },
  { key: "paiement", label: "Paiement", fields: [] },
] as const;

const DRAFT_KEY = "filemoire-proto-wizard";

export function GiftWizard() {
  const nav = useNav();
  const formule = useQueryParam("formule") as PackageCode | null;
  const [step, setStep] = useState(0);
  const [orderId, setOrderId] = useState<string>();
  const [done, setDone] = useState(false);
  const [payError, setPayError] = useState<string>();
  const [termsError, setTermsError] = useState<string>();
  const order = useDemo((s) => s.orders.find((o) => o.id === orderId));

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { packageCode: undefined, theme: "vie", firstName: "", lastName: "", email: "", relation: "", message: "", sendMode: "now", deliveryDate: today(), giftBox: false, extraCopies: 0, terms: false },
  });
  const { register, control, setValue, trigger, getValues, formState } = form;
  const v = useWatch({ control }) as FormValues;
  const e = formState.errors;

  // Brouillon du tunnel conservé pour la session (rechargement de page).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { values: Partial<FormValues>; step: number };
        form.reset({ ...getValues(), ...d.values, terms: false });
        setStep(Math.min(d.step, 4));
      }
    } catch {
      /* stockage indisponible */
    }
  }, [form, getValues]);
  useEffect(() => {
    if (formule && PACKAGES.some((p) => p.code === formule && !p.quoteOnly)) setValue("packageCode", formule as FormValues["packageCode"]);
  }, [formule, setValue]);
  useEffect(() => {
    if (done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: { ...v, terms: false }, step }));
    } catch {
      /* rien */
    }
  }, [v, step, done]);

  const p = v.packageCode ? pkg(v.packageCode) : undefined;
  const total = useMemo(() => (p?.price ?? 0) + (v.giftBox ? GIFT_BOX_PRICE : 0) + (Number(v.extraCopies) || 0) * EXTRA_COPY_PRICE, [p, v.giftBox, v.extraCopies]);

  const next = async () => {
    const fields = STEPS[step].fields as unknown as (keyof FormValues)[];
    if (STEPS[step].key === "recap") {
      if (!getValues("terms")) {
        setTermsError("Merci d'accepter les conditions de la démonstration pour continuer.");
        return;
      }
      setTermsError(undefined);
      const vals = getValues();
      const id = useDemo.getState().createOrder({
        packageCode: vals.packageCode,
        theme: vals.theme as ThemeCode,
        recipient: { firstName: vals.firstName.trim(), lastName: vals.lastName.trim(), email: vals.email.trim().toLowerCase(), relation: vals.relation },
        message: vals.message.trim(),
        deliveryDate: vals.sendMode === "now" ? today() : vals.deliveryDate,
        giftBox: vals.giftBox,
        extraCopies: Number(vals.extraCopies) || 0,
      });
      setOrderId(id);
      setStep(step + 1);
      return;
    }
    const ok = await trigger(fields);
    if (!ok) {
      toast.error("Quelques informations manquent", { description: "Les champs à corriger sont indiqués en rouge." });
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    if (STEPS[step].key === "paiement" && orderId) {
      useDemo.getState().cancelOrder(orderId);
      setOrderId(undefined);
    }
    setPayError(undefined);
    setStep(Math.max(0, step - 1));
  };
  const pay = (outcome: "acceptee" | "refusee") => {
    if (!orderId) return;
    const r = useDemo.getState().payOrder(orderId, outcome);
    if (r.ok) {
      setDone(true);
      setPayError(undefined);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* rien */
      }
      toast.success("Paiement test accepté", { description: "Aucune somme n'a été débitée." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setPayError(r.error);
  };

  if (done && order) return <Confirmation orderId={order.id} />;

  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Offrir Filémoire" title="Préparez votre cadeau" intro="Sept étapes courtes. Vous pourrez revenir en arrière à tout moment." />
      <nav aria-label="Étapes de la commande" className="mt-8 overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={i > step || STEPS[step].key === "paiement"}
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  i === step ? "border-prune bg-prune text-creme" : i < step ? "border-success/40 bg-success-bg text-success hover:underline" : "border-line bg-white text-ink-muted",
                )}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">{i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}</span>
                {s.label}
                <span className="sr-only">{i < step ? " (terminée)" : i === step ? " (étape actuelle)" : ""}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            if (STEPS[step].key !== "paiement") void next();
          }}
          className="card p-5 sm:p-8"
        >
          <h2 className="mb-6 text-2xl">
            {step + 1}. {STEPS[step].label}
          </h2>

          {STEPS[step].key === "formule" && (
            <>
              <ChoiceCards
                name="packageCode"
                legend="Quelle formule souhaitez-vous offrir ?"
                value={v.packageCode}
                onChange={(x) => setValue("packageCode", x as FormValues["packageCode"], { shouldValidate: true })}
                error={e.packageCode?.message}
                options={PACKAGES.filter((x) => !x.quoteOnly).map((x) => ({
                  value: x.code as FormValues["packageCode"],
                  title: x.name,
                  aside: <span className="font-serif text-xl text-prune">{x.priceLabel}</span>,
                  description: `${x.short}. ${x.voice ? "Réponses écrites ou vocales." : "Réponses écrites."}${x.qr ? " QR audio dans le livre." : ""}`,
                }))}
              />
              <p className="mt-4 text-sm text-ink-muted">
                Bilingue (299 – 449 €) et Accompagné (690 – 1 490 €) se commandent sur devis : <Link href="/offres#devis">demander un devis</Link>.
              </p>
            </>
          )}

          {STEPS[step].key === "parcours" && (
            <ChoiceCards
              name="theme"
              columns={2}
              legend={`Quel fil conducteur pour les ${p?.questions ?? 52} questions ?`}
              value={v.theme}
              onChange={(x) => setValue("theme", x as FormValues["theme"], { shouldValidate: true })}
              error={e.theme?.message}
              options={THEMES.map((t) => ({ value: t.code as FormValues["theme"], title: t.name, description: t.description }))}
            />
          )}

          {STEPS[step].key === "destinataire" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Alert tone="privacy" className="sm:col-span-2">
                Offrir ne donne pas accès aux réponses. Vous suivrez l'avancement ; {v.firstName || "la personne"} décidera de ce qu'elle partage.
              </Alert>
              <Field id="firstName" label="Prénom" error={e.firstName?.message}>
                <Input id="firstName" autoComplete="off" aria-invalid={!!e.firstName} aria-describedby={describedBy("firstName", false, e.firstName)} {...register("firstName")} />
              </Field>
              <Field id="lastName" label="Nom" error={e.lastName?.message}>
                <Input id="lastName" autoComplete="off" aria-invalid={!!e.lastName} aria-describedby={describedBy("lastName", false, e.lastName)} {...register("lastName")} />
              </Field>
              <Field id="email" label="Son adresse e-mail" hint="L'invitation personnelle y sera envoyée. Utilisez une adresse fictive pour la démo." error={e.email?.message} className="sm:col-span-2">
                <Input id="email" type="email" inputMode="email" autoComplete="off" placeholder="prenom.nom@demo.filemoire.test" aria-invalid={!!e.email} aria-describedby={describedBy("email", true, e.email)} {...register("email")} />
              </Field>
              <Field id="relation" label="Cette personne est…" error={e.relation?.message} className="sm:col-span-2">
                <Select id="relation" aria-invalid={!!e.relation} aria-describedby={describedBy("relation", false, e.relation)} {...register("relation")}>
                  <option value="">Choisir…</option>
                  {RELATIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <button
                type="button"
                className="justify-self-start text-sm text-prune underline sm:col-span-2"
                onClick={() => {
                  setValue("firstName", "Madeleine");
                  setValue("lastName", "Martin");
                  setValue("email", "madeleine.martin@demo.filemoire.test");
                  setValue("relation", "Ma mère");
                  void trigger(["firstName", "lastName", "email", "relation"]);
                }}
              >
                Démo : remplir avec Madeleine Martin (fictive)
              </button>
            </div>
          )}

          {STEPS[step].key === "message" && (
            <div className="space-y-4">
              <Field id="message" label="Votre message" optional hint="Il accompagnera l'invitation. Quelques mots sincères suffisent." error={e.message?.message}>
                <Textarea id="message" maxLength={600} rows={6} aria-invalid={!!e.message} aria-describedby={describedBy("message", true, e.message)} {...register("message")} className="font-serif text-lg" />
              </Field>
              <p className="text-right text-sm text-ink-muted" aria-live="polite">
                {v.message?.length ?? 0} / 600
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  `${v.firstName || "Maman"}, tu nous as tant raconté à table. Cette fois, on aimerait que tes histoires restent pour toujours.`,
                  "Joyeux Noël ! Une question par semaine, à ton rythme. Nous avons hâte de lire ton livre.",
                ].map((s) => (
                  <button key={s} type="button" onClick={() => setValue("message", s, { shouldValidate: true })} className="rounded-md border border-line bg-creme-200 px-3 py-2 text-left text-sm hover:border-or">
                    « {s} »
                  </button>
                ))}
              </div>
            </div>
          )}

          {STEPS[step].key === "date" && (
            <div className="space-y-6">
              <ChoiceCards
                name="sendMode"
                legend="Quand l'invitation doit-elle arriver ?"
                value={v.sendMode}
                onChange={(x) => setValue("sendMode", x as "now" | "date", { shouldValidate: true })}
                options={[
                  { value: "now", title: "Dès aujourd'hui", description: "L'invitation est envoyée juste après le paiement." },
                  { value: "date", title: "À une date choisie", description: "Noël, un anniversaire, la fête des grands-parents…" },
                ]}
              />
              {v.sendMode === "date" && (
                <Field id="deliveryDate" label="Date d'envoi de l'invitation" error={e.deliveryDate?.message}>
                  <Input id="deliveryDate" type="date" min={today()} className="max-w-xs" aria-invalid={!!e.deliveryDate} aria-describedby={describedBy("deliveryDate", false, e.deliveryDate)} {...register("deliveryDate")} />
                </Field>
              )}
              <div className="space-y-3 rounded-lg border border-line bg-creme-200/50 p-4">
                <p className="font-semibold text-prune">Options</p>
                <Checkbox id="giftBox" checked={!!v.giftBox} onChange={(x) => setValue("giftBox", x)}>
                  Coffret cadeau — carte, message imprimé et emballage (+{fmtEur(GIFT_BOX_PRICE)}, indicatif 19 – 39 €)
                </Checkbox>
                <Field id="extraCopies" label={`Exemplaires supplémentaires du livre (${fmtEur(EXTRA_COPY_PRICE)} l'unité, indicatif 39 – 69 €)`} error={e.extraCopies?.message}>
                  <Input id="extraCopies" type="number" min={0} max={10} className="max-w-[8rem]" aria-invalid={!!e.extraCopies} {...register("extraCopies", { valueAsNumber: true })} />
                </Field>
              </div>
            </div>
          )}

          {STEPS[step].key === "recap" && p && (
            <div className="space-y-5">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
                <dt className="text-ink-muted">Formule</dt>
                <dd className="font-medium">{p.name} — {p.questions} questions</dd>
                <dt className="text-ink-muted">Parcours</dt>
                <dd className="font-medium">{theme(v.theme as ThemeCode).name}</dd>
                <dt className="text-ink-muted">Pour</dt>
                <dd className="font-medium">
                  {v.firstName} {v.lastName} ({v.relation}) · {v.email}
                </dd>
                <dt className="text-ink-muted">Message</dt>
                <dd className="font-serif text-lg italic">{v.message ? `« ${v.message} »` : "Aucun message"}</dd>
                <dt className="text-ink-muted">Invitation</dt>
                <dd className="font-medium">{v.sendMode === "now" ? "Envoyée aujourd'hui" : `Envoyée le ${fmtDate(dayStart(v.deliveryDate))}`}</dd>
                <dt className="text-ink-muted">Options</dt>
                <dd className="font-medium">
                  {v.giftBox ? "Coffret cadeau" : "Sans coffret"} · {Number(v.extraCopies) || 0} exemplaire(s) supplémentaire(s)
                </dd>
              </dl>
              <Alert tone="info">
                {v.firstName} recevra une invitation personnelle valable 30 jours. Vous suivrez son avancement, sans lire ses réponses sauf si {v.firstName} les partage avec vous.
              </Alert>
              <Checkbox id="terms" checked={!!v.terms} invalid={!!termsError} onChange={(x) => setValue("terms", x)}>
                J'ai compris qu'il s'agit d'une démonstration : aucun paiement réel, aucun e-mail envoyé, données fictives uniquement.
              </Checkbox>
              {termsError && (
                <p role="alert" className="text-sm font-medium text-danger">
                  {termsError}
                </p>
              )}
            </div>
          )}

          {STEPS[step].key === "paiement" && (
            <div className="space-y-5">
              <Alert tone="sim" title="Paiement de démonstration">
                Aucune carte bancaire n'est demandée ni enregistrée. En production, le paiement se ferait sur la page sécurisée d'un prestataire (par exemple Stripe Checkout) ; Filémoire ne verrait jamais les numéros de carte.
              </Alert>
              <div className="rounded-lg border border-line bg-creme-200/50 p-5">
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <CreditCard className="size-4" aria-hidden /> Montant à régler
                </p>
                <p className="mt-1 font-serif text-4xl font-semibold text-prune">{fmtEur(total)}</p>
                <p className="text-sm text-ink-muted">TTC indicatif · commande {order?.ref}</p>
              </div>
              {payError && (
                <Alert tone="danger" title="Paiement refusé">
                  {payError}
                </Alert>
              )}
              <div className="flex flex-wrap gap-3">
                <Button size="xl" onClick={() => pay("acceptee")}>
                  <ShieldCheck /> Simuler un paiement accepté
                </Button>
                <Button size="xl" variant="outline" onClick={() => pay("refusee")}>
                  <XCircle /> Simuler un refus
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft /> {STEPS[step].key === "paiement" ? "Modifier la commande" : "Retour"}
            </Button>
            {STEPS[step].key !== "paiement" && (
              <Button type="submit" size="lg">
                {STEPS[step].key === "recap" ? "Continuer vers le paiement" : "Continuer"} <ArrowRight />
              </Button>
            )}
          </div>
        </form>

        <aside className="self-start lg:sticky lg:top-6">
          <div className="card p-5">
            <p className="font-serif text-xl font-semibold text-prune">Votre cadeau</p>
            <div className="mx-auto mt-4 w-32">
              <BookCoverArt template="prune" title={v.firstName ? `Le livre de ${v.firstName}` : "Le livre de…"} subtitle="Souvenirs à transmettre" size="sm" />
            </div>
            <dl className="mt-5 space-y-2 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt>{p ? p.name : "Formule à choisir"}</dt>
                <dd>{p ? fmtEur(p.price!) : "—"}</dd>
              </div>
              {v.giftBox && (
                <div className="flex justify-between gap-3">
                  <dt>Coffret cadeau</dt>
                  <dd>{fmtEur(GIFT_BOX_PRICE)}</dd>
                </div>
              )}
              {Number(v.extraCopies) > 0 && (
                <div className="flex justify-between gap-3">
                  <dt>{v.extraCopies} exemplaire(s) en plus</dt>
                  <dd>{fmtEur(Number(v.extraCopies) * EXTRA_COPY_PRICE)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                <dt>Total TTC indicatif</dt>
                <dd>{fmtEur(total)}</dd>
              </div>
            </dl>
            {v.firstName && (
              <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
                <Gift className="mt-0.5 size-4 shrink-0" aria-hidden /> Pour {v.firstName} {v.lastName}
                {v.sendMode === "date" && v.deliveryDate ? `, le ${fmtDate(dayStart(v.deliveryDate))}` : ""}
              </p>
            )}
            <p className="mt-4">
              <SimTag>Prix indicatifs</SimTag>
            </p>
          </div>
          <Button variant="link" className="mt-3" onClick={() => nav.push("/acheteur")}>
            Annuler et revenir à mon espace
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ orderId }: { orderId: string }) {
  const order = useDemo((s) => s.orders.find((o) => o.id === orderId))!;
  const project = useDemo((s) => s.projects.find((p) => p.id === order.projectId));
  const inv = project?.invitation;
  return (
    <div className="container-page max-w-3xl py-12">
      <div className="card overflow-hidden">
        <div className="bg-prune px-6 py-8 text-creme sm:px-10">
          <PartyPopper className="size-9 text-or" aria-hidden />
          <h1 className="mt-4 !text-creme">Merci, votre cadeau est prêt</h1>
          <p className="mt-2 text-creme/85">
            Commande {order.ref} · {pkg(order.packageCode).name} · {fmtEur(order.total)} (paiement test)
          </p>
        </div>
        <div className="space-y-6 p-6 sm:p-10">
          {inv?.status === "envoyee" ? (
            <Alert tone="success" title={`L'invitation a été envoyée à ${order.recipient.firstName}`}>
              Elle est valable jusqu'au {fmtDate(inv.expiresAt)}. Vous serez prévenue dès qu'elle sera acceptée.
            </Alert>
          ) : (
            inv && (
              <Alert tone="info" title={`L'invitation partira le ${fmtDate(inv.sendAt)}`} action={<Button size="sm" variant="secondary" onClick={() => useDemo.getState().sendInvitationNow(project!.id)}>Démo : envoyer maintenant</Button>}>
                Vous pourrez la modifier ou l'envoyer plus tôt depuis « Mes cadeaux ».
              </Alert>
            )
          )}
          <div className="rounded-lg border border-dashed border-or bg-or-50/40 p-5">
            <p className="font-semibold text-prune">Pour la démonstration</p>
            <p className="mt-1 text-[15px] text-ink-muted">L'e-mail d'invitation est visible dans la boîte simulée. Le lien ouvre l'espace de {order.recipient.firstName}.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/demo/boite-mail">
                  <Mail /> Ouvrir la boîte e-mail
                </Link>
              </Button>
              {inv?.status === "envoyee" && (
                <Button variant="secondary" asChild>
                  <Link href={`/invitation/${inv.token}`}>Ouvrir directement l'invitation</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/acheteur/cadeaux">Suivre mes cadeaux</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/acheteur/commandes#${order.id}`}>Voir la commande</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
