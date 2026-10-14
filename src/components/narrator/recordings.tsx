"use client";

import { Check, FileText, Loader2, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/confirm";
import { AudioPlayer } from "@/components/media";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { pkg } from "@/lib/catalog";
import { Link } from "@/lib/nav";
import { isSimulatedPlaceholder, useDemo } from "@/lib/store";
import type { AudioRec, Project } from "@/lib/types";
import { fmtDateTime, fmtDuration } from "@/lib/utils";

export function Recordings({ project, memoryId, locked }: { project: Project; memoryId?: string; locked?: boolean }) {
  const audios = project.audios.filter((a) => !memoryId || a.memoryId === memoryId);
  if (!audios.length) return null;
  return (
    <div className="space-y-4">
      {audios.map((a) => (
        <RecordingCard key={a.id} project={project} audio={a} locked={locked} />
      ))}
    </div>
  );
}

function RecordingCard({ project, audio, locked }: { project: Project; audio: AudioRec; locked?: boolean }) {
  const [text, setText] = useState(audio.transcript.text);
  const [editing, setEditing] = useState(false);
  const [confirmNode, ask] = useConfirm();
  const st = useDemo.getState;
  const t = audio.transcript;
  const qrPkg = pkg(project.packageCode).qr;
  const unchanged = isSimulatedPlaceholder(text);
  if (t.status === "a_relire" && !editing && text !== t.text && !text) setText(t.text);
  return (
    <article className="rounded-lg border border-line bg-white p-5">
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          Enregistrement du {fmtDateTime(audio.createdAt)} · {fmtDuration(audio.durationSec)}
          {audio.sample && <span className="ml-2 text-sm font-normal text-ink-muted">(son d'exemple : quelques notes, pas une voix)</span>}
        </p>
        {!locked && (
          <Button size="sm" variant="ghost" onClick={() => ask({ title: "Supprimer cet enregistrement ?", body: "Le son et sa transcription seront supprimés. Le texte de votre réponse n'est pas modifié.", confirm: "Supprimer", danger: true, onConfirm: () => { st().deleteAudio(project.id, audio.id); toast("Enregistrement supprimé"); } })}>
            <Trash2 /> Supprimer
          </Button>
        )}
      </div>
      <div className="mt-3">
        <AudioPlayer audio={audio} label={`Enregistrement du ${fmtDateTime(audio.createdAt)}`} />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-prune">Transcription</p>
          <Badge tone="sim">Simulée</Badge>
          {t.status === "validee" && <Badge tone="success">Relue et validée</Badge>}
        </div>
        {t.status === "en_cours" && (
          <p className="mt-2 flex items-center gap-2 text-[15px] text-ink-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Préparation de la transcription simulée…
          </p>
        )}
        {t.status === "echec" && (
          <Alert tone="warning" className="mt-3" title="La transcription n'a pas abouti" action={<Button size="sm" onClick={() => st().retryTranscription(project.id, audio.id)}><RefreshCw /> Relancer</Button>}>
            Votre enregistrement est bien conservé. Vous pouvez relancer la transcription ou écrire le texte vous-même.
          </Alert>
        )}
        {(t.status === "a_relire" || (t.status === "validee" && editing)) && (
          <div className="mt-3 space-y-3">
            {t.status === "a_relire" && (
              <Alert tone="warning" title="Ce texte n'est pas votre récit">
                Aucune reconnaissance vocale n'est active dans ce prototype. Écoutez l'enregistrement et écrivez vos propres mots ci-dessous. Tant qu'il n'est pas corrigé et validé, ce texte n'apparaît nulle part.
              </Alert>
            )}
            <label htmlFor={`tr-${audio.id}`} className="font-medium">
              Texte de l'enregistrement
            </label>
            <Textarea id={`tr-${audio.id}`} value={text} onChange={(e) => setText(e.target.value)} className="min-h-[160px] font-serif text-lg" disabled={locked} />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={unchanged || !text.trim() || locked}
                onClick={() => {
                  st().saveTranscript(project.id, audio.id, text.trim(), true);
                  setEditing(false);
                  toast.success("Transcription validée", { description: "Vous pouvez maintenant l'insérer dans votre réponse." });
                }}
              >
                <Check /> Valider ce texte
              </Button>
              <Button variant="outline" disabled={locked} onClick={() => { st().saveTranscript(project.id, audio.id, text, false); toast("Brouillon de transcription enregistré"); }}>
                Enregistrer sans valider
              </Button>
              {unchanged && <p className="self-center text-sm text-ink-muted">Remplacez le texte simulé par vos mots pour pouvoir le valider.</p>}
            </div>
          </div>
        )}
        {t.status === "validee" && !editing && (
          <div className="mt-3 space-y-3">
            <p className="whitespace-pre-line rounded-md bg-creme-200/60 p-4 font-serif text-lg">{t.text}</p>
            {!locked && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => { st().insertTranscript(project.id, audio.id); toast.success("Texte ajouté à votre réponse", { description: "Relisez-le dans l'onglet « Écrire », puis enregistrez." }); }}>
                  <FileText /> Insérer dans ma réponse écrite
                </Button>
                <Button variant="ghost" onClick={() => { setText(t.text); setEditing(true); }}>
                  Modifier la transcription
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {qrPkg ? (
          <>
            <Switch
              id={`qr-${audio.id}`}
              checked={audio.qr.enabled}
              disabled={locked}
              onCheckedChange={(v) => { st().setQr(project.id, audio.id, v); toast(v ? "Écoute par QR code autorisée" : "Écoute par QR code désactivée"); }}
              label={<span className="inline-flex items-center gap-2"><QrCode className="size-4" aria-hidden /> Permettre l'écoute via le QR code du livre</span>}
              hint={t.status === "validee" ? "Lien privé : la famille devra saisir votre code famille. Vous pouvez couper l'accès à tout moment, même après l'impression." : "Le QR n'apparaîtra dans le livre qu'une fois la transcription validée."}
            />
            {audio.qr.enabled && (
              <p className="mt-2 text-sm">
                <Link href={`/ecouter/${audio.qr.token}`}>Ouvrir la page d'écoute</Link> · code famille : <strong>{project.privacy.listenCode}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">QR audio dans le livre : inclus dans Filémoire Voix. L'enregistrement reste conservé dans votre espace.</p>
        )}
      </div>
    </article>
  );
}
