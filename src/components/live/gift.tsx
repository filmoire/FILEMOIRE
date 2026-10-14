"use client";
import { locale } from "@/i18n/core";
import { useLang } from "@/i18n/lang";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  PACKAGES,
  THEMES,
  EXTRA_COPY_PRICE,
  GIFT_BOX_PRICE,
} from "@/lib/catalog";
import { api } from "./client";
import { LiveShell, Message } from "./shell";
export function LiveGift() {
  useLang((s) => s.lang);
  const [packageCode, setPackage] = useState("heritage"),
    [giftBox, setGiftBox] = useState(false),
    [extraCopies, setCopies] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [catalog, setCatalog] = useState<{
    ordersOpen: boolean;
    cutoff: string | null;
  } | null>(null);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
    const picked = new URLSearchParams(location.search).get("formule");
    if (picked && ["essentiel", "heritage", "voix"].includes(picked))
      setPackage(picked);
    api<{ ordersOpen: boolean; cutoff: string | null }>("catalog")
      .then(setCatalog)
      .catch((e) => setError(e.message));
    api<{ account: unknown }>("me")
      .then((r) => {
        if (!r.account) location.href = "/acces?retour=/offrir";
        else setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  const total =
    (PACKAGES.find((p) => p.code === packageCode)?.price ?? 0) +
    (giftBox ? GIFT_BOX_PRICE : 0) +
    extraCopies * EXTRA_COPY_PRICE;
  return (
    <LiveShell>
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Un cadeau à transmettre</p>
        <h1 className="mt-3">Offrir Filémoire</h1>
        <p className="mt-4">
          Choisissez le parcours et la personne qui racontera. Le paiement se
          fait sur la page sécurisée du prestataire.
        </p>
        <Message error={error} />
        {catalog && !catalog.ordersOpen && (
          <p role="status" className="my-4 rounded bg-creme-200 p-4">
            Les commandes ne sont pas encore ouvertes.
          </p>
        )}
        {catalog?.cutoff && (
          <p>
            Date limite de commande :{" "}
            {new Date(catalog.cutoff).toLocaleString(locale())}
          </p>
        )}
        <form
          className="card mt-8 space-y-6 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await api<{ url: string }>("checkout", {
                requestKey,
                packageCode,
                theme: f.get("theme"),
                recipient: {
                  firstName: f.get("firstName"),
                  lastName: f.get("lastName"),
                  email: f.get("email"),
                  relation: f.get("relation"),
                },
                message: f.get("message"),
                deliveryDate: f.get("date"),
                giftBox,
                extraCopies,
                termsVersion: "2026-10-13",
                accepted: true,
              });
              location.assign(r.url);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
          onChange={() => setRequestKey(crypto.randomUUID())}
        >
          <fieldset>
            <legend className="font-semibold">Formule</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {PACKAGES.filter((p) => p.price).map((p) => (
                <label
                  key={p.code}
                  className="rounded-md border border-line p-4"
                >
                  <input
                    type="radio"
                    name="package"
                    value={p.code}
                    checked={packageCode === p.code}
                    onChange={() => setPackage(p.code)}
                  />
                  <span className="ml-2">{p.name}</span>
                  <p className="mt-2 font-serif text-2xl">{p.priceLabel}</p>
                  <p className="text-sm">{p.short}</p>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            Parcours
            <select
              name="theme"
              className="mt-2 block w-full rounded border border-line p-3"
            >
              {THEMES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["firstName", "Prénom", "text"],
              ["lastName", "Nom", "text"],
              ["email", "E-mail du destinataire", "email"],
              ["relation", "Votre lien avec cette personne", "text"],
            ].map(([name, label, type]) => (
              <label key={name}>
                {label}
                <Input
                  className="mt-2"
                  name={name}
                  type={type}
                  required
                  maxLength={name === "email" ? 254 : 100}
                />
              </label>
            ))}
          </div>
          <label className="block">
            Votre message
            <Textarea name="message" className="mt-2" maxLength={2000} />
          </label>
          <label className="block">
            Date d’envoi de l’invitation
            <Input
              name="date"
              type="date"
              className="mt-2"
              required
              min={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex gap-3">
            <input
              type="checkbox"
              checked={giftBox}
              onChange={(e) => setGiftBox(e.target.checked)}
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
              value={extraCopies}
              onChange={(e) => setCopies(Number(e.target.value))}
            />
          </label>
          <p className="font-serif text-3xl">
            Total :{" "}
            {(total / 100).toLocaleString(locale(), {
              style: "currency",
              currency: "EUR",
            })}
          </p>
          <label className="flex items-start gap-3">
            <input type="checkbox" required className="mt-1" />
            <span>
              J’accepte les{" "}
              <a className="underline" href="/legal" target="_blank">
                conditions de commande
              </a>{" "}
              et comprends que le narrateur contrôle ses souvenirs.
            </span>
          </label>
          <Button
            type="submit"
            disabled={!ready || busy || !catalog?.ordersOpen}
          >
            {busy ? "Préparation du paiement…" : "Continuer vers le paiement"}
          </Button>
        </form>
      </div>
    </LiveShell>
  );
}
