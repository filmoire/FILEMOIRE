"use client";

import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { useQueryParam } from "@/lib/nav";
import { pkg } from "@/lib/catalog";
import type { PackageCode } from "@/lib/types";
import { ContactForm, Pricing } from "./sections";
import { isLive } from "@/lib/mode";

const INCLUDED = [
  "Compte privé",
  "Questions guidées",
  "Relances douces",
  "Éditeur de livre",
  "Aperçu avant impression",
  "Support",
];
const PREMIUM = [
  "Traduction",
  "Interview vidéo",
  "Restauration photo",
  "Chronologie",
  "Arbre familial",
  "Coffret archives",
];

export function OffersScreen() {
  const devis = useQueryParam("devis") as PackageCode | null;
  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Offres et tarifs"
        title="Choisissez le parcours à offrir"
        intro="Le nombre de questions, l'audio, la langue et l'accompagnement déterminent le prix. Le narrateur conserve le contrôle dans toutes les formules."
      />
      <div className="mt-10">
        <Pricing />
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6">
          <h2 className="text-2xl">Inclus dans toutes les offres</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-[15px]">
            {INCLUDED.map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="mt-1 size-4 text-success" aria-hidden /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-white p-6">
          <h2 className="text-2xl">Options premium</h2>
          <p className="text-sm text-ink-muted">
            {isLive
              ? "Prestations envisagées, soumises à confirmation sur devis."
              : "Fonctions à venir, non disponibles dans ce prototype."}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-[15px] text-ink-muted">
            {PREMIUM.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
        </div>
      </div>
      <section
        id="devis"
        className="mt-12 rounded-xl border border-line bg-white p-6 sm:p-8"
        aria-labelledby="h-devis"
      >
        <h2 id="h-devis">Demander un devis</h2>
        <p className="mt-2 text-ink-muted">
          Pour Filémoire Bilingue, Filémoire Accompagné, et les cadeaux
          d'entreprise ou de mutuelle.
        </p>
        <div className="mt-6">
          <ContactForm
            key={devis ?? "x"}
            defaultTopic="devis"
            defaultMessage={
              devis && (devis === "bilingue" || devis === "accompagne")
                ? `Bonjour, je souhaite un devis pour ${pkg(devis).name}.`
                : ""
            }
          />
        </div>
      </section>
    </div>
  );
}
