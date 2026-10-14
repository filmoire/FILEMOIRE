"use client";

import { ArrowDown, ArrowUp, ImagePlus, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { PhotoImg } from "@/components/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, putBlob, readImageSize } from "@/lib/media";
import { isLowRes, sortedChapters } from "@/lib/rules";
import { useDemo } from "@/lib/store";
import type { Photo, Project } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const MAX_FILES = 10;

/** Import de photos avec validation (type, taille, nombre, lisibilité). */
export function PhotoUploader({ project, chapterId, memoryId, compact }: { project: Project; chapterId?: string; memoryId?: string; compact?: boolean }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const handle = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length > MAX_FILES) toast.warning(`${MAX_FILES} photos maximum par import`, { description: `Les ${list.length - MAX_FILES} dernières ont été ignorées.` });
    setBusy(true);
    const ok: Pick<Photo, "blobKey" | "width" | "height" | "caption">[] = [];
    const errors: string[] = [];
    let low = 0;
    for (const f of list.slice(0, MAX_FILES)) {
      if (!PHOTO_TYPES.includes(f.type)) {
        errors.push(`« ${f.name} » : format non accepté (JPEG, PNG ou WebP).`);
        continue;
      }
      if (f.size > PHOTO_MAX_BYTES) {
        errors.push(`« ${f.name} » : fichier trop lourd (15 Mo maximum).`);
        continue;
      }
      try {
        const { width, height } = await readImageSize(f);
        const key = uid("blob");
        await putBlob(key, f);
        if (Math.max(width, height) < 1500) low++;
        ok.push({ blobKey: key, width, height, caption: "" });
      } catch {
        errors.push(`« ${f.name} » : image illisible ou endommagée.`);
      }
    }
    if (ok.length) {
      useDemo.getState().addPhotos(project.id, ok, { chapterId, memoryId });
      toast.success(`${ok.length} photo${ok.length > 1 ? "s" : ""} ajoutée${ok.length > 1 ? "s" : ""}`, { description: low ? `${low} photo(s) en résolution faible : elles pourraient être floues à l'impression.` : "Ajoutez une légende pour la retrouver dans le livre." });
    }
    errors.forEach((e) => toast.error("Photo refusée", { description: e }));
    setBusy(false);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files); }}
      className={cn("flex flex-col items-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors", compact ? "p-4" : "p-8", drag ? "border-terre bg-terre-50" : "border-or/70 bg-white")}
    >
      <ImagePlus className="size-8 text-or" aria-hidden />
      <p className="text-[15px] text-ink-muted">{compact ? "Glissez une photo ici, ou" : "Glissez vos photos de famille ici, ou"}</p>
      <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? "Import en cours…" : "Choisir des photos"}
      </Button>
      <input ref={input} type="file" accept={PHOTO_TYPES.join(",")} multiple className="sr-only" aria-label="Choisir des photos" onChange={(e) => void handle(e.target.files).finally(() => (e.target.value = ""))} />
      <p className="text-xs text-ink-muted">JPEG, PNG ou WebP · 15 Mo maximum · {MAX_FILES} photos par import. Stockées uniquement dans ce navigateur (prototype).</p>
    </div>
  );
}

