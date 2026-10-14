"use client";
import { useLang } from "@/i18n/lang";
import { isLive } from "@/lib/mode";

import { ArrowRight, Check, Lock, Quote } from "lucide-react";
import { BookCoverArt } from "@/components/book/cover";
import { Button } from "@/components/ui/button";
import { GoldRule } from "@/components/ui/misc";
import { asset, Link, useNav } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import {
  Benefits,
  ContactForm,
  Faq,
  Pricing,
  RolesRow,
  Timeline,
} from "./sections";

const AUDIENCES = [
  [
    "Cadeau grands-parents",
    "Adultes de 30 à 55 ans qui offrent un parcours à un parent ou un grand-parent.",
  ],
  ["Diaspora", "Préserver les mots, les lieux et les langues d'une famille."],
  ["Retraite", "Transformer une carrière et ses leçons en héritage."],
  [
    "Familles bilingues",
    "Une édition dans deux langues, avec relecture humaine.",
  ],
  [
    "CSE et entreprises",
    "Cadeaux de retraite et programmes intergénérationnels.",
  ],
  ["Résidences et mutuelles", "Partenariats accompagnés et ateliers."],
];
const OCCASIONS = [
  "Noël",
  "Anniversaire",
  "Fête des grands-parents",
  "Retraite",
  "Diaspora",
  "Voix",
  "Bilingue",
];

