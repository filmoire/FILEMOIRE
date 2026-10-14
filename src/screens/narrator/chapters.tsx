"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { isLocked, sortedChapters } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Chapter } from "@/lib/types";

export function ChaptersScreen() {
  const p = useNarratorProject()!;
  const locked = isLocked(p);
  const st = useDemo.getState;
  const [rename, setRename] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const chapters = sortedChapters(p);
  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader
        eyebrow="Mon livre"
        title="Mes chapitres"
        intro="Choisissez l'ordre des chapitres et leurs titres. Les chapitres vides n'apparaissent pas dans le livre."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/narrateur/livre">Ouvrir l'éditeur de livre</Link>
          </Button>
        }
      />
      {locked && <Alert tone="info" className="mt-6">Livre validé : l'ordre et les titres sont verrouillés.</Alert>}
      <ol className="mt-8 space-y-3">
        {chapters.map((c, i) => {
          const mems = p.memories.filter((m) => m.chapterId === c.id && m.status === "terminee");
          const inBook = mems.filter((m) => m.inBook).length;
          const photos = p.photos.filter((ph) => ph.chapterId === c.id).length;
          return (
            <li key={c.id} className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <span className="font-serif text-2xl font-semibold text-terre">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl font-semibold text-prune">{c.title}</p>
                <p className="text-sm text-ink-muted">
                  {inBook} souvenir(s) dans le livre{mems.length - inBook ? `, ${mems.length - inBook} masqué(s)` : ""} · {photos} photo(s)
                  {c.key === "libre" && " · chapitre libre"}
                </p>
              </div>
              {!locked && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => st().moveChapter(p.id, c.id, -1)} aria-label={`Monter le chapitre ${c.title}`}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={i === chapters.length - 1} onClick={() => st().moveChapter(p.id, c.id, 1)} aria-label={`Descendre le chapitre ${c.title}`}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setRename(c); setTitle(c.title); }} aria-label={`Renommer le chapitre ${c.title}`}>
                    <Pencil />
                  </Button>
                  {c.key === "libre" && (
                    <Button size="icon" variant="ghost" className="text-danger" onClick={() => { const r = st().deleteChapter(p.id, c.id); if (r.ok) toast("Chapitre supprimé"); else toast.error(r.error); }} aria-label={`Supprimer le chapitre ${c.title}`}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!locked && (
        <form
          className="card mt-6 flex flex-wrap items-end gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return toast.error("Donnez un titre au nouveau chapitre.");
            st().addChapter(p.id, newTitle);
            toast.success("Chapitre ajouté", { description: "Déplacez-y des souvenirs depuis l'éditeur de livre." });
            setNewTitle("");
          }}
        >
          <Field id="new-ch" label="Nouveau chapitre libre" className="min-w-[240px] flex-1">
            <Input id="new-ch" value={newTitle} maxLength={80} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex. : Les étés à Tréboul" />
          </Field>
          <Button type="submit" variant="secondary">
            <Plus /> Ajouter
          </Button>
        </form>
      )}
      <Dialog
        open={!!rename}
        onOpenChange={(o) => !o && setRename(null)}
        title="Renommer le chapitre"
        footer={
          <>
            <Button variant="outline" onClick={() => setRename(null)}>Annuler</Button>
            <Button onClick={() => { if (!title.trim()) return toast.error("Le titre ne peut pas être vide."); st().renameChapter(p.id, rename!.id, title); toast.success("Chapitre renommé"); setRename(null); }}>Enregistrer</Button>
          </>
        }
      >
        <Field id="ch-title" label="Titre">
          <Input id="ch-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
