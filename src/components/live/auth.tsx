"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shell/logo";
import { api } from "./client";
import { Message } from "./shell";
export function AccessScreen({ localInbox = false }: { localInbox?: boolean }) {
  const [email, setEmail] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const readToken = () => {
      const params = new URLSearchParams(location.hash.slice(1));
      const incoming = params.get("token");
      if (incoming) {
        setToken(incoming);
        setError("");
        history.replaceState(null, "", location.pathname + location.search);
      }
    };
    readToken();
    setReady(true);
    window.addEventListener("hashchange", readToken);
    return () => window.removeEventListener("hashchange", readToken);
  }, []);
  return (
    <main className="container-page max-w-lg py-16">
      <Logo />
      <div className="card mt-10 p-8">
        <h1>Votre espace Filémoire</h1>
        <p className="mt-4">
          Connectez-vous avec votre adresse e-mail. Le lien reçu est valable 15
          minutes et ne peut servir qu’une fois.
        </p>
        <Message error={error} success={message} />
        {localInbox && (
          <p className="mt-5 rounded-md bg-creme p-4 text-sm">
            Vous utilisez Filémoire sur votre ordinateur. Les liens de connexion
            et les invitations arrivent dans la{" "}
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
              }}
            >
              Recevoir un nouveau lien
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("auth/request", { email });
                setMessage(
                  "Consultez votre messagerie pour ouvrir votre lien de connexion.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={!ready || busy}>
              {busy ? "Envoi en cours…" : "Recevoir mon lien"}
            </Button>
          </form>
        )}
      </div>
      <Link href="/" className="mt-6 inline-block">
        Retour à l’accueil
      </Link>
    </main>
  );
}
export function JoinScreen() {
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
      <Logo />
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
      <Logo />
      <h1 className="mt-10">Écouter un souvenir</h1>
      <p className="mt-4">
        Saisissez le code d’écoute transmis par le narrateur.
      </p>
      <Message error={error} />
      {url ? (
        <audio className="mt-6 w-full" src={url} controls />
      ) : (
        <form
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
        </form>
      )}
    </main>
  );
}