export function PhotoGrid({ project, photos, locked, reorder = true }: { project: Project; photos: Photo[]; locked?: boolean; reorder?: boolean }) {
  const [edit, setEdit] = useState<Photo | null>(null);
  const [confirmNode, ask] = useConfirm();
  const st = useDemo.getState;
  const sorted = photos.slice().sort((a, b) => a.order - b.order);
  return (
    <>
      {confirmNode}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((ph, i) => {
          const mem = project.memories.find((m) => m.id === ph.memoryId);
          const q = mem && project.questions.find((x) => x.id === mem.questionId);
          return (
            <li key={ph.id} className={cn("overflow-hidden rounded-lg border bg-white shadow-soft", ph.inBook ? "border-line" : "border-dashed border-ink-soft opacity-80")}>
              <div className="relative aspect-[4/3] bg-creme-200">
                <PhotoImg photo={ph} className="h-full w-full" />
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  {isLowRes(ph) && (
                    <Badge tone="warning" title={`${ph.width} × ${ph.height} px`}>
                      <TriangleAlert className="size-3" aria-hidden /> Résolution faible
                    </Badge>
                  )}
                  {!ph.inBook && <Badge tone="neutral">Hors du livre</Badge>}
                  {ph.illustration && <Badge tone="info">Illustration démo</Badge>}
                </div>
              </div>
              <div className="space-y-1 p-4">
                <p className="font-serif text-lg leading-snug">{ph.caption || <span className="italic text-ink-muted">Sans légende</span>}</p>
                <p className="text-sm text-ink-muted">
                  {[ph.date, ph.people].filter(Boolean).join(" · ") || "Date et personnes à compléter"}
                </p>
                <p className="line-clamp-2 text-xs text-ink-muted">{q ? `Rattachée à : « ${q.text} »` : `Chapitre : ${project.chapters.find((c) => c.id === ph.chapterId)?.title ?? "aucun"}`}</p>
                {!locked && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEdit(ph)}>
                      <Pencil /> Modifier
                    </Button>
                    {reorder && (
                      <>
                        <Button size="icon" variant="ghost" className="size-9" disabled={i === 0} onClick={() => st().movePhoto(project.id, ph.id, -1)} aria-label="Déplacer avant">
                          <ArrowUp />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-9" disabled={i === sorted.length - 1} onClick={() => st().movePhoto(project.id, ph.id, 1)} aria-label="Déplacer après">
                          <ArrowDown />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="ml-auto size-9 text-danger" onClick={() => ask({ title: "Retirer cette photo ?", body: "Elle sera supprimée de votre photothèque et du livre.", confirm: "Retirer la photo", danger: true, onConfirm: () => { st().removePhoto(project.id, ph.id); toast("Photo retirée"); } })} aria-label="Retirer la photo">
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {edit && <PhotoDialog project={project} photo={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PhotoDialog({ project, photo, onClose }: { project: Project; photo: Photo; onClose: () => void }) {
  const [caption, setCaption] = useState(photo.caption);
  const [date, setDate] = useState(photo.date);
  const [people, setPeople] = useState(photo.people);
  const [link, setLink] = useState(photo.memoryId ? `m:${photo.memoryId}` : photo.chapterId ? `c:${photo.chapterId}` : "");
  const [inBook, setInBook] = useState(photo.inBook);
  const memories = project.memories.filter((m) => m.status === "terminee" || m.draft);
  const save = () => {
    const patch: Parameters<ReturnType<typeof useDemo.getState>["updatePhoto"]>[2] = { caption: caption.trim(), date: date.trim(), people: people.trim(), inBook };
    if (link.startsWith("m:")) patch.memoryId = link.slice(2);
    else {
      patch.memoryId = undefined;
      patch.chapterId = link.startsWith("c:") ? link.slice(2) : undefined;
    }
    useDemo.getState().updatePhoto(project.id, photo.id, patch);
    toast.success("Photo mise à jour");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Modifier la photo" wide footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={save}>Enregistrer</Button></>}>
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <PhotoImg photo={photo} className="aspect-[4/3] w-full rounded-md" />
        <div className="space-y-4">
          <Field id="ph-caption" label="Légende">
            <Input id="ph-caption" value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} placeholder="Ex. : La maison de Douarnenez" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ph-date" label="Date" optional>
              <Input id="ph-date" value={date} maxLength={40} onChange={(e) => setDate(e.target.value)} placeholder="Ex. : été 1957" />
            </Field>
            <Field id="ph-people" label="Personnes" optional>
              <Input id="ph-people" value={people} maxLength={120} onChange={(e) => setPeople(e.target.value)} placeholder="Ex. : Yves et moi" />
            </Field>
          </div>
          <Field id="ph-link" label="Place dans le livre" hint="Une photo rattachée à un souvenir suit sa visibilité. Sans rattachement, elle reste privée.">
            <Select id="ph-link" value={link} onChange={(e) => setLink(e.target.value)}>
              <option value="">Non placée (photothèque seulement)</option>
              <optgroup label="Rattacher à un souvenir">
                {memories.map((m) => (
                  <option key={m.id} value={`m:${m.id}`}>
                    {project.questions.find((q) => q.id === m.questionId)?.text}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Placer dans un chapitre">
                {sortedChapters(project).map((c) => (
                  <option key={c.id} value={`c:${c.id}`}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <Switch id="ph-inbook" checked={inBook} onCheckedChange={setInBook} label="Inclure dans le livre" />
          {isLowRes(photo) && <p className="text-sm text-warning">Résolution {photo.width} × {photo.height} px : la photo risque d'être floue imprimée en grand. Vous pouvez la garder.</p>}
        </div>
      </div>
    </Dialog>
  );
}
