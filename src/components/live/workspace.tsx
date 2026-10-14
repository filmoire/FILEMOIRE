"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { BookViewer } from "@/components/book/viewer";
import { VISIBILITY_LABEL } from "@/lib/rules";
import type { Project, Visibility } from "@/lib/types";
import type { Account } from "@/server/auth";
import type { Command, projectView } from "@/server/projects";
import {
  api,
  uploadFile,
  markUnsaved,
  markRecording,
  confirmNavigation,
} from "./client";
import { OperationsPanel } from "./operations-panel";
import { LiveShell, Message } from "./shell";
import { CreateBook } from "./create-book";
type View = ReturnType<typeof projectView>;
type Mutate = (command: Command) => Promise<View>;
export function Workspace() {
  const [account, setAccount] = useState<Account | null>(null),
    [projects, setProjects] = useState<View[]>([]),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [personalDrafts, setPersonalDrafts] = useState(false),
    [creating, setCreating] = useState(false),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const me = await api<{
        account: Account | null;
        personalDraftsEnabled: boolean;
      }>("me");
      if (!me.account) {
        location.href = "/acces";
        return;
      }
      setAccount(me.account);
      setPersonalDrafts(me.personalDraftsEnabled);
      const r = await api<{ projects: View[] }>("projects");
      setProjects(r.projects);
      setSelected((v) =>
        r.projects.some((p) => p.id === v) ? v : r.projects[0]?.id || "",
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const current = projects.find((p) => p.id === selected);
  const update = (v: View) =>
    setProjects((all) => all.map((p) => (p.id === v.id ? v : p)));
  return (
    <LiveShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Votre espace privé</p>
          <h1 className="mt-2">
            {account?.name
              ? `Bonjour ${account.name}`
              : "Vos livres de famille"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {personalDrafts && (
            <Button
              onClick={() => {
                if (confirmNavigation()) setCreating((v) => !v);
              }}
            >
              {creating ? "Revenir à mes livres" : "Nouveau livre"}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/offrir">Offrir un parcours</Link>
          </Button>
        </div>
      </div>
      <Message error={error} />
      {loading ? (
        <p role="status" className="mt-8">
          Chargement de vos livres…
        </p>
      ) : (
        <>
          {personalDrafts && (creating || projects.length === 0) ? (
            <CreateBook
              onCreated={(v) => {
                setProjects((all) => [v, ...all.filter((p) => p.id !== v.id)]);
                setSelected(v.id);
                setCreating(false);
                void refresh();
              }}
            />
          ) : projects.length === 0 ? (
            <div className="card mt-8 p-8">
              <h2>Votre premier livre commence ici</h2>
              <p className="mt-3">
                Offrez un parcours ou acceptez l’invitation reçue dans votre
                messagerie. Une commande payée apparaît après sa confirmation.
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => void refresh()}
              >
                Actualiser mes livres
              </Button>
            </div>
          ) : (
            <>
              <label className="mt-8 block max-w-lg">
                Livre
                <select
                  className="mt-2 block w-full rounded-md border border-line bg-white p-3"
                  value={selected}
                  onChange={(e) => {
                    if (confirmNavigation()) setSelected(e.target.value);
                  }}
                >
                  {projects.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.project.book.cover.title} ·{" "}
                      {
                        {
                          buyer: "acheteur",
                          narrator: "narrateur",
                          editor: "éditeur",
                          contributor: "contributeur",
                          support: "support",
                        }[v.role]
                      }
                    </option>
                  ))}
                </select>
              </label>
              {current && (
                <ProjectWorkspace
                  key={current.id}
                  view={current}
                  update={update}
                  refresh={refresh}
                />
              )}
            </>
          )}
          <Orders />
          {account?.admin && <Operations account={account} refresh={refresh} />}
        </>
      )}
    </LiveShell>
  );
}
function ProjectWorkspace({
  view,
  update,
  refresh,
}: {
  view: View;
  update: (v: View) => void;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState("souvenirs"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  const p = view.project,
    narrator = view.role === "narrator";
  const latest = useRef(view);
  latest.current = view;
  const mutate: Mutate = async (command) => {
    setError("");
    const result = await api<View>(`projects/${p.id}/commands`, {
      revision: latest.current.revision,
      command,
    });
    latest.current = result;
    update(result);
    return result;
  };
  const run = async (
    work: () => Promise<unknown>,
    message = "Modification enregistrée.",
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await work();
      setSuccess(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const locked = [
    "approuve",
    "preparation",
    "impression",
    "expedie",
    "livre",
  ].includes(p.book.status);
  return (
    <section className="mt-8">
      <Message error={error} success={success} />
      {p.kind === "personal" && (
        <p className="mb-6 rounded-lg border border-line bg-white px-5 py-4 text-sm text-ink-muted">
          Manuscrit personnel · Vos modifications sont enregistrées dans votre
          espace privé. Le PDF et vos médias restent téléchargeables.
        </p>
      )}
      {view.role === "buyer" && !p.startedAt && (
        <div className="card mb-6 space-y-3 p-5">
          <p>Invitation du narrateur : {p.invitation.status}</p>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() =>
              void run(async () => {
                await api(`projects/${p.id}/narrator-invitation`, {});
                await refresh();
              }, "Une nouvelle invitation est programmée. Les anciens liens sont désactivés.")
            }
          >
            Envoyer maintenant ou relancer l’invitation
          </Button>
        </div>
      )}
      {view.deletionAt && (
        <p className="rounded bg-warning-bg p-4">
          Suppression programmée le{" "}
          {new Date(view.deletionAt).toLocaleDateString("fr-FR")}.{" "}
          <button
            className="underline"
            onClick={() => void run(() => mutate({ type: "cancel-deletion" }))}
          >
            Annuler
          </button>
        </p>
      )}
      {narrator && !p.onboarded ? (
        <div className="card p-8">
          <h2>Vous gardez le contrôle</h2>
          <p className="mt-3">
            Vos réponses sont privées par défaut. Vous choisissez ce que vos
            proches peuvent lire et validez le contenu avant impression. Vous
            pouvez passer une question ou demander la suppression de votre
            livre.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                mutate({
                  type: "onboard",
                  accepted: true,
                  consentVersion: "2026-10-13",
                }),
              );
            }}
          >
            <label className="flex gap-3">
              <input type="checkbox" required />
              <span>
                J’ai lu les{" "}
                <a href="/legal" target="_blank" className="underline">
                  conditions et informations de confidentialité
                </a>{" "}
                et souhaite commencer mon parcours.
              </span>
            </label>
            <Button disabled={busy} type="submit">
              Commencer mon livre
            </Button>
          </form>
        </div>
      ) : (
        <>
          <nav
            className="flex flex-wrap gap-2 border-b border-line pb-4"
            aria-label="Sections du livre"
          >
            {(narrator
              ? ["souvenirs", "livre", "famille", "confidentialité"]
              : ["souvenirs"]
            ).map((t) => (
              <Button
                key={t}
                variant={tab === t ? "primary" : "outline"}
                onClick={() => {
                  if (!confirmNavigation()) return;
                  setTab(t);
                  setError("");
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </nav>
          {locked && (
            <p className="mt-4 rounded bg-creme-200 p-4">
              Statut du livre : {p.book.status}.{" "}
              {narrator && p.book.status === "approuve" && (
                <button
                  className="underline"
                  onClick={() =>
                    void run(
                      () => mutate({ type: "reopen" }),
                      "Vous pouvez modifier votre livre. Une nouvelle validation sera nécessaire.",
                    )
                  }
                >
                  Retirer ma validation
                </button>
              )}
            </p>
          )}
          {tab === "souvenirs" && (
            <div className="mt-6 space-y-6">
              {narrator && !locked && (
                <QuestionComposer p={p} mutate={mutate} />
              )}
              {p.memories.map((m) => (
                <article className="card p-6" key={m.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <h2 className="max-w-3xl text-xl">
                      {p.questions.find((q) => q.id === m.questionId)?.text ||
                        "Souvenir"}
                    </h2>
                    <span className="text-sm text-ink-muted">
                      {m.inBook ? "Dans le livre" : "Masqué du livre"}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap font-serif text-xl">
                    {m.text || m.draft}
                  </p>
                  {narrator && (
                    <p className="mt-3 text-sm text-ink-muted">
                      {VISIBILITY_LABEL[m.visibility]} ·{" "}
                      {m.status === "brouillon"
                        ? "Brouillon"
                        : "Réponse validée"}
                    </p>
                  )}
                  {narrator && !locked && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <label>
                        Partager avec{" "}
                        <select
                          aria-label="Visibilité du souvenir"
                          className="rounded border border-line bg-white p-2"
                          value={m.visibility}
                          onChange={(e) =>
                            void run(() =>
                              mutate({
                                type: "memory",
                                memoryId: m.id,
                                visibility: e.target.value as Visibility,
                              }),
                            )
                          }
                        >
                          {Object.entries(VISIBILITY_LABEL).map(
                            ([v, label]) => (
                              <option key={v} value={v}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            mutate({
                              type: "memory",
                              memoryId: m.id,
                              inBook: !m.inBook,
                            }),
                          )
                        }
                      >
                        {m.inBook
                          ? "Masquer du livre"
                          : "Remettre dans le livre"}
                      </Button>
                      <Button
                        variant="danger-outline"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Supprimer ce souvenir et ses enregistrements ? Les photos seront retirées du livre.",
                            )
                          )
                            void run(() =>
                              mutate({ type: "delete-memory", memoryId: m.id }),
                            );
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                  {p.photos
                    .filter((ph) => ph.memoryId === m.id)
                    .map((ph) => (
                      <figure key={ph.id} className="mt-6 max-w-md">
                        <img
                          src={ph.src}
                          alt={ph.caption}
                          className="max-h-80 rounded-md object-contain"
                        />
                        <figcaption className="mt-2">{ph.caption}</figcaption>
                        {narrator && !locked && (
                          <PhotoEdit photo={ph} mutate={mutate} />
                        )}
                      </figure>
                    ))}
                  {p.audios
                    .filter((audio) => audio.memoryId === m.id)
                    .map((audio) => (
                      <div
                        key={audio.id}
                        className="mt-6 rounded border border-line p-4"
                      >
                        <audio controls className="w-full" src={audio.src} />
                        <p className="mt-3 text-sm">
                          Transcription : {audio.transcript.status}
                        </p>
                        {narrator ? (
                          <Transcript
                            p={p}
                            audio={audio}
                            mutate={mutate}
                            refresh={refresh}
                            locked={locked}
                          />
                        ) : (
                          audio.transcript.status === "validee" && (
                            <p className="mt-3 whitespace-pre-wrap">
                              {audio.transcript.text}
                            </p>
                          )
                        )}
                      </div>
                    ))}
                  {narrator && !locked && (
                    <UploadControls
                      projectId={p.id}
                      memoryId={m.id}
                      audioAllowed={
                        p.kind === "personal" || p.packageCode !== "essentiel"
                      }
                      refresh={refresh}
                    />
                  )}{" "}
                  {(view.role === "editor" || view.role === "contributor") &&
                    view.canSuggest &&
                    !locked && (
                      <form
                        className="mt-6 space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void run(
                            () =>
                              mutate({
                                type: "suggest",
                                memoryId: m.id,
                                text: String(f.get("text")),
                                note: String(f.get("note")),
                              }),
                            "Proposition envoyée au narrateur.",
                          );
                        }}
                      >
                        <label className="block">
                          Votre proposition
                          <Textarea
                            name="text"
                            required
                            defaultValue={m.text}
                            className="mt-2"
                          />
                        </label>
                        <label className="block">
                          Votre commentaire
                          <Input name="note" className="mt-2" />
                        </label>
                        <Button disabled={busy} type="submit">
                          Proposer une correction
                        </Button>
                      </form>
                    )}
                </article>
              ))}
              {p.memories.length === 0 && (
                <p className="py-8 text-ink-muted">
                  {narrator
                    ? "Votre premier souvenir vous attend."
                    : "Le narrateur n’a pas encore partagé de souvenir avec vous."}
                </p>
              )}
              {narrator &&
                p.suggestions
                  .filter((s) => s.status === "en_attente")
                  .map((s) => (
                    <article className="card p-6" key={s.id}>
                      <h3>Proposition de {s.author}</h3>
                      <p className="mt-3 whitespace-pre-wrap">{s.after}</p>
                      <p className="mt-3 text-sm">{s.note}</p>
                      <div className="mt-4 flex gap-3">
                        <Button
                          disabled={busy || locked}
                          onClick={() =>
                            void run(() =>
                              mutate({
                                type: "decide",
                                suggestionId: s.id,
                                accept: true,
                              }),
                            )
                          }
                        >
                          Accepter
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy || locked}
                          onClick={() =>
                            void run(() =>
                              mutate({
                                type: "decide",
                                suggestionId: s.id,
                                accept: false,
                              }),
                            )
                          }
                        >
                          Refuser
                        </Button>
                      </div>
                    </article>
                  ))}
            </div>
          )}
          {tab === "livre" && narrator && (
            <BookSettings view={view} mutate={mutate} refresh={refresh} />
          )}
          {tab === "famille" && narrator && (
            <FamilySettings p={p} refresh={refresh} />
          )}
          {tab === "confidentialité" && narrator && (
            <PrivacySettings p={p} mutate={mutate} />
          )}
        </>
      )}
    </section>
  );
}
function QuestionComposer({ p, mutate }: { p: Project; mutate: Mutate }) {
  const available = p.questions.filter(
    (q) =>
      q.availableAt <= Date.now() &&
      q.status !== "passee" &&
      (q.status !== "reportee" || (q.postponedUntil ?? 0) <= Date.now()),
  );
  const [qid, setQid] = useState(
    available.find((q) => q.status !== "repondue")?.id ??
      available[0]?.id ??
      "",
  );
  const q = available.find((q) => q.id === qid);
  return (
    <div className="card p-6">
      <h2>Une question à la fois</h2>
      {available.length ? (
        <>
          <label className="mt-4 block">
            Votre question
            <select
              className="mt-2 w-full rounded border border-line bg-white p-3"
              value={qid}
              onChange={(e) => {
                if (confirmNavigation()) setQid(e.target.value);
              }}
            >
              {available.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text}
                </option>
              ))}
            </select>
          </label>
          {q && <AnswerForm key={qid} p={p} qid={qid} mutate={mutate} />}
        </>
      ) : (
        <p className="mt-4">
          La prochaine question arrivera selon votre rythme.
        </p>
      )}
    </div>
  );
}
function AnswerForm({
  p,
  qid,
  mutate,
}: {
  p: Project;
  qid: string;
  mutate: Mutate;
}) {
  const m = p.memories.find((m) => m.questionId === qid);
  const [text, setText] = useState(m?.draft ?? m?.text ?? ""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dirty = useRef(false),
    pending = useRef(false),
    latestText = useRef(text),
    saveRef = useRef(mutate),
    paused = useRef(false);
  latestText.current = text;
  saveRef.current = mutate;
  useEffect(() => {
    if (!dirty.current && !pending.current) setText(m?.draft ?? m?.text ?? "");
  }, [m?.draft, m?.text]);
  useEffect(() => {
    const timer = setInterval(async () => {
      if (
        !dirty.current ||
        pending.current ||
        paused.current ||
        !latestText.current.trim()
      )
        return;
      pending.current = true;
      const saving = latestText.current;
      setStatus("Enregistrement du brouillon…");
      try {
        await saveRef.current({
          type: "answer",
          questionId: qid,
          text: saving,
          visibility: m?.visibility ?? p.privacy.defaultVisibility,
          draft: true,
        });
        if (latestText.current === saving) {
          dirty.current = false;
          markUnsaved(false);
        }
        setStatus(
          dirty.current ? "Modifications en attente…" : "Brouillon enregistré",
        );
        setError("");
      } catch (e) {
        paused.current = true;
        setError(
          (e as Error).message +
            " Votre texte reste affiché ici. Copiez-le avant de recharger pour résoudre un conflit.",
        );
      } finally {
        pending.current = false;
      }
    }, 1500);
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || pending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(timer);
      markUnsaved(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [qid, m?.visibility, p.privacy.defaultVisibility]);
  const save = async () => {
    setBusy(true);
    while (pending.current) await new Promise((r) => setTimeout(r, 20));
    pending.current = true;
    setError("");
    try {
      await mutate({
        type: "answer",
        questionId: qid,
        text,
        visibility: m?.visibility ?? p.privacy.defaultVisibility,
        draft: false,
      });
      dirty.current = false;
      markUnsaved(false);
      paused.current = false;
      setStatus("Réponse enregistrée");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 space-y-4">
      <label className="block" htmlFor={`answer-${qid}`}>
        Votre souvenir
      </label>
      <Textarea
        id={`answer-${qid}`}
        disabled={busy}
        className="min-h-48"
        value={text}
        maxLength={100000}
        onChange={(e) => {
          setText(e.target.value);
          dirty.current = true;
          markUnsaved(true);
          paused.current = false;
          setStatus("Modifications en attente…");
        }}
      />
      <p role="status" className="text-sm text-ink-muted">
        {status}
      </p>
      <Message error={error} />
      <div className="flex flex-wrap gap-3">
        {!m &&
          !text.trim() &&
          (p.kind === "personal" || p.packageCode !== "essentiel") && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await mutate({
                    type: "answer",
                    questionId: qid,
                    text: "",
                    visibility: "moi",
                    draft: true,
                  });
                  setStatus(
                    "Brouillon vocal créé. Enregistrez votre voix dans le souvenir ci-dessous.",
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Répondre avec ma voix
            </Button>
          )}
        <Button disabled={busy || !text.trim()} onClick={() => void save()}>
          Enregistrer ma réponse
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (!confirmNavigation()) return;
              await mutate({
                type: "question",
                questionId: qid,
                action: "postpone",
                days: 7,
              });
              setStatus("Question reportée d’une semaine.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Reporter d’une semaine
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              if (!confirmNavigation()) return;
              await mutate({
                type: "question",
                questionId: qid,
                action: "skip",
                days: 7,
              });
              setStatus("Question passée.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Passer cette question
        </Button>
      </div>
    </div>
  );
}
function UploadControls({
  projectId,
  memoryId,
  audioAllowed,
  refresh,
}: {
  projectId: string;
  memoryId: string;
  audioAllowed: boolean;
  refresh: () => Promise<void>;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(""),
    [recording, setRecording] = useState(false),
    [failedRecording, setFailedRecording] = useState<File | null>(null),
    [recordingUrl, setRecordingUrl] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  useEffect(
    () => () => {
      if (recorder.current) recorder.current.onstop = null;
      stream.current?.getTracks().forEach((t) => t.stop());
      markRecording(false, memoryId);
    },
    [memoryId],
  );
  useEffect(() => {
    if (!failedRecording) {
      setRecordingUrl("");
      return;
    }
    const url = URL.createObjectURL(failedRecording);
    setRecordingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [failedRecording]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (recording || failedRecording) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording, failedRecording]);
  const send = async (
    file: File,
    kind: "photo" | "audio",
    recorded = false,
  ) => {
    setError("");
    setProgress(0);
    try {
      await uploadFile(projectId, memoryId, file, kind, setProgress);
      if (recorded) {
        setFailedRecording(null);
        markRecording(false, memoryId);
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      if (recorded) setFailedRecording(file);
    } finally {
      setProgress(null);
    }
  };
  const record = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s);
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0;
      r.ondataavailable = (e) => {
        chunks.push(e.data);
        size += e.data.size;
        if (size > 49 * 1024 * 1024 && r.state !== "inactive") r.stop();
      };
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const type = r.mimeType;
        void send(
          new File(
            chunks,
            `souvenir.${type.includes("mp4") ? "m4a" : "webm"}`,
            { type },
          ),
          "audio",
          true,
        );
      };
      r.start(1000);
      setRecording(true);
      markRecording(true, memoryId);
    } catch {
      setError(
        "Le micro n’est pas disponible. Autorisez-le ou importez un enregistrement.",
      );
    }
  };
  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="font-semibold">Enrichir ce souvenir</p>
      <Message error={error} />
      {progress !== null && <p role="status">Import : {progress} %</p>}
      {failedRecording && (
        <div className="space-y-3">
          <p>
            Votre enregistrement reste disponible ici. Gardez cette page ouverte
            jusqu’à sa sauvegarde.
          </p>
          <audio controls src={recordingUrl} />
          <Button
            variant="outline"
            onClick={() => void send(failedRecording, "audio", true)}
          >
            Réessayer l’import audio
          </Button>
          <a
            className="ml-3 underline"
            href={recordingUrl}
            download={failedRecording.name}
          >
            Sauvegarder une copie sur mon appareil
          </a>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="block">
          Ajouter une photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block max-w-full text-sm"
            disabled={progress !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void send(f, "photo");
              e.target.value = "";
            }}
          />
        </label>
        {audioAllowed && (
          <>
            <label>
              Importer un audio
              <input
                type="file"
                accept="audio/*"
                className="mt-2 block max-w-full text-sm"
                disabled={progress !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void send(f, "audio");
                  e.target.value = "";
                }}
              />
            </label>
            <Button
              variant="outline"
              disabled={progress !== null}
              onClick={() =>
                recording ? recorder.current?.stop() : void record()
              }
            >
              {recording ? "Arrêter et sauvegarder" : "Enregistrer ma voix"}
            </Button>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Photo : 15 Mo. Audio : 50 Mo et 60 minutes. Si l’import est interrompu,
        sélectionnez à nouveau le même fichier pour reprendre.
      </p>
    </div>
  );
}
function PhotoEdit({
  photo,
  mutate,
}: {
  photo: Project["photos"][number];
  mutate: Mutate;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await mutate({
            type: "photo",
            photoId: photo.id,
            caption: String(f.get("caption")),
            date: String(f.get("date")),
            people: String(f.get("people")),
            inBook: f.get("inBook") === "on",
            order: Number(f.get("order")),
          });
          setError("");
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <label className="block">
        Légende
        <Input name="caption" defaultValue={photo.caption} />
      </label>
      <label className="block">
        Date
        <Input name="date" defaultValue={photo.date} />
      </label>
      <label className="block">
        Personnes
        <Input name="people" defaultValue={photo.people} />
      </label>
      <label className="block">
        Ordre
        <Input
          name="order"
          type="number"
          min={0}
          max={1000}
          defaultValue={photo.order}
        />
      </label>
      <label className="flex gap-2">
        <input name="inBook" type="checkbox" defaultChecked={photo.inBook} />
        Inclure dans le livre
      </label>
      <Message error={error} />
      <Button size="sm" variant="outline" type="submit">
        Enregistrer la photo
      </Button>
    </form>
  );
}
function Transcript({
  p,
  audio,
  mutate,
  refresh,
  locked,
}: {
  p: Project;
  audio: Project["audios"][number];
  mutate: Mutate;
  refresh: () => Promise<void>;
  locked: boolean;
}) {
  const [text, setText] = useState(audio.transcript.text),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => setText(audio.transcript.text), [audio.transcript.text]);
  return (
    <div className="mt-4 space-y-3">
      <Message error={error} success={message} />
      {audio.transcript.manual && (
        <p className="text-sm text-ink-muted">
          Votre enregistrement est sauvegardé. La transcription automatique
          n’est pas activée ; écoutez votre audio, puis saisissez le texte
          ci-dessous.
        </p>
      )}
      {audio.transcript.status === "en_cours" ? (
        <p>
          Votre transcription est en préparation.{" "}
          <button className="underline" onClick={() => void refresh()}>
            Actualiser
          </button>
        </p>
      ) : (
        <>
          <label>
            Texte à relire
            <Textarea
              disabled={locked}
              className="mt-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <Button
            disabled={locked || !text.trim()}
            onClick={async () => {
              try {
                await mutate({
                  type: "transcript",
                  audioId: audio.id,
                  text,
                  approved: true,
                });
                setMessage("Transcription validée.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Valider ma transcription
          </Button>
          <Button
            variant="outline"
            disabled={
              locked ||
              audio.transcript.status !== "validee" ||
              text !== audio.transcript.text
            }
            onClick={async () => {
              try {
                const m = p.memories.find((m) => m.id === audio.memoryId)!;
                await mutate({
                  type: "answer",
                  questionId: m.questionId,
                  text: [m.draft ?? m.text, audio.transcript.text]
                    .filter(Boolean)
                    .join("\n\n"),
                  visibility: m.visibility,
                  draft: false,
                });
                setMessage("Transcription ajoutée au souvenir.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Ajouter au récit
          </Button>
        </>
      )}
      {audio.transcript.status === "echec" && (
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await api(`projects/${p.id}/transcription/retry`, {
                audioId: audio.id,
              });
              await refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Réessayer la transcription
        </Button>
      )}
      {(p.kind === "personal" || p.packageCode === "voix") &&
        audio.transcript.status === "validee" && (
          <form
            className="space-y-3 border-t border-line pt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const r = await api<{ url: string }>(
                  `projects/${p.id}/audio-links`,
                  {
                    audioId: audio.id,
                    enabled: f.get("enabled") === "on",
                    code: f.get("code"),
                    expiresAt: null,
                  },
                );
                setMessage(
                  `Lien privé : ${r.url}. Communiquez le code séparément à votre famille.`,
                );
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label className="flex gap-2">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={audio.qr.enabled}
              />
              Activer l’écoute par QR
            </label>
            <label className="block">
              Code d’écoute (8 caractères minimum)
              <Input
                name="code"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            <Button variant="outline" type="submit">
              Enregistrer l’accès audio
            </Button>
          </form>
        )}
    </div>
  );
}
function BookSettings({
  view,
  mutate,
  refresh,
}: {
  view: View;
  mutate: Mutate;
  refresh: () => Promise<void>;
}) {
  const p = view.project;
  const locked = [
    "approuve",
    "preparation",
    "impression",
    "expedie",
    "livre",
  ].includes(p.book.status);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [previewHash, setPreviewHash] = useState("");
  const [chapters, setChapters] = useState(
    p.chapters.slice().sort((a, b) => a.order - b.order),
  );
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await mutate({
        type: "cover",
        title: String(f.get("title")),
        subtitle: String(f.get("subtitle")),
        dedication: String(f.get("dedication")),
        template: f.get("template") as "prune" | "creme" | "terre",
      });
      setPreviewHash("");
      setMessage("Couverture enregistrée.");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="mt-6 space-y-8">
      <Message error={error} success={message} />
      <form className="card space-y-4 p-6" onSubmit={submit}>
        <h2>La couverture</h2>
        <fieldset disabled={locked} className="space-y-4">
          <label className="block">
            Titre
            <Input
              name="title"
              required
              maxLength={100}
              defaultValue={p.book.cover.title}
            />
          </label>
          <label className="block">
            Sous-titre
            <Input
              name="subtitle"
              maxLength={200}
              defaultValue={p.book.cover.subtitle}
            />
          </label>
          <label className="block">
            Dédicace
            <Textarea
              name="dedication"
              maxLength={3000}
              defaultValue={p.book.dedication}
            />
          </label>
          <label className="block">
            Couleur
            <select
              name="template"
              defaultValue={p.book.cover.template}
              className="ml-3 rounded border border-line p-2"
            >
              <option value="prune">Prune</option>
              <option value="creme">Crème</option>
              <option value="terre">Terre cuite</option>
            </select>
          </label>
          <Button type="submit">Enregistrer la couverture</Button>
        </fieldset>
      </form>
      <div className="card p-6">
        <h2>Chapitres et ordre</h2>
        <ol className="mt-4 space-y-3">
          {chapters.map((c, i) => (
            <li key={c.id} className="flex gap-3">
              <Input
                aria-label={`Titre du chapitre ${i + 1}`}
                disabled={locked}
                value={c.title}
                onChange={(e) =>
                  setChapters((all) =>
                    all.map((x) =>
                      x.id === c.id ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                disabled={locked || i === 0}
                onClick={() =>
                  setChapters((all) => {
                    const next = all.slice();
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    return next;
                  })
                }
              >
                Monter
              </Button>
            </li>
          ))}
        </ol>
        <Button
          className="mt-4"
          disabled={locked}
          onClick={async () => {
            try {
              await mutate({
                type: "chapters",
                chapters: chapters.map(({ id, title }) => ({ id, title })),
              });
              setMessage("Chapitres enregistrés.");
              setPreviewHash("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Enregistrer les chapitres
        </Button>
      </div>
      <section>
        <h2>Aperçu du livre</h2>
        <p className="my-4">
          L’aperçu à l’écran permet de relire. Téléchargez aussi l’épreuve PDF
          pour contrôler la pagination.
        </p>
        <BookViewer project={p} viewer={{ kind: "narrateur" }} showWarnings />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href={`/api/v1/projects/${p.id}/proof`} target="_blank">
              Télécharger l’épreuve PDF
            </a>
          </Button>
          <Button
            disabled={locked}
            onClick={async () => {
              try {
                const r = await api<{ contentHash: string }>(
                  `projects/${p.id}/preview`,
                );
                setPreviewHash(r.contentHash);
                setMessage("Version actuelle sélectionnée pour validation.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            J’ai relu cette version
          </Button>
        </div>
      </section>
      {!locked && (
        <form
          className="card space-y-4 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await mutate({
                type: "approve",
                contentHash: previewHash,
                address:
                  p.kind === "personal"
                    ? undefined
                    : {
                        name: String(f.get("name")),
                        line1: String(f.get("line1")),
                        postalCode: String(f.get("postalCode")),
                        city: String(f.get("city")),
                        country: String(f.get("country")).toUpperCase(),
                      },
              });
              setMessage("Votre version est validée et verrouillée.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h2>
            {p.kind === "personal"
              ? "Valider mon manuscrit"
              : "Valider et préparer la livraison"}
          </h2>
          {p.kind !== "personal" &&
            [
              ["name", "Nom du destinataire"],
              ["line1", "Adresse"],
              ["postalCode", "Code postal"],
              ["city", "Ville"],
              ["country", "Pays (code à deux lettres)"],
            ].map(([name, label]) => (
              <label className="block" key={name}>
                {label}
                <Input
                  name={name}
                  required
                  defaultValue={name === "country" ? "FR" : ""}
                  maxLength={name === "country" ? 2 : 200}
                />
              </label>
            ))}
          <label className="flex gap-3">
            <input type="checkbox" required />
            <span>
              {p.kind === "personal"
                ? "Je valide le contenu de cette version de mon manuscrit."
                : "Je valide le contenu de cette version et l’adresse de livraison."}
            </span>
          </label>
          <Button disabled={!previewHash} type="submit">
            Valider mon livre
          </Button>
        </form>
      )}
      {p.kind !== "personal" && p.book.status === "approuve" && (
        <Button
          onClick={async () => {
            try {
              await api(`projects/${p.id}/print`, {
                revision: view.revision,
                requestKey: crypto.randomUUID(),
              });
              await refresh();
              setMessage("Commande d’impression enregistrée.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Commander l’impression de la version validée
        </Button>
      )}
    </div>
  );
}
function FamilySettings({
  p,
  refresh,
}: {
  p: Project;
  refresh: () => Promise<void>;
}) {
  const [invitations, setInvitations] = useState<
    {
      id: string;
      email: string;
      accepted_at: string | null;
      revoked_at: string | null;
      expires_at: string;
    }[]
  >([]);
  const [members, setMembers] = useState<
      {
        id: string;
        email: string;
        name: string;
        role: string;
        revoked_at: string | null;
      }[]
    >([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      api<{ members: typeof members; invitations: typeof invitations }>(
        `projects/${p.id}/members`,
      )
        .then((r) => {
          setMembers(r.members);
          setInvitations(r.invitations);
        })
        .catch((e) => setError(e.message)),
    [p.id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="mt-6 space-y-6">
      <Message error={error} success={message} />
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await api(`projects/${p.id}/invitations`, {
              name: f.get("name"),
              email: f.get("email"),
              role: f.get("role"),
              canSuggest: true,
            });
            setMessage(
              "Invitation programmée. La personne doit l’accepter avec son propre compte.",
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <h2>Inviter un proche</h2>
        <label className="block">
          Nom
          <Input name="name" required />
        </label>
        <label className="block">
          Adresse e-mail
          <Input name="email" type="email" required />
        </label>
        <label className="block">
          Rôle
          <select name="role" className="ml-3 rounded border border-line p-2">
            <option value="editor">Éditeur familial</option>
            <option value="contributor">Contributeur</option>
          </select>
        </label>
        <p className="text-sm">
          Vos proches ne voient que les souvenirs que vous partagez. Leurs
          corrections sont soumises à votre validation. Un contributeur voit les
          souvenirs partagés avec la famille ; les souvenirs réservés à
          l’éditeur familial restent accessibles uniquement à cet éditeur.
        </p>
        <Button type="submit">Envoyer l’invitation</Button>
      </form>
      <div className="card p-6">
        <h2>Accès au livre</h2>
        {invitations
          .filter((i) => !i.accepted_at && !i.revoked_at)
          .map((i) => (
            <div
              key={i.id}
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
            >
              <p>
                {i.email} · invitation{" "}
                {new Date(i.expires_at).getTime() < Date.now()
                  ? "expirée"
                  : "en attente"}
              </p>
              <Button
                variant="danger-outline"
                onClick={async () => {
                  try {
                    await api(`projects/${p.id}/invitations/revoke`, {
                      invitationId: i.id,
                    });
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Révoquer cette invitation
              </Button>
            </div>
          ))}
        {members.map((m) => (
          <div
            key={m.id}
            className="mt-4 flex flex-wrap justify-between gap-3 border-t border-line pt-4"
          >
            <p>
              {m.name || m.email} · {m.role}
              {m.revoked_at ? " · accès retiré" : ""}
            </p>
            {m.role !== "narrator" && !m.revoked_at && (
              <Button
                variant="danger-outline"
                onClick={async () => {
                  try {
                    await api(`projects/${p.id}/members/revoke`, {
                      accountId: m.id,
                    });
                    await load();
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Retirer l’accès
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function PrivacySettings({ p, mutate }: { p: Project; mutate: Mutate }) {
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="mt-6 space-y-6">
      <Message error={error} success={message} />
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await mutate({
              type: "preferences",
              cadenceDays: Number(f.get("cadence")),
              reminders: f.get("reminders") === "on" ? "douces" : "aucune",
              buyerSeesProgress: f.get("progress") === "on",
              defaultVisibility: f.get("visibility") as Visibility,
              marketing: f.get("marketing") === "on",
            });
            setMessage("Préférences enregistrées.");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <h2>Votre rythme et vos choix</h2>
        <label className="block">
          Rythme
          <select
            className="ml-3 rounded border border-line p-2"
            name="cadence"
            defaultValue={p.cadenceDays}
          >
            <option value={7}>Chaque semaine</option>
            <option value={3}>Tous les trois jours</option>
            <option value={0}>Pause</option>
          </select>
        </label>
        <label className="flex gap-3">
          <input
            name="reminders"
            type="checkbox"
            defaultChecked={p.privacy.reminders === "douces"}
          />
          Recevoir des rappels doux
        </label>
        <label className="flex gap-3">
          <input
            name="progress"
            type="checkbox"
            defaultChecked={p.privacy.buyerSeesProgress}
          />
          Partager mon avancement avec la personne qui offre
        </label>
        <label className="flex gap-3">
          <input
            name="marketing"
            type="checkbox"
            defaultChecked={p.privacy.marketing}
          />
          Recevoir des nouvelles commerciales
        </label>
        <label className="block">
          Visibilité par défaut
          <select
            name="visibility"
            defaultValue={p.privacy.defaultVisibility}
            className="ml-3 rounded border border-line p-2"
          >
            {Object.entries(VISIBILITY_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Enregistrer mes préférences</Button>
      </form>
      <div className="card space-y-4 p-6">
        <h2>Vos données</h2>
        <p>
          Vous pouvez exporter votre récit ou programmer sa suppression. Les
          fichiers déjà imprimés et les copies téléchargées par vos proches ne
          peuvent pas être rappelés.
        </p>
        <Button variant="outline" asChild>
          <a href={`/api/v1/projects/${p.id}/export`}>
            Exporter mon récit et tous mes médias
          </a>
        </Button>
        <Button
          variant="danger-outline"
          onClick={async () => {
            if (
              !window.confirm(
                "Programmer la suppression de ce livre et de ses médias ? Vous pourrez annuler avant la date indiquée.",
              )
            )
              return;
            try {
              await mutate({ type: "delete-project", confirm: "DELETE" });
              setMessage("Suppression programmée.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Demander la suppression
        </Button>
      </div>
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await api(`projects/${p.id}/support-access`, {
              email: f.get("email"),
              hours: Number(f.get("hours")),
              reason: f.get("reason"),
            });
            setMessage("Accès support mis à jour.");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <h2>Aide du support</h2>
        <p>Accordez un accès temporaire à un compte de support identifié.</p>
        <label className="block">
          Adresse du support
          <Input name="email" type="email" required />
        </label>
        <label className="block">
          Durée
          <select name="hours" className="ml-3 rounded border border-line p-2">
            <option value={1}>Une heure</option>
            <option value={24}>24 heures</option>
            <option value={0}>Retirer l’accès</option>
          </select>
        </label>
        <label className="block">
          Raison
          <Input name="reason" required minLength={5} />
        </label>
        <Button variant="outline" type="submit">
          Mettre à jour l’accès
        </Button>
      </form>
    </div>
  );
}
function Orders() {
  const [orders, setOrders] = useState<
    { id: string; total: number; status: string; created_at: string }[]
  >([]);
  useEffect(() => {
    api<{ orders: typeof orders }>("orders")
      .then((r) => setOrders(r.orders))
      .catch(() => {});
  }, []);
  if (!orders.length) return null;
  return (
    <section className="mt-12">
      <h2>Vos commandes</h2>
      <ul className="mt-4 divide-y divide-line">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap justify-between gap-3 py-4">
            <span>
              {o.id.slice(0, 8).toUpperCase()} ·{" "}
              {new Date(o.created_at).toLocaleDateString("fr-FR")}
            </span>
            <span>
              {(o.total / 100).toFixed(2)} € · {o.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
function Operations({
  account,
  refresh,
}: {
  account: Account;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [uri, setUri] = useState(""),
    [data, setData] = useState<{
      jobs: { id: string; kind: string; state: string; attempts: number }[];
      prints: { id: string; status: string; tracking: string | null }[];
    } | null>(null);
  useEffect(() => {
    if (account.mfa)
      api<NonNullable<typeof data>>("admin/operations")
        .then(setData)
        .catch((e) => setError(e.message));
  }, [account.mfa]);
  return (
    <section className="card mt-12 space-y-4 p-6">
      <h2>Opérations</h2>
      <Message error={error} />
      {!account.mfa ? (
        <>
          <p>
            Confirmez votre code d’authentification pour accéder aux opérations.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const r = await api<{ uri: string }>("auth/mfa/setup", {});
                setUri(r.uri);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Configurer un authentificateur
          </Button>
          {uri && (
            <p className="break-all text-sm">
              Ajoutez ce lien à votre authentificateur : <a href={uri}>{uri}</a>
            </p>
          )}
          <form
            className="flex gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api("auth/mfa/verify", { code: f.get("code") });
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Input
              aria-label="Code de l’authentificateur"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
            />
            <Button type="submit">Vérifier</Button>
          </form>
        </>
      ) : (
        <>
          <h3>Traitements en attente ou en échec</h3>
          {data?.jobs.map((j) => (
            <div
              key={j.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p>
                {j.kind} · {j.state} · {j.attempts} tentative(s)
              </p>
              {j.state === "failed" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api(`admin/retry-job/${j.id}`, {});
                      setData(await api("admin/operations"));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Réessayer
                </Button>
              )}
            </div>
          ))}
          <OperationsPanel />
          <h3>Commandes d’impression</h3>
          {data?.prints.map((p) => (
            <p key={p.id}>
              {p.id.slice(0, 8)} · {p.status} · {p.tracking}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
