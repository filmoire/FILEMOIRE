"use client";

import { Camera, EyeOff, Headphones, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { Recordings } from "@/components/narrator/recordings";
import { MemoryBadge } from "@/components/status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { pkg } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { isLocked, memoryState, sortedChapters, VISIBILITY_LABEL, type MemoryState } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Visibility } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

export function MemoriesScreen() {
  const p = useNarratorProject()!;
  const [filter, setFilter] = useState<MemoryState | "">("");
  const [confirmNode, ask] = useConfirm();
  const locked = isLocked(p);
  const st = useDemo.getState;
  const chapters = sortedChapters(p);
  const list = p.memories
    .filter((m) => m.status === "terminee" || m.draft)
    .filter((m) => !filter || memoryState(p, m) === filter)
    .sort((a, b) => (p.questions.find((q) => q.id === a.questionId)?.index ?? 0) - (p.questions.find((q) => q.id === b.questionId)?.index ?? 0));
  return (
    <div className="container-page max-w-5xl py-10">
      {confirmNode}
      <PageHeader eyebrow="Mes souvenirs" title="Tout ce que vous avez raconté" intro="Pour chaque souvenir : qui peut le lire, s'il va dans le livre, et ses enregistrements." />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label htmlFor="mf" className="text-[15px] font-medium">
          Afficher
        </label>
        <Select id="mf" value={filter} onChange={(e) => setFilter(e.target.value as MemoryState | "")} className="h-11 max-w-xs">
          <option value="">Tous les souvenirs ({p.memories.filter((m) => m.status === "terminee" || m.draft).length})</option>
          <option value="brouillon">Brouillons</option>
          <option value="prive">Privés</option>
          <option value="partage">Partagés</option>
          <option value="en_relecture">En relecture</option>
          <option value="approuve">Approuvés</option>
          <option value="masque">Masqués du livre</option>
        </Select>
      </div>
      <div className="mt-6 space-y-4">
        {list.length === 0 && (
          <EmptyState title="Aucun souvenir ici" action={<Button asChild><Link href="/narrateur">Répondre à ma question</Link></Button>}>
            Vos réponses apparaîtront ici dès que vous aurez commencé.
          </EmptyState>
        )}
        {list.map((m) => {
          const q = p.questions.find((x) => x.id === m.questionId)!;
          const audios = p.audios.filter((a) => a.memoryId === m.id);
          const photos = p.photos.filter((ph) => ph.memoryId === m.id);
          const s = memoryState(p, m);
          return (
            <article key={m.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <MemoryBadge s={s} />
                <span>{chapters.find((c) => c.id === m.chapterId)?.title}</span>
                <span>· modifié le {fmtDate(m.updatedAt)}</span>
                {audios.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    · <Headphones className="size-4" aria-hidden /> {audios.length}
                  </span>
                )}
                {photos.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    · <Camera className="size-4" aria-hidden /> {photos.length}
                  </span>
                )}
              </div>
              <h2 className="quote mt-2 !font-normal text-xl">« {q.text} »</h2>
              <p className="mt-2 line-clamp-3 whitespace-pre-line font-serif text-[17px] text-ink/90">{m.status === "terminee" ? m.text : m.draft}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/narrateur/questions/${q.id}`}>
                    <Pencil /> {m.status === "terminee" ? "Ouvrir" : "Continuer"}
                  </Link>
                </Button>
                {m.status === "terminee" && (
                  <>
                    <label className="sr-only" htmlFor={`v-${m.id}`}>
                      Qui peut lire ce souvenir
                    </label>
                    <Select id={`v-${m.id}`} value={m.visibility} disabled={locked} onChange={(e) => { st().setVisibility(p.id, m.id, e.target.value as Visibility); toast.success("Visibilité mise à jour"); }} className="h-9 w-auto text-sm">
                      {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => (
                        <option key={v} value={v}>
                          Lisible par : {VISIBILITY_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                    <Button variant="ghost" size="sm" disabled={locked} onClick={() => { st().setInBook(p.id, m.id, !m.inBook); toast(m.inBook ? "Masqué du livre" : "Réintégré dans le livre"); }}>
                      <EyeOff /> {m.inBook ? "Masquer du livre" : "Remettre dans le livre"}
                    </Button>
                  </>
                )}
                {!locked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-danger"
                    onClick={() => ask({ title: "Supprimer ce souvenir ?", body: "Le texte, ses enregistrements et ses suggestions seront supprimés. Les photos restent dans votre photothèque. La question redeviendra disponible.", confirm: "Supprimer définitivement", danger: true, onConfirm: () => { st().deleteMemory(p.id, m.id); toast("Souvenir supprimé"); } })}
                  >
                    <Trash2 /> Supprimer
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {pkg(p.packageCode).voice && p.audios.length > 0 && (
        <section className="mt-12" aria-labelledby="h-audios">
          <h2 id="h-audios" className="text-2xl">
            Mes enregistrements ({p.audios.length})
          </h2>
          {pkg(p.packageCode).qr && p.privacy.listenCode && (
            <Alert tone="privacy" className="mt-3">
              Code famille pour écouter les QR audio : <strong>{p.privacy.listenCode}</strong>. Communiquez-le uniquement aux personnes de votre choix (page « Famille » pour le changer).
            </Alert>
          )}
          <div className="mt-4">
            <Recordings project={p} locked={locked} />
          </div>
        </section>
      )}
    </div>
  );
}
