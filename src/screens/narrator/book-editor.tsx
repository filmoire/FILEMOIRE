"use client";

import { ArrowDown, ArrowUp, BookOpen, Eye, EyeOff, Pencil, Send, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { EditTextDialog, SuggestionCard, VisibilityPicker } from "@/components/narrator/bits";
import { PhotoImg } from "@/components/media";
import { BookBadge, MemoryBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/nav";
import { isLocked, isLowRes, memoryState, MEMORY_STATE_LABEL, paragraphs, sortedChapters } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Memory } from "@/lib/types";
import { cn, fmtDateTime } from "@/lib/utils";

export function BookEditor() {
  const p = useNarratorProject()!;
  const st = useDemo.getState;
  const locked = isLocked(p);
  const chapters = sortedChapters(p);
  const firstWithContent = chapters.find((c) => p.memories.some((m) => m.chapterId === c.id)) ?? chapters[0];
  const [chId, setChId] = useState(firstWithContent?.id);
  const [selId, setSelId] = useState<string>();
  const [editing, setEditing] = useState<Memory | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [propsOpen, setPropsOpen] = useState(false);
  const ch = chapters.find((c) => c.id === chId) ?? chapters[0];
  const memories = p.memories
    .filter((m) => m.chapterId === ch?.id && (m.status === "terminee" || m.draft))
    .sort((a, b) => (p.questions.find((q) => q.id === a.questionId)?.index ?? 0) - (p.questions.find((q) => q.id === b.questionId)?.index ?? 0));
  const sel = p.memories.find((m) => m.id === selId) ?? memories.find((m) => m.status === "terminee");
  const chPhotos = p.photos.filter((ph) => ph.chapterId === ch?.id && !ph.memoryId).sort((a, b) => a.order - b.order);
  const pending = p.suggestions.filter((s) => s.status === "en_attente");
  const globalPending = pending.filter((s) => s.kind === "ordre_chapitres" || s.kind === "titre_chapitre" || s.kind === "legende_photo");
  const editor = p.editors.find((e) => e.status === "active");
  const hidden = p.memories.filter((m) => m.status === "terminee" && !m.inBook).length;

  const props = sel && sel.status === "terminee" && (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-ink-muted">Souvenir sélectionné</p>
        <p className="quote mt-1 text-lg leading-snug">« {p.questions.find((q) => q.id === sel.questionId)?.text} »</p>
        <div className="mt-2">
          <MemoryBadge s={memoryState(p, sel)} />
        </div>
      </div>
      <VisibilityPicker project={p} memoryId={sel.id} value={sel.visibility} compact disabled={locked} />
      <Switch id="p-inbook" checked={sel.inBook} disabled={locked} onCheckedChange={(v) => { st().setInBook(p.id, sel.id, v); toast(v ? "Réintégré dans le livre" : "Masqué du livre"); }} label="Dans le livre" hint="Masqué : jamais imprimé, jamais visible par les autres." />
      <Switch id="p-approved" checked={sel.approvedByNarrator} disabled={locked || !sel.inBook} onCheckedChange={(v) => { st().setApproved(p.id, sel.id, v); toast(v ? "Marqué comme relu et approuvé" : "Approbation retirée"); }} label="Relu et approuvé" hint="Vous pourrez encore le modifier jusqu'à la validation finale." />
      <div>
        <label htmlFor="p-move" className="text-[15px] font-medium">
          Chapitre
        </label>
        <Select id="p-move" value={sel.chapterId} disabled={locked} onChange={(e) => { st().moveMemory(p.id, sel.id, e.target.value); setChId(e.target.value); toast.success("Souvenir déplacé"); }} className="mt-1.5 h-11">
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>
      {sel.revisions.length > 0 && <p className="text-sm text-ink-muted">{sel.revisions.length} version(s) précédente(s) conservée(s).</p>}
      <Button variant="outline" className="w-full" asChild>
        <Link href={`/narrateur/questions/${sel.questionId}`}>Ouvrir la question</Link>
      </Button>
    </div>
  );

  return (
    <div className="container-page max-w-7xl py-8">
      <PageHeader
        eyebrow="Mon livre"
        title="Éditeur de livre"
        intro="Organisez vos chapitres, relisez vos souvenirs et décidez de ce qui sera imprimé."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/narrateur/chapitres">Gérer les chapitres</Link>
            </Button>
            <Button asChild>
              <Link href="/narrateur/apercu">
                <BookOpen /> Aperçu
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4">
        <span className="text-[15px]">État du livre :</span>
        <BookBadge s={p.book.status} />
        <span className="text-sm text-ink-muted">{hidden} souvenir(s) masqué(s) · {pending.length} suggestion(s) en attente</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {p.book.status === "brouillon" && (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={!editor}
                title={editor ? undefined : "Invitez d'abord un éditeur familial"}
                onClick={() => { const r = st().requestEditorialReview(p.id); if (r.ok) toast.success(`Relecture demandée à ${editor?.name}`); else toast.error(r.error); }}
              >
                <Send /> Demander une relecture{editor ? ` à ${editor.name.split(" ")[0]}` : ""}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { st().startNarratorReview(p.id); toast.success("Relecture finale commencée"); }}>
                Je fais ma relecture finale
              </Button>
            </>
          )}
          {p.book.status === "relecture_editoriale" && (
            <Button size="sm" variant="outline" onClick={() => { st().startNarratorReview(p.id); toast.success("Vous reprenez la main pour la relecture finale"); }}>
              Reprendre la main
            </Button>
          )}
          {p.book.status === "relecture_narrateur" && (
            <Button size="sm" asChild>
              <Link href="/narrateur/apercu#validation">Valider mon livre</Link>
            </Button>
          )}
        </div>
      </div>
      {!editor && p.book.status === "brouillon" && (
        <p className="mt-2 text-sm text-ink-muted">
          Besoin d'aide pour relire ? <Link href="/narrateur/famille">Invitez un éditeur familial</Link> : il ne verra que ce que vous partagez avec lui.
        </p>
      )}
      {p.book.status === "relecture_editoriale" && <Alert tone="info" className="mt-4">{editor?.name ?? "Votre éditeur familial"} relit les souvenirs que vous avez partagés avec lui. Ses propositions apparaîtront ici ; rien ne change sans votre accord.</Alert>}
      {locked && <Alert tone="success" className="mt-4" title="Livre validé">Le contenu est verrouillé. Vous pouvez suivre l'impression dans l'aperçu.</Alert>}

      {globalPending.length > 0 && (
        <section className="mt-6 space-y-3" aria-labelledby="h-sugg">
          <h2 id="h-sugg" className="text-xl">
            Propositions sur l'organisation du livre
          </h2>
          {globalPending.map((s) => (
            <SuggestionCard key={s.id} project={p} s={s} canDecide={!locked} />
          ))}
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr_300px]">
        <nav aria-label="Chapitres du livre" className="lg:sticky lg:top-4 lg:self-start">
          <div className="lg:hidden">
            <label htmlFor="ch-select" className="text-[15px] font-medium">
              Chapitre
            </label>
            <Select id="ch-select" value={ch?.id} onChange={(e) => { setChId(e.target.value); setSelId(undefined); }} className="mt-1.5">
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
          <ol className="hidden space-y-1 lg:block">
            {chapters.map((c, i) => {
              const n = p.memories.filter((m) => m.chapterId === c.id && m.status === "terminee" && m.inBook).length;
              const on = c.id === ch?.id;
              return (
                <li key={c.id} className={cn("group flex items-center rounded-md", on ? "bg-prune text-creme" : "hover:bg-creme-200")}>
                  <button onClick={() => { setChId(c.id); setSelId(undefined); }} aria-current={on ? "true" : undefined} className="flex min-h-11 flex-1 items-center gap-2 px-3 text-left text-[15px]">
                    <span className={cn("font-serif", on ? "text-or-100" : "text-terre")}>{i + 1}</span>
                    <span className="flex-1">{c.title}</span>
                    <span className={cn("text-xs", on ? "text-creme/80" : "text-ink-muted")}>{n}</span>
                  </button>
                  {!locked && (
                    <span className="flex pr-1 opacity-70 group-hover:opacity-100">
                      <button className="rounded p-1 disabled:opacity-30" disabled={i === 0} onClick={() => st().moveChapter(p.id, c.id, -1)} aria-label={`Monter le chapitre ${c.title}`}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button className="rounded p-1 disabled:opacity-30" disabled={i === chapters.length - 1} onClick={() => st().moveChapter(p.id, c.id, 1)} aria-label={`Descendre le chapitre ${c.title}`}>
                        <ArrowDown className="size-4" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="h-chapter" className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="h-chapter" className="text-3xl">
              {ch?.title}
            </h2>
            {!locked && ch && (
              <Button size="sm" variant="ghost" onClick={() => { setTitle(ch.title); setRenaming(true); }}>
                <Pencil /> Renommer
              </Button>
            )}
          </div>
          <div className="mt-5 space-y-5">
            {memories.length === 0 && chPhotos.length === 0 && <p className="rounded-lg border border-dashed border-or bg-white/60 p-6 text-center text-ink-muted">Aucun souvenir dans ce chapitre pour l'instant.</p>}
            {memories.map((m) => {
              const q = p.questions.find((x) => x.id === m.questionId)!;
              const s = memoryState(p, m);
              const textSugg = pending.filter((x) => x.kind === "texte" && x.targetId === m.id);
              const photos = p.photos.filter((ph) => ph.memoryId === m.id).sort((a, b) => a.order - b.order);
              if (m.status !== "terminee")
                return (
                  <article key={m.id} className="rounded-lg border border-dashed border-warning/50 bg-white/70 p-5">
                    <MemoryBadge s="brouillon" />
                    <p className="quote mt-2 text-lg">« {q.text} »</p>
                    <p className="mt-2 text-[15px] text-ink-muted">Brouillon : il n'entrera dans le livre qu'une fois votre réponse enregistrée.</p>
                    <Button size="sm" variant="secondary" className="mt-3" asChild>
                      <Link href={`/narrateur/questions/${q.id}`}>Continuer ma réponse</Link>
                    </Button>
                  </article>
                );
              return (
                <article
                  key={m.id}
                  className={cn("rounded-lg border bg-white p-5 shadow-soft transition-colors sm:p-6", sel?.id === m.id ? "border-prune ring-1 ring-prune" : "border-line", !m.inBook && "border-dashed bg-creme-200/40")}
                  aria-label={`Souvenir : ${q.text} (${MEMORY_STATE_LABEL[s]})`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <MemoryBadge s={s} />
                    <span className="text-xs text-ink-muted">Modifié le {fmtDateTime(m.updatedAt)}</span>
                  </div>
                  <p className="quote mt-3 text-xl leading-snug">« {q.text} »</p>
                  <div className={cn("mt-3 space-y-3 font-serif text-[18px] leading-relaxed", !m.inBook && "text-ink-muted")}>
                    {paragraphs(m.text).map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                  {!m.inBook && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-muted"><EyeOff className="size-4" aria-hidden /> Masqué : ce souvenir ne sera pas imprimé et reste invisible pour les autres.</p>}
                  {photos.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {photos.map((ph) => (
                        <figure key={ph.id} className="w-36">
                          <PhotoImg photo={ph} className="aspect-[4/3] w-full rounded" />
                          <figcaption className="mt-1 text-xs text-ink-muted">
                            {ph.caption || "Sans légende"}
                            {isLowRes(ph) && <span className="block text-warning">Résolution faible</span>}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  {textSugg.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {textSugg.map((x) => (
                        <SuggestionCard key={x.id} project={p} s={x} canDecide={!locked} />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {!locked && (
                      <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                        <Pencil /> Modifier le texte
                      </Button>
                    )}
                    {!locked && (
                      <Button size="sm" variant="outline" onClick={() => { st().setInBook(p.id, m.id, !m.inBook); toast(m.inBook ? "Souvenir masqué du livre" : "Souvenir réintégré dans le livre"); }}>
                        {m.inBook ? <EyeOff /> : <Eye />} {m.inBook ? "Masquer du livre" : "Remettre dans le livre"}
                      </Button>
                    )}
                    <Button size="sm" variant={sel?.id === m.id ? "secondary" : "ghost"} onClick={() => { setSelId(m.id); setPropsOpen(true); }} aria-pressed={sel?.id === m.id}>
                      <Settings2 /> Propriétés
                    </Button>
                  </div>
                </article>
              );
            })}
            {chPhotos.length > 0 && (
              <div className="rounded-lg border border-line bg-white p-5">
                <p className="font-semibold">Photos du chapitre (non rattachées à un souvenir)</p>
                <p className="text-sm text-ink-muted">Elles sont imprimées en fin de chapitre et restent privées pour les autres lecteurs.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {chPhotos.map((ph) => (
                    <figure key={ph.id} className="w-40">
                      <PhotoImg photo={ph} className="aspect-[4/3] w-full rounded" />
                      <figcaption className="mt-1 text-xs text-ink-muted">
                        {ph.caption || "Sans légende"} {!ph.inBook && "· hors du livre"}
                        {isLowRes(ph) && <span className="block text-warning">Résolution faible</span>}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <Link href="/narrateur/photos" className="mt-3 inline-block text-sm">
                  Organiser les photos
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside aria-label="Propriétés du souvenir" className="hidden lg:sticky lg:top-4 lg:block lg:self-start">
          <div className="card p-5">{props || <p className="text-[15px] text-ink-muted">Sélectionnez un souvenir terminé pour régler sa visibilité, son inclusion et son statut.</p>}</div>
        </aside>
      </div>

      <Dialog open={propsOpen && !!props && typeof window !== "undefined" && window.innerWidth < 1024} onOpenChange={setPropsOpen} title="Propriétés du souvenir">
        {props}
      </Dialog>
      {editing && (
        <EditTextDialog
          title="Modifier le texte"
          hint="L'ancienne version est conservée dans l'historique. Une suggestion en attente sur l'ancien texte sera écartée."
          initial={editing.text}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            st().editMemory(p.id, editing.id, t);
            toast.success("Texte mis à jour");
          }}
        />
      )}
      <Dialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renommer le chapitre"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenaming(false)}>Annuler</Button>
            <Button onClick={() => { if (!title.trim()) return toast.error("Le titre ne peut pas être vide."); st().renameChapter(p.id, ch!.id, title); setRenaming(false); toast.success("Chapitre renommé"); }}>Enregistrer</Button>
          </>
        }
      >
        <Field id="rn-title" label="Titre du chapitre">
          <Input id="rn-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
