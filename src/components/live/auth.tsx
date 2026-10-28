"use client";
import { Form } from "./form";
import { useLang } from "@/i18n/lang";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "./client";
import { LivePublicHeader, Message } from "./shell";
import { toast } from "@/lib/toast";
import { waitForLoginDelivery } from "@/lib/login-delivery";
export function AccessScreen({ localInbox = false }: { localInbox?: boolean }) {
  useLang((s) => s.lang);
  const toastId = useId();
  const delivery = useRef<AbortController | null>(null);
  const [email, setEmail] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [notice, setNotice] = useState(""),
    [sent, setSent] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const readToken = () => {
      const params = new URLSearchParams(location.hash.slice(1));
      const incoming = params.get("token");
      if (incoming) {
        delivery.current?.abort();
        toast.dismiss(toastId);
        setBusy(false);
        setNotice("");
        setMessage("");
        setToken(incoming);
        setError("");
        history.replaceState(null, "", location.pathname + location.search);
      }
    };
    readToken();
    setReady(true);
    window.addEventListener("hashchange", readToken);
    return () => window.removeEventListener("hashchange", readToken);
  }, [toastId]);
  useEffect(
    () => () => {
      delivery.current?.abort();
      toast.dismiss(toastId);
    },
    [toastId],
  );
  return (
    <main className="container-page max-w-xl py-8 sm:py-14">
      <LivePublicHeader />
      <div className="card mt-8 overflow-hidden !rounded-3xl">
        <div className="border-b border-line bg-prune-50 px-6 py-7 sm:px-8">
          <span className="mb-4 inline-flex size-11 items-center justify-center rounded-full border border-prune/10 bg-white text-prune">
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <h1 className="!text-4xl">Votre espace Filémoire</h1>
          <p className="mt-3 text-base text-ink-muted">
            Connectez-vous avec votre adresse e-mail. Le lien reçu est valable
            15 minutes et ne peut servir qu’une fois.
          </p>
        </div>
        <div className="px-6 py-7 sm:px-8">
          <Message error={error} success={message} info={notice} />
          {localInbox && (
            <p className="mt-5 rounded-md bg-creme p-4 text-sm">
              Vous utilisez Filémoire sur votre ordinateur. Les liens de
              connexion et les invitations arrivent dans la{" "}
              <a
                href="http://localhost:8025"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                boîte e-mail locale
              </a>
              . Aucun e-mail n’est envoyé à l’extérieur.
            </p>
          )}
          {token ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="mt-6"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api("auth/consume", { token });
                    const back = new URLSearchParams(location.search).get(
                      "retour",
                    );
                    location.href = back === "/offrir" ? back : "/espace";
                  } catch (e) {
                    setError((e as Error).message);
                    toast.error("Connexion impossible", {
                      id: toastId,
                      description: (e as Error).message,
                    });
                    setBusy(false);
                  }
                }}
              >
                Confirmer ma connexion
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setToken("");
                  setError("");
                  setMessage("");
                  setNotice("");
                }}
              >
                Recevoir un nouveau lien
              </Button>
            </div>
          ) : (
            <Form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                delivery.current?.abort();
                const controller = new AbortController();
                delivery.current = controller;
                setBusy(true);
                setError("");
                setMessage("");
                setNotice("Votre demande est en cours d’envoi.");
                setSent(false);
                toast.loading("Envoi du lien…", {
                  id: toastId,
                  description: "",
                });
                try {
                  const response = await api<{ receipt?: string }>(
                    "auth/request",
                    { email },
                  );
                  if (controller.signal.aborted) return;
                  // Old backends only acknowledge the queue. Never call that a successful send.
                  const status = response.receipt
                    ? await waitForLoginDelivery(
                        response.receipt,
                        controller.signal,
                      )
                    : "delayed";
                  if (controller.signal.aborted) return;
                  setNotice("");
                  if (status === "sent") {
                    setSent(true);
                    setMessage(
                      "Consultez votre messagerie pour ouvrir votre lien de connexion.",
                    );
                    toast.success("Votre lien a été envoyé", {
                      id: toastId,
                      description:
                        "Pensez à vérifier vos courriers indésirables.",
                    });
                  } else if (status === "failed" || status === "expired") {
                    const reason =
                      status === "failed"
                        ? "Le lien n’a pas pu être envoyé. Réessayez dans quelques minutes."
                        : "Cette demande a expiré. Demandez un nouveau lien.";
                    setError(reason);
                    toast.error("Lien non envoyé", {
                      id: toastId,
                      description: reason,
                    });
                  } else {
                    setNotice(
                      "L’envoi prend plus de temps que prévu. Vérifiez votre messagerie avant de demander un nouveau lien.",
                    );
                    toast.info("Envoi en attente", {
                      id: toastId,
                      description:
                        "La demande est enregistrée, mais l’envoi n’est pas encore confirmé.",
                    });
                  }
                } catch (e) {
                  if (controller.signal.aborted) return;
                  setNotice("");
                  setError((e as Error).message);
                  toast.error("Impossible de confirmer l’envoi", {
                    id: toastId,
                    description: (e as Error).message,
                  });
                } finally {
                  if (!controller.signal.aborted) setBusy(false);
                }
              }}
            >
              <label className="block" htmlFor="live-email">
                Adresse e-mail
              </label>
              <Input
                id="live-email"
                disabled={!ready || busy}
                required
                type="email"
                autoComplete="email"
                className="h-12"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                  setMessage("");
                  setError("");
                  setNotice("");
                  toast.dismiss(toastId);
                }}
              />
              <Button
                className="w-full"
                size="lg"
                type="submit"
                disabled={!ready || busy}
                aria-busy={busy}
              >
                {busy ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                {busy
                  ? "Envoi en cours…"
                  : sent
                    ? "Recevoir un nouveau lien"
                    : "Recevoir mon lien"}
              </Button>
            </Form>
          )}
          <p className="mt-6 flex items-center gap-2 border-t border-line pt-5 text-sm text-ink-muted">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            Un lien personnel, à usage unique. Aucun mot de passe à retenir.
          </p>
        </div>
      </div>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-prune"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour à l’accueil
      </Link>
    </main>
  );
}
export function JoinScreen() {
  useLang((s) => s.lang);
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
    api<{ account: unknown }>("me")
      .then((r) => setReady(!!r.account))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="container-page max-w-lg py-16">
      <LivePublicHeader />
      <h1 className="mt-10">Un livre vous attend</h1>
      <p className="mt-4">
        Acceptez cette invitation pour participer au livre. Utilisez l’adresse
        e-mail qui a reçu l’invitation.
      </p>
      <Message error={error} />
      {ready ? (
        <Button
          className="mt-6"
          onClick={async () => {
            try {
              await api("invitations/accept", { token });
              history.replaceState(null, "", "/rejoindre");
              location.href = "/espace";
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Accepter l’invitation
        </Button>
      ) : (
        <p className="mt-6">
          <Link href="/acces" target="_blank" className="underline">
            Connectez-vous dans un nouvel onglet
          </Link>
          , puis{" "}
          <button className="underline" onClick={() => location.reload()}>
            actualisez cette page
          </button>
          .
        </p>
      )}
    </main>
  );
}
export function AudioAccessScreen() {
  useLang((s) => s.lang);
  const [token, setToken] = useState(""),
    [code, setCode] = useState(""),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () =>
      setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? ""),
    [],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return (
    <main className="container-page max-w-lg py-16">
      <LivePublicHeader />
      <h1 className="mt-10">Écouter un souvenir</h1>
      <p className="mt-4">
        Saisissez le code d’écoute transmis par le narrateur.
      </p>
      <Message error={error} />
      {url ? (
        <audio className="mt-6 w-full" src={url} controls />
      ) : (
        <Form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await fetch("/api/v1/audio/listen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, code }),
              });
              if (!r.ok) throw new Error((await r.json()).error);
              setError("");
              setUrl(URL.createObjectURL(await r.blob()));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="listen-password">Code famille</label>
          <Input
            id="listen-password"
            type="password"
            autoComplete="off"
            minLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            Écouter
          </Button>
        </Form>
      )}
    </main>
  );
}
