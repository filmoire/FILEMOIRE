"use client";

import { ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { useNarratorProject } from "@/lib/session";
import { useDemo, useNow } from "@/lib/store";
import type { Visibility } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export function PrivacyScreen() {
  const p = useNarratorProject()!;
  const now = useNow();
  const st = useDemo.getState;
  const [confirmNode, ask] = useConfirm();
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [err, setErr] = useState<string>();
  const editor = p.editors.find((e) => e.status === "active");
  const supportActive = !!p.privacy.supportAccessUntil && p.privacy.supportAccessUntil > now;
  return (
    <div className="container-page max-w-4xl py-10">
      {confirmNode}
      <PageHeader eyebrow="Confidentialité" title="Vos souvenirs, vos règles" intro="Tous ces réglages se modifient à tout moment." />
      <Alert tone="sim" className="mt-6">
        Prototype : ces protections sont démontrées dans le navigateur. En production, elles seront appliquées par le serveur (contrôle d'accès, stockage chiffré, journal des accès, procédure de suppression) et relues par un juriste.
      </Alert>

      <section className="card mt-6 space-y-6 p-5 sm:p-7" aria-labelledby="h-pref">
        <h2 id="h-pref" className="text-2xl">
          Préférences
        </h2>
        <ChoiceCards<Visibility>
          name="pv-def"
          legend="Visibilité par défaut de mes nouveaux souvenirs"
          value={p.privacy.defaultVisibility}
          onChange={(v) => { st().setPrivacy(p.id, { defaultVisibility: v }); toast.success("Préférence enregistrée"); }}
          columns={3}
          options={[
            { value: "moi", title: "Moi seul·e" },
            { value: "editeur", title: "Mon éditeur familial" },
            { value: "famille", title: "Ma famille" },
          ]}
        />
        <Switch id="pv-progress" checked={p.privacy.buyerSeesProgress} onCheckedChange={(v) => st().setPrivacy(p.id, { buyerSeesProgress: v })} label={`${p.buyerName} peut voir ma progression`} hint="Le nombre de questions racontées, jamais le contenu." />
        <Switch id="pv-rem" checked={p.privacy.reminders === "douces"} onCheckedChange={(v) => st().setPrivacy(p.id, { reminders: v ? "douces" : "aucune" })} label="Rappels doux" hint="Deux rappels au maximum par question." />
        <div>
          <label htmlFor="pv-cad" className="font-medium">
            Rythme des questions
          </label>
          <Select id="pv-cad" value={String(p.cadenceDays)} onChange={(e) => { st().setCadence(p.id, Number(e.target.value)); toast.success("Rythme mis à jour"); }} className="mt-2 max-w-sm">
            <option value="7">Une question par semaine</option>
            <option value="3">Tous les 3 jours</option>
            <option value="14">Toutes les deux semaines</option>
            <option value="0">À mon rythme</option>
          </Select>
        </div>
        <Switch id="pv-mkt" checked={p.privacy.marketing} onCheckedChange={(v) => { st().setPrivacy(p.id, { marketing: v }); toast(v ? "Vous recevrez nos nouvelles" : "Plus aucune communication commerciale"); }} label="Recevoir des nouvelles de Filémoire" hint="Consentement facultatif, retirable à tout moment." />
      </section>

      <section className="card mt-6 p-5 sm:p-7" aria-labelledby="h-who">
        <h2 id="h-who" className="text-2xl">
          Qui voit quoi ?
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[15px]">
            <caption className="sr-only">Droits de lecture par personne</caption>
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-4 font-medium">Personne</th>
                <th className="py-2 pr-4 font-medium">Peut lire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-3 pr-4 font-semibold">Vous</td>
                <td className="py-3">Tout, y compris brouillons et contenus masqués.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">{editor ? editor.name : "Éditeur familial"}</td>
                <td className="py-3">{editor ? "Les souvenirs partagés avec l'éditeur ou la famille, ni masqués ni brouillons." : "Personne n'est invité pour l'instant."}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">{p.buyerName}</td>
                <td className="py-3">Les souvenirs partagés « avec la famille »{p.privacy.buyerSeesProgress ? ", et votre progression (sans contenu)." : "."}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Équipe Filémoire</td>
                <td className="py-3">{supportActive ? `Votre manuscrit, jusqu'au ${fmtDateTime(p.privacy.supportAccessUntil!)} (accès que vous avez accordé).` : "Uniquement des informations techniques (statuts, dates). Jamais vos récits sans votre autorisation."}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 p-5 sm:p-7" aria-labelledby="h-support">
        <h2 id="h-support" className="flex items-center gap-2 text-2xl">
          <ShieldCheck className="size-6 text-terre" aria-hidden /> Accès temporaire du support
        </h2>
        <p className="mt-1 text-ink-muted">Si vous avez besoin d'aide sur un problème précis, vous pouvez autoriser l'équipe Filémoire à lire votre manuscrit pendant une durée limitée.</p>
        {supportActive ? (
          <Alert tone="warning" className="mt-4" title={`Accès ouvert jusqu'au ${fmtDateTime(p.privacy.supportAccessUntil!)}`} action={<Button size="sm" variant="danger-outline" onClick={() => { st().revokeSupport(p.id); toast("Accès du support fermé"); }}>Fermer l'accès maintenant</Button>}>
            Motif : {p.privacy.supportAccessReason}
          </Alert>
        ) : (
          <form
            className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5) return setErr("Précisez en quelques mots pourquoi le support a besoin de lire (5 caractères minimum).");
              setErr(undefined);
              st().grantSupport(p.id, Number(hours), reason.trim());
              toast.success("Accès temporaire accordé", { description: "Vous pouvez le fermer à tout moment." });
              setReason("");
            }}
          >
            <Field id="sp-reason" label="Motif" error={err}>
              <Textarea id="sp-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[80px]" placeholder="Ex. : un chapitre ne s'affiche pas correctement" aria-invalid={!!err} />
            </Field>
            <Field id="sp-hours" label="Durée">
              <Select id="sp-hours" value={hours} onChange={(e) => setHours(e.target.value)}>
                <option value="24">24 heures</option>
                <option value="72">72 heures</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary">
                Autoriser temporairement
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="card mt-6 border-danger/30 p-5 sm:p-7" aria-labelledby="h-del">
        <h2 id="h-del" className="flex items-center gap-2 text-2xl">
          <ShieldAlert className="size-6 text-danger" aria-hidden /> Supprimer mes contenus
        </h2>
        {p.deletionRequestedAt ? (
          <Alert tone="warning" className="mt-4" title={`Demande envoyée le ${fmtDate(p.deletionRequestedAt)}`} action={<Button size="sm" variant="secondary" onClick={() => { st().cancelDeletion(p.id); toast.success("Demande annulée"); }}>Annuler ma demande</Button>}>
            Vous pouvez l'annuler pendant 14 jours. Prototype : aucune suppression définitive n'est exécutée.
          </Alert>
        ) : (
          <>
            <p className="mt-1 text-ink-muted">Vous pouvez demander la suppression de vos réponses, enregistrements et photos. Pour supprimer un seul souvenir, utilisez « Mes souvenirs ».</p>
            <Button
              variant="danger-outline"
              className="mt-4"
              onClick={() => ask({ title: "Demander la suppression de tous vos contenus ?", body: "Vos réponses, enregistrements et photos seront supprimés après un délai de 14 jours pendant lequel vous pourrez annuler. Le livre ne pourra plus être imprimé.", confirm: "Envoyer ma demande", danger: true, onConfirm: () => { st().requestDeletion(p.id); toast("Demande de suppression envoyée"); } })}
            >
              <Trash2 /> Demander la suppression
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