export function HomeScreen() {
  useLang((s) => s.lang);
  const nav = useNav();
  const offer = () => {
    if (isLive) {
      window.location.assign("/offrir");
      return;
    }
    if (useDemo.getState().persona.role !== "acheteur")
      useDemo.getState().setPersona({ role: "acheteur" });
    nav.push("/acheteur/offrir");
  };
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up">
            <p className="eyebrow">Livre de mémoires familiales</p>
            <h1 className="mt-4 text-[clamp(2.4rem,5.6vw,4rem)] leading-[1.05]">
              Une question à la fois, une vie à transmettre.
            </h1>
            <p className="mt-5 max-w-xl font-serif text-2xl italic text-terre-700">
              Offrez des questions aujourd'hui. Recevez une histoire de famille
              pour toujours.
            </p>
            <p className="mt-4 max-w-xl text-lg text-ink-muted">
              Filémoire guide un proche par des questions simples, recueille ses
              mots, sa voix et ses photos, puis les transforme en un livre qu'il
              valide lui-même.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isLive && (
                <Button size="xl" asChild>
                  <Link href="/espace">Commencer mon histoire</Link>
                </Button>
              )}
              <Button size="xl" onClick={offer}>
                Offrir Filémoire
              </Button>
              <Button size="xl" variant="secondary" asChild>
                <Link href="/livre-exemple">Voir un livre exemple</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-ink-muted">
              {[
                "Réponses écrites ou vocales",
                "Le narrateur valide son livre",
                "Rien n'est partagé sans son accord",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
            <div className="absolute -right-4 -top-6 h-72 w-72 rounded-full bg-or-50" />
            <figure className="relative ml-auto w-[78%] rotate-[1.5deg] rounded-md bg-white p-3 pb-10 shadow-lift">
              {/* Illustration de démonstration (pas une photo réelle) */}
              <img
                src={asset("/demo/jardin.svg")}
                alt=""
                className="aspect-[3/2] w-full rounded-sm object-cover"
              />
              <figcaption className="absolute bottom-3 left-4 font-serif text-sm italic text-ink-muted">
                Paul et Rose au jardin · illustration
              </figcaption>
            </figure>
            <div className="relative -mt-24 w-[46%] -rotate-[4deg]">
              <BookCoverArt preserveText={false}
                template="prune"
                title="Au fil de Rose"
                subtitle="Une vie racontée"
                author="Rose Delmas"
              />
            </div>
            <div className="absolute bottom-6 right-0 w-[56%] rounded-lg border border-line bg-white/95 p-4 shadow-soft">
              <Quote className="size-5 text-or" />
              <p className="quote mt-1 text-lg leading-snug">
                Mon oncle disait que la nuit n'était que le jour qui se repose.
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Rose, 84 ans — personnage fictif
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-y border-line bg-white/60 py-16"
        aria-labelledby="h-comment"
      >
        <div className="container-page">
          <p className="eyebrow">Comment ça marche</p>
          <h2 id="h-comment" className="mt-2 max-w-2xl">
            Un parcours doux, en huit étapes, de l'offre au livre imprimé
          </h2>
          <div className="mt-8">
            <Timeline />
          </div>
          <div className="mt-6">
            <RolesRow />
          </div>
          <p className="mt-6">
            <Link
              href="/comment-ca-marche"
              className="inline-flex items-center gap-1 font-medium text-prune"
            >
              Le détail de chaque étape <ArrowRight className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="h-benef">
        <p className="eyebrow">Ce que Filémoire apporte</p>
        <h2 id="h-benef" className="mt-2">
          Des souvenirs recueillis avec soin
        </h2>
        <div className="mt-8">
          <Benefits />
        </div>
      </section>

      <section
        className="bg-prune py-16 text-creme"
        aria-labelledby="h-exemple"
      >
        <div className="container-page grid items-center gap-10 lg:grid-cols-[320px_1fr]">
          <div className="mx-auto w-56 lg:w-full">
            <BookCoverArt preserveText={false}
              template="creme"
              title="Au fil de Rose"
              subtitle="D'Agen à Toulouse"
              author="Rose Delmas"
              size="lg"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-or">
              Livre exemple
            </p>
            <h2 id="h-exemple" className="mt-2 !text-creme">
              Feuilletez le livre de Rose
            </h2>
            <p className="mt-3 max-w-xl text-lg text-creme/85">
              Six souvenirs, quatre chapitres, des illustrations et un QR audio
              : voici à quoi ressemble un livre Filémoire une fois validé par
              son narrateur.
            </p>
            <blockquote className="mt-6 max-w-xl border-l-2 border-or pl-4 font-serif text-xl italic text-creme">
              « Un vêtement bien fait, c'est celui qu'on ne remarque pas. » J'ai
              mis des années à comprendre qu'elle parlait aussi des gens.
            </blockquote>
            <Button size="lg" variant="accent" className="mt-8" asChild>
              <Link href="/livre-exemple">Ouvrir le livre exemple</Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        className="container-page py-16"
        aria-labelledby="h-offres"
        id="offres"
      >
        <p className="eyebrow">Offres</p>
        <h2 id="h-offres" className="mt-2">
          Un cadeau lisible, un prix clair
        </h2>
        <div className="mt-8">
          <Pricing />
        </div>
      </section>

      <section
        className="border-y border-line bg-white/60 py-16"
        aria-labelledby="h-pourqui"
      >
        <div className="container-page">
          <p className="eyebrow">Pour qui ?</p>
          <h2 id="h-pourqui" className="mt-2">
            Pour toutes les familles qui veulent garder une voix
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(([t, d]) => (
              <div
                key={t}
                className="rounded-lg border border-line bg-white p-5"
              >
                <p className="font-serif text-xl font-semibold text-prune">
                  {t}
                </p>
                <p className="mt-1 text-[15px] text-ink-muted">{d}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-12 text-2xl">Les occasions d'offrir</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <li
                key={o}
                className="rounded-full border border-or bg-white px-4 py-1.5 text-[15px] font-medium text-prune"
              >
                {o}
              </li>
            ))}
          </ul>
          <p className="quote mt-6 text-2xl">
            « Cette année, offrez un livre qui n'existe pas encore. »
          </p>
        </div>
      </section>

      <section
        id="confidentialite"
        className="container-page grid gap-10 py-16 lg:grid-cols-2"
        aria-labelledby="h-conf"
      >
        <div>
          <p className="eyebrow">Confidentialité et contrôle</p>
          <h2 id="h-conf" className="mt-2">
            Le narrateur décide. Toujours.
          </h2>
          <blockquote className="quote mt-6 border-l-2 border-or pl-5 text-2xl leading-snug">
            « Nous ne parlons jamais à la place du narrateur. Nous posons les
            bonnes questions, respectons sa voix et l'aidons à transformer ses
            souvenirs en héritage vivant. »
          </blockquote>
          <p className="mt-3 text-sm text-ink-muted">
            Manifeste de marque Filémoire
          </p>
        </div>
        <ul className="grid gap-3 self-center">
          {[
            [
              "Offrir ne donne pas accès aux souvenirs",
              "La personne qui offre suit l'avancement, pas le contenu.",
            ],
            [
              "Chaque souvenir a sa visibilité",
              "Moi seul·e, mon éditeur familial, ou ma famille.",
            ],
            [
              "Masquer, corriger, supprimer",
              "À tout moment avant la validation du livre.",
            ],
            [
              "Une aide uniquement sur invitation",
              "L'éditeur familial propose ; le narrateur accepte ou refuse.",
            ],
            [
              "L'équipe Filémoire ne lit pas les récits",
              "Sauf autorisation temporaire accordée par le narrateur.",
            ],
          ].map(([t, d]) => (
            <li
              key={t}
              className="flex gap-3 rounded-lg border border-line bg-white p-4"
            >
              <Lock className="mt-1 size-5 shrink-0 text-prune" aria-hidden />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-[15px] text-ink-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="container-page py-8" aria-labelledby="h-faq">
        <h2 id="h-faq">Questions fréquentes</h2>
        <div className="mt-6">
          <Faq />
        </div>
      </section>

      <section
        id="contact"
        className="container-page py-16"
        aria-labelledby="h-contact"
      >
        <GoldRule className="mb-12" />
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="h-contact">Une question ? Parlons-en.</h2>
            <p className="mt-3 text-ink-muted">
              {isLive
                ? "Une question sur votre livre ou un projet familial ? Votre demande est enregistrée pour que l’équipe puisse vous répondre."
                : "Notre équipe répond aux familles, aux entreprises et aux résidences. Dans ce prototype, votre message arrive dans l'espace Support (simulé)."}
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
