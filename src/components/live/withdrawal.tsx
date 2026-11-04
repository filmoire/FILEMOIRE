"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/i18n/lang";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LivePublicHeader, Message } from "./shell";
import { Form } from "./form";
import { api } from "./client";

type Receipt = {
  id: string;
  receivedAt: string;
  text: string;
  emailStatus: "queued";
};
export function WithdrawalForm() {
  const lang = useLang((s) => s.lang);
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    orderReference: "",
  });
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const requestKey = useRef("");
  const inFlight = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (review || receipt) stepHeading.current?.focus();
  }, [review, receipt]);
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    requestKey.current ||= crypto.randomUUID();
    try {
      setReceipt(
        await api<Receipt>("withdrawals", {
          ...fields,
          language: lang,
          requestKey: requestKey.current,
          confirmed: true,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function download() {
    if (!receipt) return;
    const url = URL.createObjectURL(
      new Blob([receipt.text], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `filemoire-retractation-${receipt.id}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <LivePublicHeader />
      <main className="my-12 space-y-6" lang={lang} translate="no">
        <h1>{t("Se rétracter du contrat", "Withdraw from a contract")}</h1>
        <p className="text-lg text-ink-muted">
          {t(
            "Transmettez votre déclaration gratuitement, sans créer de compte ni donner de motif.",
            "Submit your declaration free of charge, without creating an account or giving a reason.",
          )}
        </p>
        <Message error={error} />
        {receipt ? (
          <section
            className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-8"
            aria-label={t("Accusé de réception", "Acknowledgement")}
          >
            <h2 role="status" ref={stepHeading} tabIndex={-1}>
              {t(
                "Votre déclaration est enregistrée",
                "Your declaration is recorded",
              )}
            </h2>
            <p>
              {t("Référence :", "Reference:")}{" "}
              <span className="break-all">{receipt.id}</span>
            </p>
            <p>
              {t("Reçue le :", "Received at:")}{" "}
              <time dateTime={receipt.receivedAt}>
                {new Date(receipt.receivedAt).toLocaleString(
                  lang === "en" ? "en-GB" : "fr-FR",
                  { timeZone: "Europe/Paris" },
                )}{" "}
                (Europe/Paris)
              </time>
            </p>
            <p>
              {t(
                "L’envoi de l’accusé de réception à votre adresse e-mail est en attente. Téléchargez votre copie dès maintenant.",
                "Your email acknowledgement is queued for delivery. Download your copy now.",
              )}
            </p>
            <p>
              {t(
                "Cette réception ne confirme pas l’exécution d’un remboursement. L’équipe vérifiera le contrat et les droits applicables.",
                "This receipt does not confirm a completed refund. The team will check the contract and applicable rights.",
              )}
            </p>
            <Button onClick={download}>
              {t(
                "Télécharger l’accusé de réception",
                "Download acknowledgement",
              )}
            </Button>
          </section>
        ) : (
          <Form
            className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              if (review) void submit();
              else setReview(true);
            }}
          >
            {review ? (
              <>
                <h2 ref={stepHeading} tabIndex={-1}>
                  {t("Vérifiez votre déclaration", "Review your declaration")}
                </h2>
                <dl className="space-y-3 break-words">
                  <div>
                    <dt className="text-sm text-ink-muted">
                      {t("Nom complet", "Full name")}
                    </dt>
                    <dd>{fields.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-muted">E-mail</dt>
                    <dd>{fields.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-muted">
                      {t("Contrat / commande", "Contract / order")}
                    </dt>
                    <dd>{fields.orderReference}</dd>
                  </div>
                </dl>
                <p>
                  {t(
                    "Je notifie à Intertrad ma décision de me rétracter du contrat identifié ci-dessus.",
                    "I notify Intertrad that I withdraw from the contract identified above.",
                  )}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={busy}>
                    {busy
                      ? t("Enregistrement…", "Recording…")
                      : t("Confirmer la rétractation", "Confirm withdrawal")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setReview(false);
                      setError("");
                      requestKey.current = "";
                    }}
                  >
                    {t("Modifier", "Edit")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {(
                  [
                    ["name", t("Nom complet", "Full name"), "text", "name"],
                    [
                      "email",
                      t(
                        "Adresse e-mail pour l’accusé de réception",
                        "Email address for your acknowledgement",
                      ),
                      "email",
                      "email",
                    ],
                    [
                      "orderReference",
                      t(
                        "Référence de commande ou identification du contrat",
                        "Order reference or contract identification",
                      ),
                      "text",
                      "off",
                    ],
                  ] as const
                ).map(([key, label, type, autoComplete]) => (
                  <label className="block space-y-2" key={key}>
                    <span>{label}</span>
                    <Input
                      required
                      type={type}
                      autoComplete={autoComplete}
                      minLength={key === "orderReference" ? 3 : 2}
                      maxLength={key === "email" ? 254 : 100}
                      value={fields[key]}
                      onChange={(event) =>
                        setFields({ ...fields, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <p className="text-sm text-ink-muted">
                  {t(
                    "Indiquez uniquement les informations permettant d’identifier votre contrat. Aucun récit, justificatif d’identité ou numéro de carte bancaire n’est demandé.",
                    "Only provide information needed to identify the contract. Do not include stories, identity documents or payment-card numbers.",
                  )}
                </p>
                <Button type="submit">
                  {t("Vérifier ma déclaration", "Review my declaration")}
                </Button>
              </>
            )}
          </Form>
        )}
        <p className="text-sm">
          {t("Besoin d’aide ?", "Need help?")}{" "}
          <a className="underline" href="mailto:admin-dev@filemoire.fr">
            admin-dev@filemoire.fr
          </a>
        </p>
        <div className="flex flex-wrap gap-5 text-sm underline">
          <Link href="/legal#remboursements">
            {t("Conditions et remboursements", "Terms and refunds")}
          </Link>
          <Link href="/">{t("Retour à l’accueil", "Back to home")}</Link>
        </div>
      </main>
    </div>
  );
}
