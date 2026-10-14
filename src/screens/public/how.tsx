"use client";

import { BellRing, CalendarDays, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { CHAPTERS, THEMES } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { RolesRow, Timeline } from "./sections";

export function HowScreen() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Comment ça marche" title="De la première question au livre imprimé" intro="Le parcours implique la personne qui offre, le narrateur et parfois un éditeur familial. Les autorisations et responsabilités de chacun sont explicites." />
      <div className="mt-10">
        <Timeline />
      </div>
      <h2 className="mt-14">Qui fait quoi ?</h2>
      <div className="mt-5">
        <RolesRow />
      </div>
      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section>
          <h2>Dix chapitres, un rythme doux</h2>
          <p className="mt-3 text-ink-muted">Les questions ouvrent des souvenirs concrets sans forcer les confidences. Le narrateur peut ignorer, modifier ou reporter une question.</p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {CHAPTERS.map((c, i) => (
              <li key={c.key} className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3">
                <span className="font-serif text-lg font-semibold text-terre">{i + 1}</span> {c.title}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2>Des parcours thématiques</h2>
          <p className="mt-3 text-ink-muted">26 ou 52 questions selon la formule, avec un fil conducteur.</p>
          <ul className="mt-5 space-y-2">
            {THEMES.map((t) => (
              <li key={t.code} className="rounded-md border border-line bg-white px-4 py-3">
                <p className="font-semibold text-prune">{t.name}</p>
                <p className="text-sm text-ink-muted">{t.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-4">
        {[
          [CalendarDays, "Une question par semaine", "Le rythme se règle : chaque semaine, tous les 3 jours, ou à la demande."],
          [BellRing, "Relance douce", "Deux rappels au maximum, désactivables. Jamais de culpabilisation."],
          [Mic, "Écrire ou parler", "La voix est conservée ; sa transcription est toujours relue par le narrateur."],
          [ShieldCheck, "Validation finale", "Rien n'est imprimé sans l'accord explicite du narrateur."],
        ].map(([I, t, d]) => {
          const Icon = I as typeof CalendarDays;
          return (
            <div key={t as string} className="rounded-lg border border-line bg-white p-5">
              <Icon className="size-6 text-terre" aria-hidden />
              <p className="mt-3 font-serif text-xl font-semibold text-prune">{t as string}</p>
              <p className="mt-1 text-[15px] text-ink-muted">{d as string}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href="/offres">Voir les offres</Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/livre-exemple">Voir un livre exemple</Link>
        </Button>
      </div>
    </div>
  );
}
