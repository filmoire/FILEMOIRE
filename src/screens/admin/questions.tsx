"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";
import { CHAPTERS, THEMES } from "@/lib/catalog";
import { useDemo } from "@/lib/store";
import type { ChapterKey, LibraryQuestion, ThemeCode } from "@/lib/types";
import { OpsHeader } from "./shared";

export function AdminQuestions() {
  const lib = useDemo((s) => s.library);
  const [themeF, setThemeF] = useState<ThemeCode | "base">("base");
  const [edit, setEdit] = useState<LibraryQuestion | null>(null);
  const [form, setForm] = useState({ text: "", help: "", status: "a_valider" as LibraryQuestion["status"] });
  const [adding, setAdding] = useState(false);
  const [add, setAdd] = useState({ chapter: "origines" as ChapterKey, text: "", help: "" });
  const [err, setErr] = useState<string>();
  const list = lib.filter((q) => (themeF === "base" ? !q.theme : q.theme === themeF));
  const st = useDemo.getState;
  return (
    <div className="container-page max-w-5xl py-10">
      <OpsHeader title="Bibliothèque de questions" intro="Questions de démonstration à faire valider par la direction éditoriale. Les modifications s'appliquent aux nouveaux parcours, jamais aux parcours en cours." actions={<Button onClick={() => { setAdding(true); setErr(undefined); }}><Plus /> Ajouter une question</Button>} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label htmlFor="th-f" className="text-[15px] font-medium">
          Parcours
        </label>
        <Select id="th-f" value={themeF} onChange={(e) => setThemeF(e.target.value as ThemeCode | "base")} className="h-11 max-w-xs">
          <option value="base">Questions de base ({lib.filter((q) => !q.theme).length})</option>
          {THEMES.filter((t) => t.code !== "vie").map((t) => (
            <option key={t.code} value={t.code}>
              {t.name} ({lib.filter((q) => q.theme === t.code).length})
            </option>
          ))}
        </Select>
        <span className="text-sm text-ink-muted">
          {lib.filter((q) => q.status === "validee").length} validée(s) · {lib.filter((q) => q.status === "a_valider").length} à valider
        </span>
      </div>
      {CHAPTERS.map((c) => {
        const qs = list.filter((q) => q.chapter === c.key);
        if (!qs.length) return null;
        return (
          <section key={c.key} className="mt-8" aria-labelledby={`aq-${c.key}`}>
            <h2 id={`aq-${c.key}`} className="text-2xl">
              {c.title}
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
              {qs.map((q) => (
                <li key={q.id} className="flex flex-wrap items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className={q.active ? "text-ink" : "text-ink-muted line-through"}>{q.text}</p>
                    <p className="text-sm text-ink-muted">{q.help}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.official && <Badge tone="or">Exemple du dossier</Badge>}
                      {q.short && <Badge tone="neutral">Parcours 26</Badge>}
                      <Badge tone={q.status === "validee" ? "success" : "warning"}>{q.status === "validee" ? "Validée" : "À valider"}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id={`act-${q.id}`} checked={q.active} onCheckedChange={(v) => { st().updateLibrary(q.id, { active: v }); toast(v ? "Question activée" : "Question désactivée pour les nouveaux parcours"); }} label={<span className="sr-only">Active</span>} />
                    <Button size="sm" variant="outline" onClick={() => { setEdit(q); setForm({ text: q.text, help: q.help, status: q.status }); setErr(undefined); }}>
                      <Pencil /> Modifier
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <Dialog
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        title="Modifier la question"
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
            <Button onClick={() => { if (form.text.trim().length < 10) return setErr("La question doit faire au moins 10 caractères."); st().updateLibrary(edit!.id, { text: form.text.trim(), help: form.help.trim(), status: form.status }); toast.success("Question mise à jour", { description: "Les parcours déjà commencés ne changent pas." }); setEdit(null); }}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="eq-text" label="Question" error={err}>
            <Textarea id="eq-text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="min-h-[90px]" aria-invalid={!!err} />
          </Field>
          <Field id="eq-help" label="Aide affichée au narrateur">
            <Input id="eq-help" value={form.help} onChange={(e) => setForm({ ...form, help: e.target.value })} />
          </Field>
          <Field id="eq-status" label="Statut éditorial">
            <Select id="eq-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LibraryQuestion["status"] })}>
              <option value="a_valider">À valider</option>
              <option value="validee">Validée par la direction éditoriale</option>
            </Select>
          </Field>
        </div>
      </Dialog>
      <Dialog
        open={adding}
        onOpenChange={setAdding}
        title="Nouvelle question"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>Annuler</Button>
            <Button onClick={() => { if (add.text.trim().length < 10) return setErr("La question doit faire au moins 10 caractères."); st().addLibraryQuestion(add.chapter, add.text, add.help); toast.success("Question ajoutée (à valider)"); setAdding(false); setAdd({ chapter: "origines", text: "", help: "" }); }}>Ajouter</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="nq-ch" label="Chapitre">
            <Select id="nq-ch" value={add.chapter} onChange={(e) => setAdd({ ...add, chapter: e.target.value as ChapterKey })}>
              {CHAPTERS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="nq-text" label="Question" error={err}>
            <Textarea id="nq-text" value={add.text} onChange={(e) => setAdd({ ...add, text: e.target.value })} className="min-h-[90px]" aria-invalid={!!err} />
          </Field>
          <Field id="nq-help" label="Aide" optional>
            <Input id="nq-help" value={add.help} onChange={(e) => setAdd({ ...add, help: e.target.value })} />
          </Field>
          <Alert tone="info">Une nouvelle question est ajoutée aux questions de base, au statut « à valider ».</Alert>
        </div>
      </Dialog>
    </div>
  );
}
