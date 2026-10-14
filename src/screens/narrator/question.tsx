"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock, Mic, PenLine, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { VisibilityPicker } from "@/components/narrator/bits";
import { PhotoGrid, PhotoUploader } from "@/components/narrator/photos";
import { Recorder } from "@/components/narrator/recorder";
import { Recordings } from "@/components/narrator/recordings";
import { MemoryBadge, QuestionBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chapterTitle, pkg } from "@/lib/catalog";
import { Link, useNav, useQueryParam, useRouteParam } from "@/lib/nav";
import { isLocked, memoryState } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/utils";

export function QuestionScreen() {
  const id = useRouteParam("id");
  const p = useNarratorProject()!;
  const q = p.questions.find((x) => x.id === id);
  if (!q)
    return (
      <div className="container-page max-w-2xl py-12">
        <Alert tone="warning" title="Question introuvable" action={<Button asChild><Link href="/narrateur/questions">Mes questions</Link></Button>}>
          Cette question n'existe pas ou ne fait pas partie de votre parcours.
        </Alert>
      </div>
    );
  return <QuestionView key={q.id} />;
}

function QuestionView() {
  const id = useRouteParam("id")!;
  const p = useNarratorProject()!;
  const q = p.questions.find((x) => x.id === id)!;
  const m = p.memories.find((x) => x.questionId === q.id);
  const modeParam = useQueryParam("mode");
  const nav = useNav();
  const st = useDemo.getState;
  const locked = isLocked(p);
  const voice = pkg(p.packageCode).voice;
  const [tab, setTab] = useState<"ecrire" | "voix">("ecrire");
  useEffect(() => {
    if (modeParam === "voix" && voice) setTab("voix");
  }, [modeParam, voice]);
  const [text, setText] = useState(m?.draft ?? m?.text ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [postpone, setPostpone] = useState(false);
  const [confirmNode, ask] = useConfirm();
  const baseline = useRef(m?.draft ?? m?.text ?? "");
  const textRef = useRef(text);
  textRef.current = text;
  const dirty = text !== baseline.current;

  // Le texte inséré depuis une transcription arrive dans le brouillon : on le reflète.
  const draftFromStore = m?.draft;
  useEffect(() => {
    if (draftFromStore !== undefined && draftFromStore !== baseline.current && draftFromStore !== textRef.current) {
      setText(draftFromStore);
      baseline.current = draftFromStore;
    }
  }, [draftFromStore]);

  const flush = useCallback(() => {
    const t = textRef.current;
    if (t !== baseline.current && !locked) {
      st().saveDraft(p.id, q.id, t);
      baseline.current = t;
      setSavedAt(Date.now());
    }
  }, [locked, p.id, q.id, st]);

  // Brouillon automatique toutes les 1,5 s d'inactivité, et à la sortie de la page.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(flush, 1500);
    return () => clearTimeout(t);
  }, [text, dirty, flush]);
  useEffect(() => () => flush(), [flush]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (textRef.current !== baseline.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  const save = () => {
    const r = st().saveAnswer(p.id, q.id, text);
    if (!r.ok) {
      toast.error("Réponse non enregistrée", { description: r.error });
      return;
    }
    baseline.current = text;
    setSavedAt(Date.now());
    toast.success("Votre réponse est enregistrée", { description: "Elle reste privée tant que vous ne la partagez pas." });
  };

  const idx = q.index;
  const prev = p.questions[idx - 1];
  const next = p.questions[idx + 1];
  const mem = p.memories.find((x) => x.questionId === q.id);
  const chapter = p.chapters.find((c) => c.key === q.chapter);

  if (q.status === "verrouillee")
    return (
      <div className="container-page max-w-3xl py-10">
        <Link href="/narrateur/questions" className="inline-flex items-center gap-1 text-[15px]">
          <ArrowLeft className="size-4" /> Mes questions
        </Link>
        <p className="eyebrow mt-6">
          Question {idx + 1} sur {p.questions.length} · {chapterTitle(q.chapter)}
        </p>
        <h1 className="quote mt-3 !font-normal">« {q.text} »</h1>
        <Alert tone="info" className="mt-6" title="Cette question n'est pas encore arrivée" action={<Button onClick={() => { st().requestNextQuestion(p.id); toast.success("Question débloquée"); }}><Sparkles /> La recevoir maintenant</Button>}>
          <span>{q.availableAt < Number.MAX_SAFE_INTEGER ? `Elle arrivera le ${fmtDate(q.availableAt)}, selon votre rythme.` : "Vous avez choisi d'avancer à votre rythme."}</span>{" "}
          <span>Vous pouvez avancer plus vite si vous le souhaitez.</span>
        </Alert>
      </div>
    );

  return (
    <div className="container-page max-w-4xl py-8">
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/narrateur/questions" className="inline-flex items-center gap-1 text-[15px]">
          <ArrowLeft className="size-4" /> Mes questions
        </Link>
        <div className="flex gap-2">
          <QuestionBadge s={q.status} />
          {mem && mem.status === "terminee" && <MemoryBadge s={memoryState(p, mem)} />}
        </div>
      </div>
      <p className="eyebrow mt-6">
        Question {idx + 1} sur {p.questions.length} · {chapter?.title ?? chapterTitle(q.chapter)}
      </p>
      <h1 className="quote mt-3 !font-normal text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">« {q.text} »</h1>
      <p className="mt-3 text-lg text-ink-muted">{q.help}</p>

      {locked && <Alert tone="info" className="mt-6" title="Livre validé">Ce souvenir fait partie du livre approuvé : il ne peut plus être modifié.</Alert>}
      {q.status === "passee" && (
        <Alert tone="info" className="mt-6" title="Vous avez passé cette question" action={!locked && <Button size="sm" variant="secondary" onClick={() => st().reopenQuestion(p.id, q.id)}><RotateCcw /> Y répondre quand même</Button>}>
          Elle n'apparaîtra pas dans votre livre et ne compte pas dans votre progression.
        </Alert>
      )}
      {q.status === "reportee" && (
        <Alert tone="info" className="mt-6" title="Question reportée" action={!locked && <Button size="sm" variant="secondary" onClick={() => st().reopenQuestion(p.id, q.id)}>Y répondre maintenant</Button>}>
          Elle reviendra le {q.postponedUntil ? fmtDate(q.postponedUntil) : "—"}.
        </Alert>
      )}

      {q.status !== "passee" && q.status !== "reportee" && (
        <Tabs value={tab} onValueChange={(v) => { flush(); setTab(v as "ecrire" | "voix"); }} className="mt-8">
          <TabsList aria-label="Façon de répondre">
            <TabsTrigger value="ecrire">
              <PenLine aria-hidden /> Écrire
            </TabsTrigger>
            <TabsTrigger value="voix">
              <Mic aria-hidden /> À voix haute
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ecrire" className="mt-6">
            <label htmlFor="answer" className="text-[15px] font-medium">
              Votre réponse
            </label>
            <Textarea
              id="answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={locked}
              aria-describedby="answer-hint answer-status"
              className="mt-2 min-h-[300px] font-serif text-[19px] leading-relaxed"
              placeholder="Prenez votre temps. Quelques phrases suffisent."
            />
            <p id="answer-hint" className="mt-2 text-sm text-ink-muted">
              Laissez une ligne vide entre deux paragraphes. Votre texte est enregistré en brouillon automatiquement.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="xl" onClick={save} disabled={locked}>
                <Check /> {q.status === "repondue" ? "Enregistrer les modifications" : "Enregistrer ma réponse"}
              </Button>
              <p id="answer-status" className="text-sm text-ink-muted" aria-live="polite">
                {dirty ? "Modifications en cours…" : savedAt ? `Brouillon enregistré à ${fmtTime(savedAt)}` : mem?.status === "terminee" ? `Dernière modification : ${fmtDateTime(mem.updatedAt)}` : mem?.draft ? "Brouillon enregistré" : ""}
              </p>
            </div>
            {mem && mem.revisions.length > 0 && (
              <details className="mt-5 rounded-md border border-line bg-white p-4">
                <summary className="cursor-pointer text-[15px] font-medium text-prune">Versions précédentes ({mem.revisions.length})</summary>
                <ol className="mt-3 space-y-3">
                  {mem.revisions.slice().reverse().map((r, i) => (
                    <li key={i} className="text-[15px]">
                      <p className="text-xs text-ink-muted">
                        {fmtDateTime(r.at)} · avant une modification de {r.by}
                      </p>
                      <p className="mt-1 line-clamp-3 font-serif text-ink-muted">{r.text}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </TabsContent>
          <TabsContent value="voix" className="mt-6 space-y-6">
            {!voice ? (
              <Alert tone="info" title="Enregistrement vocal non inclus">
                La formule {pkg(p.packageCode).name} propose les réponses écrites. Vous pouvez écrire votre souvenir dans l'onglet « Écrire ».
              </Alert>
            ) : (
              <>
                <Recorder projectId={p.id} questionId={q.id} disabled={locked} />
                <Alert tone="sim">La transcription est simulée dans ce prototype. Vous écouterez votre enregistrement et écrirez vous-même le texte : personne n'écrit à votre place.</Alert>
                {mem && <Recordings project={p} memoryId={mem.id} locked={locked} />}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {mem && mem.status === "terminee" && (
        <section className="card mt-10 space-y-5 p-5 sm:p-6" aria-labelledby="h-partage">
          <h2 id="h-partage" className="text-2xl">
            Partage et livre
          </h2>
          <VisibilityPicker project={p} memoryId={mem.id} value={mem.visibility} disabled={locked} />
          <Switch
            id="inbook"
            checked={mem.inBook}
            disabled={locked}
            onCheckedChange={(v) => { st().setInBook(p.id, mem.id, v); toast(v ? "Souvenir réintégré dans le livre" : "Souvenir masqué du livre", { description: v ? undefined : "Il reste dans votre espace, mais n'est ni imprimé ni visible par les autres." }); }}
            label="Inclure ce souvenir dans le livre"
            hint="Masqué, il reste dans votre espace mais n'est ni imprimé ni lisible par quiconque."
          />
        </section>
      )}

      {q.status !== "passee" && (
        <section className="mt-10" aria-labelledby="h-photos">
          <h2 id="h-photos" className="text-2xl">
            Photos de ce souvenir
          </h2>
          <p className="mt-1 text-ink-muted">Elles accompagneront ce texte dans le chapitre « {chapter?.title} ».</p>
          <div className="mt-4 space-y-4">
            {mem && p.photos.some((ph) => ph.memoryId === mem.id) && <PhotoGrid project={p} photos={p.photos.filter((ph) => ph.memoryId === mem.id)} locked={locked} reorder={false} />}
            {!locked && (mem ? <PhotoUploader project={p} chapterId={mem.chapterId} memoryId={mem.id} compact /> : <p className="text-[15px] text-ink-muted">Commencez votre réponse (même quelques mots) pour pouvoir y joindre des photos.</p>)}
          </div>
        </section>
      )}

      {!locked && q.status !== "repondue" && q.status !== "passee" && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
          <Button variant="outline" onClick={() => setPostpone(true)}>
            <Clock /> Reporter
          </Button>
          <Button
            variant="ghost"
            onClick={() => ask({ title: "Passer cette question ?", body: "Elle n'apparaîtra pas dans votre livre. Vous pourrez y revenir plus tard depuis « Mes questions ».", confirm: "Passer la question", onConfirm: () => { flush(); st().skipQuestion(p.id, q.id); toast("Question passée", { description: "Elle ne compte pas dans votre progression." }); if (next) nav.push(`/narrateur/questions/${next.id}`); } })}
          >
            <SkipForward /> Passer cette question
          </Button>
        </div>
      )}

      <nav className="mt-8 flex justify-between gap-2" aria-label="Questions voisines">
        {prev ? (
          <Button variant="ghost" asChild>
            <Link href={`/narrateur/questions/${prev.id}`}>
              <ArrowLeft /> Question précédente
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button variant="ghost" asChild>
            <Link href={`/narrateur/questions/${next.id}`}>
              Question suivante <ArrowRight />
            </Link>
          </Button>
        )}
      </nav>

      <Dialog
        open={postpone}
        onOpenChange={setPostpone}
        title="Reporter cette question"
        description="Elle reviendra automatiquement. En attendant, elle ne vous sera pas rappelée."
      >
        <div className="grid gap-2">
          {[
            [3, "Dans 3 jours"],
            [7, "Dans une semaine"],
            [30, "Dans un mois"],
          ].map(([d, l]) => (
            <Button
              key={d}
              variant="outline"
              size="lg"
              className="justify-start"
              onClick={() => {
                flush();
                st().postponeQuestion(p.id, q.id, d as number);
                setPostpone(false);
                toast.success("Question reportée", { description: `Elle reviendra ${String(l).toLowerCase()}.` });
                nav.push("/narrateur");
              }}
            >
              <CalendarClock /> {l}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
