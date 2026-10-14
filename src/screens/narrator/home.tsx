"use client";

import { BookOpen, CalendarClock, Camera, Mic, PenLine, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { BookCoverArt } from "@/components/book/cover";
import { MemoryBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pkg, theme } from "@/lib/catalog";
import { Link, useNav } from "@/lib/nav";
import { isLocked, memoryState, nextQuestion, progress, sortedChapters } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo, useNow } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

export function NarratorHome() {
  const p = useNarratorProject()!;
  const now = useNow();
  const nav = useNav();
  const pr = progress(p);
  const q = nextQuestion(p);
  const postponed = p.questions.filter((x) => x.status === "reportee");
  const nextLocked = p.questions.find((x) => x.status === "verrouillee");
  const recent = p.memories.filter((m) => m.status === "terminee").sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const pending = p.suggestions.filter((s) => s.status === "en_attente").length;
  const curChapter = q ? sortedChapters(p).find((c) => c.key === q.chapter) : undefined;
  const nextChapter = nextLocked && nextLocked.chapter !== q?.chapter ? sortedChapters(p).find((c) => c.key === nextLocked.chapter) : undefined;
  const hour = new Date(now).getHours();

  return (
    <div className="container-page max-w-5xl py-10">
      <p className="eyebrow">{theme(p.theme).name}</p>
      <h1 className="mt-2">
        {hour < 18 ? "Bonjour" : "Bonsoir"} {p.narrator.firstName}, votre histoire continue.
      </h1>

      {p.deletionRequestedAt && (
        <Alert tone="warning" className="mt-6" title="Demande de suppression en cours" action={<Button size="sm" variant="secondary" asChild><Link href="/narrateur/confidentialite">Gérer ma demande</Link></Button>}>
          Vous avez demandé la suppression de vos contenus le {fmtDate(p.deletionRequestedAt)}. Aucune nouvelle question ne vous sera envoyée.
        </Alert>
      )}
      {pending > 0 && (
        <Alert tone="info" className="mt-6" title={`${pending} proposition${pending > 1 ? "s" : ""} de votre éditeur familial`} action={<Button size="sm" variant="secondary" asChild><Link href="/narrateur/livre">Les examiner</Link></Button>}>
          Rien ne change dans votre livre sans votre accord.
        </Alert>
      )}

      <section className="mt-8" aria-labelledby="h-q">
        {isLocked(p) ? (
          <div className="card p-6 sm:p-8">
            <h2 id="h-q">Votre livre est validé</h2>
            <p className="mt-2 text-lg text-ink-muted">Merci d'avoir raconté. Vous pouvez suivre sa fabrication dans l'aperçu.</p>
            <Button size="lg" className="mt-5" asChild>
              <Link href="/narrateur/apercu">Voir mon livre</Link>
            </Button>
          </div>
        ) : q ? (
          <div className="overflow-hidden rounded-xl border border-or/60 bg-white shadow-lift">
            <div className="border-b border-line bg-or-50/60 px-6 py-3 text-sm font-semibold text-prune sm:px-8">
              {q.status === "brouillon" ? "Vous aviez commencé à répondre" : "Votre question de la semaine"} · {curChapter?.title}
            </div>
            <div className="p-6 sm:p-8">
              <h2 id="h-q" className="quote !font-normal text-[clamp(1.7rem,3.6vw,2.4rem)] leading-tight">
                « {q.text} »
              </h2>
              <p className="mt-3 text-lg text-ink-muted">{q.help}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="xl" onClick={() => nav.push(`/narrateur/questions/${q.id}`)}>
                  <PenLine /> {q.status === "brouillon" ? "Continuer ma réponse" : "Écrire ma réponse"}
                </Button>
                {pkg(p.packageCode).voice && (
                  <Button size="xl" variant="accent" onClick={() => nav.push(`/narrateur/questions/${q.id}?mode=voix`)}>
                    <Mic /> Enregistrer un souvenir
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <h2 id="h-q">Vous êtes à jour</h2>
            <p className="mt-2 text-lg text-ink-muted">
              {nextLocked ? (p.cadenceDays ? `La prochaine question arrivera le ${fmtDate(nextLocked.availableAt)}.` : "Demandez la suivante quand vous voulez.") : "Vous avez parcouru toutes les questions. Bravo !"}
            </p>
            {nextLocked && (
              <Button
                size="lg"
                className="mt-5"
                onClick={() => {
                  const id = useDemo.getState().requestNextQuestion(p.id);
                  if (id) {
                    toast.success("Nouvelle question disponible");
                    nav.push(`/narrateur/questions/${id}`);
                  }
                }}
              >
                <Sparkles /> Recevoir la question suivante maintenant
              </Button>
            )}
          </div>
        )}
      </section>

      {postponed.length > 0 && (
        <Alert tone="info" className="mt-6" title={`${postponed.length} question${postponed.length > 1 ? "s" : ""} reportée${postponed.length > 1 ? "s" : ""}`} action={<Button size="sm" variant="secondary" asChild><Link href="/narrateur/questions?filtre=reportee">Voir</Link></Button>}>
          {postponed[0].postponedUntil ? `« ${postponed[0].text} » reviendra le ${fmtDate(postponed[0].postponedUntil)}.` : "Elles vous attendent quand vous voudrez."}
        </Alert>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_280px]">
        <section className="card p-6" aria-labelledby="h-prog">
          <h2 id="h-prog" className="text-2xl">Mon parcours</h2>
          <p className="mt-1 text-ink-muted">
            <span>{`${pr.answered} question${pr.answered > 1 ? "s" : ""} racontée${pr.answered > 1 ? "s" : ""} sur ${pr.total}`}</span>
            {pr.skipped > 0 && <span>{` · ${pr.skipped} passée${pr.skipped > 1 ? "s" : ""}`}</span>}
            {pr.drafts > 0 && <span>{` · ${pr.drafts} brouillon${pr.drafts > 1 ? "s" : ""}`}</span>}
          </p>
          <Progress value={pr.percent} label="Progression du parcours" className="mt-4 h-3" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button variant="outline" size="lg" asChild>
              <Link href="/narrateur/questions">Toutes mes questions</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/narrateur/photos">
                <Camera /> Mes photos
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/narrateur/apercu">
                <BookOpen /> Aperçu du livre
              </Link>
            </Button>
          </div>
          {nextChapter && (
            <p className="mt-5 flex items-center gap-2 text-[15px] text-ink-muted">
              <CalendarClock className="size-4" aria-hidden /> Prochain chapitre : <strong className="text-ink">{nextChapter.title}</strong>
            </p>
          )}
        </section>
        <Link href="/narrateur/apercu" className="group block no-underline" aria-label="Prévisualiser mon livre">
          <BookCoverArt template={p.book.cover.template} title={p.book.cover.title} subtitle={p.book.cover.subtitle} author={`${p.narrator.firstName} ${p.narrator.lastName}`} className="mx-auto w-48 transition-transform group-hover:-translate-y-1" />
          <p className="mt-3 text-center font-medium text-prune group-hover:underline">Prévisualiser mon livre</p>
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="h-recent">
        <div className="flex items-end justify-between gap-3">
          <h2 id="h-recent" className="text-2xl">Mes derniers souvenirs</h2>
          <Link href="/narrateur/souvenirs" className="text-[15px]">
            Tout voir
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-ink-muted">Vos souvenirs apparaîtront ici après votre première réponse.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {recent.map((m) => (
              <Link key={m.id} href={`/narrateur/questions/${m.questionId}`} className="card block p-5 no-underline hover:border-or">
                <MemoryBadge s={memoryState(p, m)} />
                <p className="quote mt-3 line-clamp-2 text-lg">{p.questions.find((x) => x.id === m.questionId)?.text}</p>
                <p className="mt-2 line-clamp-3 text-[15px] text-ink-muted">{m.text}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
