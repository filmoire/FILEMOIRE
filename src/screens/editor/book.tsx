"use client";

import { ArrowDown, ArrowUp, CheckCheck, Lock, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { BookViewer } from "@/components/book/viewer";
import { PhotoImg } from "@/components/media";
import { SuggestionCard } from "@/components/narrator/bits";
import { BookBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useRouteParam } from "@/lib/nav";
import { composeBook, isLocked, paragraphs, sortedChapters } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import type { SuggestionKind } from "@/lib/types";
import { useEditorViewer, myAccess } from "./shared";

type Draft = { kind: SuggestionKind; targetId: string; before: string; after: string; label: string; multiline: boolean };

export function EditorBook() {
  const EDITOR_VIEWER = useEditorViewer();
  const id = useRouteParam("id");
  const p = useDemo((s) => s.projects.find((x) => x.id === id));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string>();
  const [order, setOrder] = useState<string[] | null>(null);
  const access = p && myAccess(p, EDITOR_VIEWER.email);
  if (!p || !access || access.status !== "active")
    return (
      <div className="container-page max-w-2xl py-12">
        <Alert tone="privacy" title="Vous n'avez pas accès à ce livre" action={<Button asChild><Link href="/editeur">Retour</Link></Button>}>
          {access?.status === "revoquee" ? "Le narrateur a retiré votre accès. Plus aucun contenu n'est visible." : "Ce livre ne vous a pas été confié, ou l'invitation n'a pas encore été acceptée."}
        </Alert>
      </div>
    );
  const locked = isLocked(p);
  const can = access.canSuggest && !locked;
  const book = composeBook(p, EDITOR_VIEWER);
  const chapters = sortedChapters(p);
  const mine = p.suggestions.filter((s) => s.author === access.name);
  const pendingFor = (targetId: string) => mine.filter((s) => s.targetId === targetId && s.status === "en_attente");
  const sharedPhotos = book.flatMap((b) => b.photos);
  const curOrder = order ?? chapters.map((c) => c.id);

  const open = (d: Draft) => {
    setDraft(d);
    setNote("");
    setErr(undefined);
  };
  const send = () => {
    if (!draft) return;
    const r = useDemo.getState().suggest(p.id, { kind: draft.kind, targetId: draft.targetId, before: draft.before, after: draft.after, note: note.trim() });
    if (!r.ok) return setErr(r.error);
    toast.success("Proposition envoyée", { description: `${p.narrator.firstName} décidera de l'accepter ou non.` });
    setDraft(null);
  };

  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader
        eyebrow="Relecture"
        title={`Le livre de ${p.narrator.firstName}`}
        intro={`Vous voyez ${book.reduce((n, b) => n + b.memories.length, 0)} souvenir(s) partagé(s) avec vous. Les souvenirs privés, masqués ou en brouillon ne vous sont jamais montrés.`}
        actions={<BookBadge s={p.book.status} />}
      />
      {locked && <Alert tone="info" className="mt-6" title="Livre validé">{p.narrator.firstName} a validé son livre : plus aucune proposition n'est possible.</Alert>}
      {!access.canSuggest && !locked && <Alert tone="privacy" className="mt-6">Lecture seule : {p.narrator.firstName} ne vous a pas autorisé à proposer des modifications.</Alert>}
      {p.book.status === "relecture_editoriale" && (
        <Alert tone="info" className="mt-6" title={`${p.narrator.firstName} vous demande une relecture`} action={<Button size="sm" onClick={() => { useDemo.getState().finishEditorialReview(p.id); toast.success("Relecture terminée", { description: `${p.narrator.firstName} est prévenu·e.` }); }}><CheckCheck /> J'ai terminé ma relecture</Button>}>
          Proposez vos corrections, puis signalez la fin de votre relecture.
        </Alert>
      )}

      <Tabs defaultValue="souvenirs" className="mt-8">
        <TabsList aria-label="Sections du livre" className="flex-wrap">
          <TabsTrigger value="souvenirs">Souvenirs partagés</TabsTrigger>
          <TabsTrigger value="chapitres">Chapitres</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
        </TabsList>

        <TabsContent value="souvenirs" className="mt-6 space-y-8">
          {book.length === 0 && <p className="rounded-lg border border-dashed border-or bg-white/60 p-6 text-center text-ink-muted">{p.narrator.firstName} n'a encore partagé aucun souvenir avec vous.</p>}
          {book.map((b) =>
            b.memories.length ? (
              <section key={b.chapter.id} aria-labelledby={`e-${b.chapter.id}`}>
                <h2 id={`e-${b.chapter.id}`} className="text-2xl">
                  {b.chapter.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {b.memories.map(({ memory: m, question }) => (
                    <article key={m.id} className="card p-5 sm:p-6">
                      <p className="quote text-xl">« {question} »</p>
                      <div className="mt-3 space-y-3 font-serif text-[18px] leading-relaxed">
                        {paragraphs(m.text).map((t, i) => (
                          <p key={i}>{t}</p>
                        ))}
                      </div>
                      {pendingFor(m.id).map((s) => (
                        <div key={s.id} className="mt-4">
                          <SuggestionCard project={p} s={s} canDecide={false} />
                        </div>
                      ))}
                      {can && (
                        <Button variant="secondary" size="sm" className="mt-4" onClick={() => open({ kind: "texte", targetId: m.id, before: m.text, after: m.text, label: "Proposer une correction", multiline: true })}>
                          <MessageSquarePlus /> Proposer une correction
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </TabsContent>

        <TabsContent value="chapitres" className="mt-6 space-y-6">
          <p className="text-ink-muted">Proposez un autre ordre ou de nouveaux titres. {p.narrator.firstName} acceptera ou refusera.</p>
          <ol className="space-y-2">
            {curOrder.map((cid, i) => {
              const c = chapters.find((x) => x.id === cid)!;
              return (
                <li key={cid} className="card flex flex-wrap items-center gap-3 p-4">
                  <span className="font-serif text-xl text-terre">{i + 1}</span>
                  <span className="flex-1 font-semibold">{c.title}</span>
                  {pendingFor(cid).length > 0 && <span className="text-sm text-info">Titre proposé : « {pendingFor(cid)[0].after} »</span>}
                  {can && (
                    <>
                      <Button size="icon" variant="ghost" disabled={i === 0} aria-label={`Proposer de monter ${c.title}`} onClick={() => { const o = curOrder.slice(); [o[i - 1], o[i]] = [o[i], o[i - 1]]; setOrder(o); }}>
                        <ArrowUp />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={i === curOrder.length - 1} aria-label={`Proposer de descendre ${c.title}`} onClick={() => { const o = curOrder.slice(); [o[i + 1], o[i]] = [o[i], o[i + 1]]; setOrder(o); }}>
                        <ArrowDown />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => open({ kind: "titre_chapitre", targetId: cid, before: c.title, after: c.title, label: "Proposer un titre", multiline: false })}>
                        Proposer un titre
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          {can && order && order.join() !== chapters.map((c) => c.id).join() && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => open({ kind: "ordre_chapitres", targetId: p.id, before: JSON.stringify(chapters.map((c) => c.id)), after: JSON.stringify(order), label: "Proposer ce nouvel ordre", multiline: false })}>Proposer ce nouvel ordre</Button>
              <Button variant="ghost" onClick={() => setOrder(null)}>
                Annuler
              </Button>
            </div>
          )}
          {mine.filter((s) => s.status === "en_attente" && s.kind === "ordre_chapitres").map((s) => (
            <SuggestionCard key={s.id} project={p} s={s} canDecide={false} />
          ))}
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          {sharedPhotos.length === 0 ? (
            <p className="text-ink-muted">Aucune photo partagée avec vous (les photos suivent la visibilité des souvenirs).</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedPhotos.map((ph) => (
                <li key={ph.id} className="card overflow-hidden">
                  <PhotoImg photo={ph} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <p className="font-serif text-lg">{ph.caption || "Sans légende"}</p>
                    {pendingFor(ph.id).length > 0 && <p className="mt-1 text-sm text-info">Légende proposée : « {pendingFor(ph.id)[0].after} »</p>}
                    {can && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => open({ kind: "legende_photo", targetId: ph.id, before: ph.caption, after: ph.caption, label: "Proposer une légende", multiline: false })}>
                        Proposer une légende
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="apercu" className="mt-6">
          <Alert tone="privacy" className="mb-6">
            <Lock className="mr-1 inline size-4" aria-hidden /> Aperçu limité à ce que {p.narrator.firstName} partage avec vous : le livre imprimé peut contenir d'autres souvenirs.
          </Alert>
          <BookViewer project={p} viewer={EDITOR_VIEWER} watermark="Aperçu" />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        wide={draft?.multiline}
        title={draft?.label ?? ""}
        description={`${p.narrator.firstName} verra vos changements surlignés et décidera.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
            <Button onClick={send}>Envoyer la proposition</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field id="sg-after" label={draft.multiline ? "Texte corrigé" : "Proposition"} error={err}>
              {draft.multiline ? (
                <Textarea id="sg-after" value={draft.after} onChange={(e) => setDraft({ ...draft, after: e.target.value })} className="min-h-[260px] font-serif text-lg" aria-invalid={!!err} />
              ) : (
                <Input id="sg-after" value={draft.after} maxLength={140} onChange={(e) => setDraft({ ...draft, after: e.target.value })} aria-invalid={!!err} />
              )}
            </Field>
            <Field id="sg-note" label="Un mot pour expliquer" optional>
              <Input id="sg-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : d'après le livret de famille…" />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}
