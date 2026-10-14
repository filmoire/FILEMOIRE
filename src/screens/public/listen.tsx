"use client";

import { Headphones, Lock } from "lucide-react";
import { useState } from "react";
import { AudioPlayer } from "@/components/media";
import { Hydrated } from "@/components/shell/providers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { pkg } from "@/lib/catalog";
import { useRouteParam } from "@/lib/nav";
import { sampleProject } from "@/lib/sample";
import { useDemo } from "@/lib/store";

export function ListenScreen() {
  return (
    <Hydrated>
      <Listen />
    </Hydrated>
  );
}

function Listen() {
  const tok = useRouteParam("token") ?? "";
  const projects = useDemo((s) => s.projects);
  const persona = useDemo((s) => s.persona);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState<string>();
  const sample = sampleProject();
  const isSample = sample.audios.some((a) => a.qr.token === tok);
  const p = isSample ? sample : projects.find((x) => x.audios.some((a) => a.qr.token === tok));
  const audio = p?.audios.find((a) => a.qr.token === tok);
  const memory = audio && p?.memories.find((m) => m.id === audio.memoryId);
  const question = memory && p?.questions.find((q) => q.id === memory.questionId);
  const isNarrator = !!p && persona.role === "narrateur" && persona.projectId === p.id;

  let body;
  if (!p || !audio) body = <Alert tone="warning" title="Ce QR code ne correspond à aucun enregistrement">Il a peut-être été supprimé par la narratrice.</Alert>;
  else if (!pkg(p.packageCode).qr || !audio.qr.enabled) body = <Alert tone="privacy" title="Écoute désactivée">La narratrice a désactivé l'écoute de cet enregistrement. Le QR code imprimé ne donne plus accès à rien.</Alert>;
  else if (!isSample && !isNarrator && !unlocked)
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim() === p.privacy.listenCode) {
            setUnlocked(true);
            setErr(undefined);
          } else setErr("Ce code ne correspond pas. Demandez le code famille à la narratrice.");
        }}
      >
        <Alert tone="privacy" title="Écoute réservée à la famille">Ce souvenir est privé. Saisissez le code famille communiqué par {p.narrator.firstName}.</Alert>
        <Field id="listen-code" label="Code famille (6 chiffres)" error={err}>
          <Input id="listen-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} />
        </Field>
        <Button type="submit" size="lg">
          <Lock /> Écouter
        </Button>
        <p className="text-sm text-ink-muted">Démo : le code est affiché dans l'espace de la narratrice, page « Famille ».</p>
      </form>
    );
  else
    body = (
      <div className="space-y-4">
        {question && <p className="quote text-2xl">« {question.text} »</p>}
        <AudioPlayer audio={audio} label="Enregistrement du souvenir" />
        {audio.sample && <p className="text-sm text-ink-muted">Son d'exemple (quelques notes de musique), pas une vraie voix.</p>}
        {audio.transcript.status === "validee" && (
          <details className="rounded-md border border-line bg-white p-4">
            <summary className="cursor-pointer font-medium text-prune">Lire le texte validé par {p.narrator.firstName}</summary>
            <p className="mt-3 whitespace-pre-line font-serif text-lg">{audio.transcript.text}</p>
          </details>
        )}
        {isSample && <Alert tone="info">Exemple public. Dans un vrai livre, l'écoute demande le code famille choisi par la narratrice.</Alert>}
      </div>
    );

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-6 sm:p-10">
        <Headphones className="size-9 text-terre" aria-hidden />
        <h1 className="mt-4 text-3xl">{p ? `Un souvenir raconté par ${p.narrator.firstName}` : "Écouter un souvenir"}</h1>
        <div className="mt-6">{body}</div>
        <p className="mt-8 border-t border-line pt-4 text-xs text-ink-muted">
          Prototype : le contrôle d'accès, l'expiration des liens et la durabilité des QR codes imprimés exigent une infrastructure serveur (stockage audio protégé, jetons signés, journalisation). Rien de cela n'est assuré ici.
        </p>
      </div>
    </div>
  );
}
