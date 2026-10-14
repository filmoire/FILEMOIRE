"use client";

import { Mic, Pause, Play, RotateCcw, Save, Square, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AUDIO_MAX_BYTES, putBlob, readAudioDuration } from "@/lib/media";
import { useDemo } from "@/lib/store";
import { fmtDuration, uid } from "@/lib/utils";

type RecState =
  | { k: "idle" }
  | { k: "asking" }
  | { k: "recording"; paused: boolean }
  | { k: "recorded"; blob: Blob; url: string; dur: number; mime: string }
  | { k: "error"; code: "denied" | "nodevice" | "unsupported" | "insecure" | "other" };

const MESSAGES: Record<Extract<RecState, { k: "error" }>["code"], [string, string]> = {
  denied: ["Le micro n'est pas autorisé", "Votre navigateur a refusé l'accès au micro. Cliquez sur l'icône du cadenas à côté de l'adresse du site, autorisez le micro, puis réessayez. Vous pouvez aussi écrire votre réponse."],
  nodevice: ["Aucun micro détecté", "Branchez un micro ou un casque, ou utilisez un téléphone. Vous pouvez aussi importer un fichier audio ou écrire votre réponse."],
  unsupported: ["Enregistrement impossible dans ce navigateur", "Ce navigateur ne permet pas d'enregistrer le son. Essayez une version récente de Chrome, Edge, Firefox ou Safari, ou importez un fichier audio."],
  insecure: ["Connexion non sécurisée", "Le micro n'est disponible que sur une page sécurisée (https)."],
  other: ["L'enregistrement n'a pas pu démarrer", "Réessayez dans un instant. Si le problème continue, écrivez votre réponse ou importez un fichier audio."],
};

const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac"];

