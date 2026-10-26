"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Form } from "./form";
import { PageIntro, dateLabel, money } from "./dashboard-ui";
import type { Account } from "@/server/auth";
import { locale, tr } from "@/i18n/core";
import { useLang } from "@/i18n/lang";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  PACKAGES,
  THEMES,
  EXTRA_COPY_PRICE,
  GIFT_BOX_PRICE,
} from "@/lib/catalog";
import { api, markUnsaved } from "./client";
import { LiveShell, Message } from "./shell";
const steps = [
  "Formule",
  "Parcours",
  "Destinataire",
  "Message",
  "Date et options",
  "Récapitulatif",
  "Paiement",
];
const headings = [
  "Quelle formule lui offrir ?",
  "Quel parcours lui ressemble ?",
  "À qui s’adresse ce cadeau ?",
  "Un mot pour accompagner votre cadeau",
  "Quand souhaitez-vous lui offrir ?",
  "Vérifiez votre cadeau",
  "Votre cadeau est prêt",
];
const descriptions = [
  "26 questions · Réponses écrites et photos. Un livre souple.",
  "52 questions · Réponses écrites ou vocales. Éditeur familial et un livre relié.",
  "52 questions · Transcription à relire. QR audio privé dans le livre.",
];
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function LiveGift() {
  useLang((s) => s.lang);
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [requestKey, setRequestKey] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    packageCode: "",
    theme: "vie",
    firstName: "",
    lastName: "",
    email: "",
    relation: "",
    message: "",
    date: today(),
    giftBox: false,
    extraCopies: 0,
  });
  const [catalog, setCatalog] = useState<{
    ordersOpen: boolean;
    cutoff: string | null;
  } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const dirty = useRef(false);
  const change = (patch: Partial<typeof form>) => {
    setForm((value) => ({ ...value, ...patch }));
    setRequestKey(crypto.randomUUID());
    setAccepted(false);
    dirty.current = true;
    markUnsaved(true);
  };
  const go = (next: number) => {
    setStep(next);
    setError("");
  };
  useEffect(() => {
    if (step) title.current?.focus();
  }, [step]);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
    const picked = new URLSearchParams(location.search).get("formule");
    if (picked && ["essentiel", "heritage", "voix"].includes(picked))
      setForm((value) => ({ ...value, packageCode: picked }));
    api<{ ordersOpen: boolean; cutoff: string | null }>("catalog")
      .then(setCatalog)
      .catch((e) => setError(e.message));
    api<{ account: Account | null }>("me")
      .then((r) => {
        if (!r.account) location.href = "/acces?retour=/offrir";
        else setAccount(r.account);
      })
      .catch((e) => setError(e.message));
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      markUnsaved(false);
      window.removeEventListener("beforeunload", prevent);
    };
  }, []);
  const selected = PACKAGES.find((p) => p.code === form.packageCode);
  const total =
    (selected?.price ?? 0) +
    (form.giftBox ? GIFT_BOX_PRICE : 0) +
    form.extraCopies * EXTRA_COPY_PRICE;
  return (
    <LiveShell account={account} view="offrir">
      <PageIntro title="Préparez son cadeau">
        Tout commence par une formule. Votre proche garde la liberté de raconter
        à son rythme.
      </PageIntro>
      <ol className="dash-steps" aria-label="Préparation du cadeau">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}>
            {index < step ? (
              <button type="button" disabled={busy} onClick={() => go(index)}>
                {index + 1} · <span>{label}</span>
              </button>
            ) : (
              <span>
                {index + 1} · <span>{label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="dash-columns">
        <section>
          <h2 ref={title} tabIndex={-1}>
            {headings[step]}
          </h2>
          <Message error={error} />
          <Form
            key={step}
            className="dash-gift-form space-y-6"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !form.packageCode) return;
              if (step < 6) {
                go(step + 1);
                return;
              }
              if (!account || !accepted || !catalog?.ordersOpen) return;
              setBusy(true);
              setError("");
              try {
                const result = await api<{ url: string }>("checkout", {
                  requestKey,
                  packageCode: form.packageCode,
                  theme: form.theme,
                  recipient: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email,
                    relation: form.relation,
                  },
                  message: form.message,
                  deliveryDate: form.date,
                  giftBox: form.giftBox,
                  extraCopies: form.extraCopies,
                  termsVersion: "2026-10-13",
                  accepted: true,
                });
                dirty.current = false;
                markUnsaved(false);
                location.assign(result.url);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {step === 0 && (
              <fieldset>
                <legend className="sr-only">Formule</legend>
                {PACKAGES.filter((p) => p.price).map((p, index) => (
                  <label key={p.code} className="dash-offer">
                    <span className="dash-price">
                      {(p.price! / 100).toLocaleString(locale(), {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <input
                      type="radio"
                      name="package"
                      value={p.code}
                      checked={form.packageCode === p.code}
                      onChange={() => change({ packageCode: p.code })}
                      required
                    />
                    <strong>{p.name.replace("Filémoire ", "")}</strong>
                    <p>
                      {tr(descriptions[index]).split(". ")[0]}.<br />
                      {tr(descriptions[index]).split(". ").slice(1).join(". ")}
                    </p>
                  </label>
                ))}
                <p className="dash-note">
                  Bilingue (299–449 €) et Accompagné (690–1 490 €) :{" "}
                  <Link className="underline" href="/#contact">
                    sur devis
                  </Link>
                  . Tous les prix sont indicatifs.
                </p>
              </fieldset>
            )}
            {step === 1 && (
              <fieldset>
                <legend className="sr-only">Parcours</legend>
                {THEMES.map((theme) => (
                  <label className="dash-offer" key={theme.code}>
                    <input
                      type="radio"
                      name="theme"
                      value={theme.code}
                      checked={form.theme === theme.code}
                      onChange={() => change({ theme: theme.code })}
                    />
                    <strong>
                      {theme.code === "vie"
                        ? "Le fil de votre vie"
                        : theme.name}
                    </strong>
                    <p>{theme.description}</p>
                  </label>
                ))}
              </fieldset>
            )}
            {step === 2 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {(
                  [
                    ["firstName", "Prénom", "text"],
                    ["lastName", "Nom", "text"],
                    ["email", "E-mail du destinataire", "email"],
                    ["relation", "Votre lien avec cette personne", "text"],
                  ] as const
                ).map(([name, label, type]) => (
                  <label key={name}>
                    {label}
                    <Input
                      name={name}
                      type={type}
                      value={form[name]}
                      onChange={(e) => change({ [name]: e.target.value })}
                      required
                      maxLength={name === "email" ? 254 : 100}
                      pattern={type === "text" ? ".*\\S.*" : undefined}
                      className="mt-2"
                    />
                  </label>
                ))}
              </div>
            )}
            {step === 3 && (
              <label className="block">
                Votre message
                <Textarea
                  name="message"
                  value={form.message}
                  onChange={(e) => change({ message: e.target.value })}
                  className="mt-2 min-h-48"
                  maxLength={2000}
                />
                <small>{form.message.length} / 2000</small>
              </label>
            )}
            {step === 4 && (
              <>
                <label className="block">
                  Date d’envoi de l’invitation
                  <Input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => change({ date: e.target.value })}
                    required
                    min={today()}
                    className="mt-2"
                  />
                </label>
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={form.giftBox}
                    onChange={(e) => change({ giftBox: e.target.checked })}
                  />
                  Coffret cadeau (+29 €)
                </label>
                <label className="block">
                  Exemplaires supplémentaires (49 € chacun)
                  <Input
                    className="mt-2"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    required
                    value={form.extraCopies}
                    onChange={(e) =>
                      change({ extraCopies: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            )}
            {step === 5 && (
              <dl className="dash-review">
                <div>
                  <dt>Formule</dt>
                  <dd>{selected?.name}</dd>
                </div>
                <div>
                  <dt>Parcours</dt>
                  <dd>{THEMES.find((t) => t.code === form.theme)?.name}</dd>
                </div>
                <div>
                  <dt>Destinataire</dt>
                  <dd translate="no">
                    {form.firstName} {form.lastName}
                    <br />
                    {form.email}
                    <br />
                    {form.relation}
                  </dd>
                </div>
                <div>
                  <dt>Votre message</dt>
                  <dd translate="no" className="whitespace-pre-wrap">
                    {form.message || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Date d’envoi de l’invitation</dt>
                  <dd>{dateLabel(form.date + "T12:00:00Z")}</dd>
                </div>
                <div>
                  <dt>Options</dt>
                  <dd>
                    {form.giftBox ? "Coffret cadeau" : "Sans coffret"} ·{" "}
                    {form.extraCopies} exemplaire(s) supplémentaire(s)
                  </dd>
                </div>
              </dl>
            )}
            {step === 6 && (
              <>
                <p>
                  Votre commande sera confirmée après le paiement. Votre proche
                  reste libre d’accepter l’invitation.
                </p>
                {!catalog && !error && <p role="status">Chargement…</p>}
                {catalog && !catalog.ordersOpen && (
                  <p className="dash-notice" role="status">
                    Les commandes ne sont pas encore ouvertes.
                  </p>
                )}
                {catalog?.cutoff && (
                  <p>
                    Date limite de commande :{" "}
                    {new Date(catalog.cutoff).toLocaleString(locale())}
                  </p>
                )}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                    className="mt-1"
                  />
                  <span>
                    J’accepte les{" "}
                    <a
                      className="underline"
                      href="/legal"
                      target="_blank"
                      rel="noreferrer"
                    >
                      conditions de commande
                    </a>{" "}
                    et comprends que le narrateur contrôle ses souvenirs.
                  </span>
                </label>
              </>
            )}
            <div className="dash-actions pt-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => go(step - 1)}
                >
                  Précédent
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  busy ||
                  !form.packageCode ||
                  (step === 6 && (!account || !catalog?.ordersOpen))
                }
                aria-busy={busy}
              >
                {busy
                  ? "Préparation du paiement…"
                  : step === 0
                    ? "Valider cette formule ↗"
                    : step === 6
                      ? "Continuer vers le paiement"
                      : "Continuer"}
              </Button>
            </div>
          </Form>
        </section>
        <aside className="dash-gift-aside">
          <section className="dash-summary">
            <h2>Votre cadeau</h2>
            <img
              className="dash-gift-preview"
              src="/dashboard/livre.webp"
              width={150}
              height={190}
              alt="Exemple de couverture d’un livre Filémoire"
            />
            <p>{selected?.name ?? tr("Choisissez sa formule.")}</p>
            {form.firstName && (
              <p translate="no">
                {form.firstName} {form.lastName}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5 mt-5">
              <span>Total TTC indicatif</span>
              <strong>{selected ? money(total) : "—"}</strong>
            </div>
          </section>
          <p className="dash-note">
            <Link href="/espace?role=buyer">Revenir à mon espace</Link>
          </p>
        </aside>
      </div>
    </LiveShell>
  );
}
