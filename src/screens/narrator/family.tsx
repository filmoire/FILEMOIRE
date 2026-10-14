"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, UserMinus, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { useConfirm } from "@/components/confirm";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { pkg } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { VISIBILITY_LABEL } from "@/lib/rules";
import { FAMILY } from "@/lib/seed";
import { useNarratorProject } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Visibility } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez le prénom et le nom de la personne."),
  email: z.string().trim().email("Cette adresse e-mail ne semble pas valide (exemple : prenom@domaine.fr)."),
  canSuggest: z.boolean(),
});

export function FamilyScreen() {
  const p = useNarratorProject()!;
  const st = useDemo.getState;
  const [confirmNode, ask] = useConfirm();
  const editor = p.editors.find((e) => e.status !== "revoquee");
  const revoked = p.editors.filter((e) => e.status === "revoquee");
  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", canSuggest: true } });
  const e = formState.errors;
  const submit = handleSubmit((v) => {
    const r = st().inviteEditor(p.id, v.name, v.email, v.canSuggest);
    if (!r.ok) return toast.error("Invitation impossible", { description: r.error });
    toast.success(`Invitation envoyée à ${v.name}`, { description: "Démo : l'e-mail est dans le menu « E-mails »." });
    reset();
  });
  const counts = (Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => [v, p.memories.filter((m) => m.status === "terminee" && m.visibility === v).length] as const);
  return (
    <div className="container-page max-w-4xl py-10">
      {confirmNode}
      <PageHeader eyebrow="Famille et partage" title="Qui vous aide, qui vous lit" intro="Vous gardez la main : chaque personne ne voit que ce que vous lui partagez." />

      <section className="card mt-8 p-5 sm:p-7" aria-labelledby="h-editor">
        <h2 id="h-editor" className="text-2xl">
          Éditeur familial
        </h2>
        <p className="mt-1 text-ink-muted">Un proche qui vous aide à relire et organiser. Il propose ; vous décidez.</p>
        {editor ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-prune font-semibold text-creme" aria-hidden>
                {editor.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </span>
              <div>
                <p className="text-lg font-semibold">{editor.name}</p>
                <p className="text-sm text-ink-muted">{editor.email}</p>
              </div>
              <Badge tone={editor.status === "active" ? "success" : "warning"} className="ml-auto">
                {editor.status === "active" ? `Actif depuis le ${fmtDate(editor.acceptedAt!)}` : "Invitation en attente"}
              </Badge>
            </div>
            {editor.status === "invitee" && (
              <Alert tone="info" action={<Button size="sm" variant="secondary" asChild><Link href={`/invitation/${editor.token}`}><Mail /> Démo : ouvrir son invitation</Link></Button>}>
                {editor.name} doit accepter l'invitation reçue par e-mail.
              </Alert>
            )}
            <Switch id="can-suggest" checked={editor.canSuggest} onCheckedChange={(v) => { st().setEditorCanSuggest(p.id, editor.id, v); toast(v ? "Propositions autorisées" : "Lecture seule"); }} label="Peut proposer des corrections" hint="Désactivé : lecture seule des souvenirs partagés." />
            <ul className="space-y-1 text-[15px] text-ink-muted">
              <li>• Il lit uniquement les souvenirs « {VISIBILITY_LABEL.editeur} » ou « {VISIBILITY_LABEL.famille} ».</li>
              <li>• Il ne voit jamais les brouillons, les souvenirs privés ni les souvenirs masqués.</li>
              <li>• Il ne peut pas valider le livre.</li>
            </ul>
            <Button variant="danger-outline" onClick={() => ask({ title: `Retirer l'accès de ${editor.name} ?`, body: "Il ou elle ne pourra plus rien lire, immédiatement. Ses propositions en attente seront écartées.", confirm: "Retirer l'accès", danger: true, onConfirm: () => { st().revokeEditor(p.id, editor.id); toast("Accès retiré"); } })}>
              <UserMinus /> Retirer l'accès
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="ed-name" label="Prénom et nom" error={e.name?.message}>
              <Input id="ed-name" aria-invalid={!!e.name} aria-describedby={describedBy("ed-name", false, e.name)} {...register("name")} />
            </Field>
            <Field id="ed-email" label="Adresse e-mail" error={e.email?.message}>
              <Input id="ed-email" type="email" aria-invalid={!!e.email} aria-describedby={describedBy("ed-email", false, e.email)} {...register("email")} />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox id="ed-sugg" checked={watch("canSuggest")} onChange={(v) => setValue("canSuggest", v)}>
                Autoriser cette personne à proposer des corrections
              </Checkbox>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" size="lg">
                <UserPlus /> Envoyer l'invitation
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setValue("name", FAMILY.editor.name); setValue("email", FAMILY.editor.email); }}>
                Démo : Thomas Martin (fictif)
              </Button>
            </div>
          </form>
        )}
        {revoked.length > 0 && <p className="mt-4 text-sm text-ink-muted">Accès retirés : {revoked.map((r) => r.name).join(", ")}.</p>}
      </section>

      <section className="card mt-6 p-5 sm:p-7" aria-labelledby="h-share">
        <h2 id="h-share" className="text-2xl">
          Ce que chacun peut lire
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {counts.map(([v, n]) => (
            <li key={v} className="rounded-lg bg-creme-200 p-4">
              <p className="font-serif text-3xl font-semibold text-prune">{n}</p>
              <p className="text-sm">souvenir(s) « {VISIBILITY_LABEL[v]} »</p>
            </li>
          ))}
        </ul>
        <Switch id="buyer-progress" checked={p.privacy.buyerSeesProgress} onCheckedChange={(v) => { st().setPrivacy(p.id, { buyerSeesProgress: v }); toast(v ? `${p.buyerName} voit votre progression` : "Progression masquée"); }} label={`${p.buyerName} peut voir ma progression`} hint="Uniquement le nombre de questions racontées." />
        <Button variant="link" asChild>
          <Link href="/narrateur/souvenirs">Changer la visibilité de mes souvenirs</Link>
        </Button>
      </section>

      {pkg(p.packageCode).qr && (
        <section className="card mt-6 p-5 sm:p-7" aria-labelledby="h-code">
          <h2 id="h-code" className="flex items-center gap-2 text-2xl">
            <KeyRound className="size-6 text-terre" aria-hidden /> Code famille pour les QR audio
          </h2>
          <p className="mt-1 text-ink-muted">Les QR imprimés dans le livre demandent ce code avant de faire écouter votre voix.</p>
          <p className="mt-4 font-mono text-3xl tracking-[0.3em] text-prune">{p.privacy.listenCode ?? "— — —"}</p>
          <Button variant="secondary" className="mt-4" onClick={() => { st().renewListenCode(p.id); toast.success("Nouveau code créé", { description: "L'ancien code ne fonctionne plus." }); }}>
            {p.privacy.listenCode ? "Changer le code" : "Créer un code"}
          </Button>
        </section>
      )}
    </div>
  );
}