/** Enregistreur vocal (MediaRecorder) avec pause, réécoute et repli « exemple ». */
export function Recorder({ projectId, questionId, disabled }: { projectId: string; questionId: string; disabled?: boolean }) {
  const [st, setSt] = useState<RecState>({ k: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const start = async () => {
    if (typeof window === "undefined" || !window.isSecureContext) return setSt({ k: "error", code: "insecure" });
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setSt({ k: "error", code: "unsupported" });
    setSt({ k: "asking" });
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mr = new MediaRecorder(s);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setSt({ k: "recorded", blob, url: URL.createObjectURL(blob), dur: elapsedRef.current, mime: blob.type });
      };
      rec.current = mr;
      mr.start(250);
      setElapsed(0);
      elapsedRef.current = 0;
      timer.current = setInterval(() => {
        if (rec.current?.state === "recording") {
          elapsedRef.current += 1;
          setElapsed(elapsedRef.current);
        }
      }, 1000);
      setSt({ k: "recording", paused: false });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setSt({ k: "error", code: name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "nodevice" : "other" });
    }
  };
  const elapsedRef = useRef(0);
  const pause = () => {
    const mr = rec.current;
    if (!mr) return;
    if (mr.state === "recording" && typeof mr.pause === "function") {
      mr.pause();
      setSt({ k: "recording", paused: true });
    } else if (mr.state === "paused") {
      mr.resume();
      setSt({ k: "recording", paused: false });
    }
  };
  const stop = () => rec.current?.state !== "inactive" && rec.current?.stop();
  const reset = () => {
    if (st.k === "recorded") URL.revokeObjectURL(st.url);
    setSt({ k: "idle" });
    setElapsed(0);
  };
  const save = async () => {
    if (st.k !== "recorded") return;
    const key = uid("blob");
    await putBlob(key, st.blob);
    useDemo.getState().addAudio(projectId, questionId, { blobKey: key, mime: st.mime, durationSec: Math.max(1, st.dur) });
    toast.success("Enregistrement sauvegardé", { description: "Une transcription simulée est en préparation : vous la relirez." });
    setSt({ k: "idle" });
  };
  const sample = () => {
    useDemo.getState().addAudio(projectId, questionId, { src: "/demo/exemple-enregistrement.wav", mime: "audio/wav", durationSec: 6, sample: true });
    toast.success("Enregistrement d'exemple ajouté", { description: "Quelques notes de musique, pas une voix. Transcription simulée en préparation." });
    setSt({ k: "idle" });
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") || (f.type && !AUDIO_TYPES.some((t) => f.type.startsWith(t.split(";")[0])))) {
      toast.error("Ce fichier n'est pas un enregistrement audio pris en charge", { description: "Formats acceptés : MP3, M4A, WAV, OGG, WebM." });
      return;
    }
    if (f.size > AUDIO_MAX_BYTES) {
      toast.error("Fichier trop volumineux", { description: "50 Mo maximum (environ 45 minutes)." });
      return;
    }
    const dur = await readAudioDuration(f);
    if (!dur) {
      toast.error("Ce fichier audio semble illisible", { description: "Essayez un autre fichier ou enregistrez directement." });
      return;
    }
    const key = uid("blob");
    await putBlob(key, f);
    useDemo.getState().addAudio(projectId, questionId, { blobKey: key, mime: f.type, durationSec: Math.round(dur) });
    toast.success("Fichier audio ajouté");
  };

  if (disabled) return null;

  return (
    <div className="rounded-lg border border-line bg-white p-5 sm:p-6">
      {st.k === "idle" || st.k === "asking" ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <Button size="xl" variant="accent" onClick={start} disabled={st.k === "asking"} className="h-16 rounded-full px-10 text-lg">
            <Mic /> {st.k === "asking" ? "Autorisation du micro…" : "Enregistrer ma voix"}
          </Button>
          <p className="max-w-md text-[15px] text-ink-muted">Parlez comme si vous racontiez à un proche. Vous pourrez réécouter avant d'enregistrer.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-4 text-[15px] font-medium text-prune hover:border-or has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-terre/50">
              <Upload className="size-4" aria-hidden /> Importer un fichier audio
              <input type="file" accept="audio/*" className="sr-only" onChange={(e) => void importFile(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
            </label>
            <Button variant="ghost" onClick={sample}>
              Pas de micro ? Utiliser un enregistrement d'exemple
            </Button>
          </div>
        </div>
      ) : st.k === "recording" ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center" aria-live="polite">
          <p className="flex items-center gap-2 text-lg font-semibold text-danger">
            <span className={st.paused ? "size-3 rounded-full bg-ink-soft" : "size-3 animate-pulse2 rounded-full bg-danger"} aria-hidden />
            {st.paused ? "En pause" : "Enregistrement en cours"} · {fmtDuration(elapsed)}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {typeof MediaRecorder !== "undefined" && "pause" in MediaRecorder.prototype && (
              <Button size="xl" variant="outline" onClick={pause}>
                {st.paused ? <Play /> : <Pause />} {st.paused ? "Reprendre" : "Pause"}
              </Button>
            )}
            <Button size="xl" onClick={stop}>
              <Square /> Arrêter
            </Button>
          </div>
        </div>
      ) : st.k === "recorded" ? (
        <div className="space-y-4">
          <p className="font-semibold">Réécoutez votre enregistrement ({fmtDuration(st.dur)})</p>
          <audio controls src={st.url} className="h-12 w-full" aria-label="Réécouter l'enregistrement" />
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => void save()}>
              <Save /> Garder cet enregistrement
            </Button>
            <Button size="lg" variant="outline" onClick={() => { reset(); void start(); }}>
              <RotateCcw /> Recommencer
            </Button>
            <Button size="lg" variant="ghost" onClick={reset}>
              <Trash2 /> Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Alert tone="danger" title={MESSAGES[st.code][0]}>
            {MESSAGES[st.code][1]}
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void start()}>Réessayer</Button>
            <Button variant="secondary" onClick={sample}>
              Utiliser un enregistrement d'exemple
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-4 text-[15px] font-medium text-prune hover:border-or">
              <Upload className="size-4" aria-hidden /> Importer un fichier audio
              <input type="file" accept="audio/*" className="sr-only" onChange={(e) => void importFile(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
