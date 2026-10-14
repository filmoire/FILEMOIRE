"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { projectView } from "@/server/projects";
import { api } from "./client";
import { Message } from "./shell";

export function CreateBook({
  onCreated,
}: {
  onCreated: (view: ReturnType<typeof projectView>) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<{ fingerprint: string; requestKey: string } | null>(
    null,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const values = {
      firstName: String(form.get("firstName")).trim(),
      lastName: String(form.get("lastName")).trim(),
      title: String(form.get("title")).trim(),
      theme: String(form.get("theme")),
      accepted: form.get("accepted") === "on",
      consentVersion: "2026-10-13",
    };
    const fingerprint = JSON.stringify(values);
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, requestKey: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const view = await api<ReturnType<typeof projectView>>("projects", {
        ...values,
        requestKey: pending.current.requestKey,
      });
      pending.current = null;
      onCreated(view);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="card mt-8 max-w-2xl space-y-5 p-6 sm:p-8"
    >
      <div>
        <p className="eyebrow">Votre histoire, à votre rythme</p>
        <h2 className="mt-2">Commencer mon livre</h2>
        <p className="mt-3 text-ink-muted">
          Créez un manuscrit privé : 52 questions, vos photos, vos
          enregistrements et un PDF à conserver. Aucun paiement ni exemplaire
          imprimé n’est associé à ce manuscrit.
        </p>
      </div>
      <Message error={error} />
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            Votre prénom
            <Input
              name="firstName"
              required
              maxLength={100}
              autoComplete="given-name"
              className="mt-2"
            />
          </label>
          <label className="block">
            Votre nom
            <Input
              name="lastName"
              maxLength={100}
              autoComplete="family-name"
              className="mt-2"
            />
          </label>
        </div>
        <label className="block">
          Titre de votre livre
          <Input
            name="title"
            required
            maxLength={100}
            placeholder="Les souvenirs de ma vie"
            className="mt-2"
          />
        </label>
        <label className="block">
          Fil conducteur
          <select
            name="theme"
            className="mt-2 block w-full rounded-md border border-line bg-white p-3"
            defaultValue="vie"
          >
            <option value="vie">Mon histoire de vie</option>
            <option value="migration">Mes origines et mes voyages</option>
            <option value="metier">Mon métier</option>
            <option value="couple">Notre histoire d’amour</option>
            <option value="parentalite">Devenir parent</option>
            <option value="recettes">Nos recettes et traditions</option>
            <option value="retraite">Ma vie à la retraite</option>
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            name="accepted"
            required
            type="checkbox"
            className="mt-1 size-4 shrink-0"
          />
          <span>
            J’accepte l’enregistrement de mes récits et médias dans mon espace
            privé. Je décide de leur partage et peux demander leur suppression.{" "}
            <Link href="/legal" target="_blank" className="underline">
              Lire les informations de confidentialité
            </Link>
            .
          </span>
        </label>
        <Button type="submit" size="lg">
          {busy ? "Création en cours…" : "Créer mon livre privé"}
        </Button>
      </fieldset>
    </form>
  );
}
