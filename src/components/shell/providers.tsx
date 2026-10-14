"use client";

import { isLive } from "@/lib/mode";
import { Fragment, useEffect, type ReactNode } from "react";
import { tr } from "@/i18n/core";
import { useLang } from "@/i18n/lang";
import { Toaster } from "sonner";
import { useVisited } from "@/lib/guide";
import { useNav } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { GuidePanel } from "./guide-panel";

export function Providers({ children }: { children: ReactNode }) {
  return isLive ? <LiveProviders>{children}</LiveProviders> : <DemoProviders>{children}</DemoProviders>;
}

const LIVE_TITLES: Record<string, string> = {
  "/acces": "Votre espace Filémoire",
  "/espace": "Mes livres",
  "/offrir": "Offrir Filémoire",
  "/rejoindre": "Un livre vous attend",
  "/ecoute": "Écouter un souvenir",
  "/legal": "Confidentialité et conditions",
  "/comment-ca-marche": "Comment ça marche",
  "/offres": "Offres et tarifs",
  "/livre-exemple": "Livre exemple",
};

function LiveProviders({ children }: { children: ReactNode }) {
  const lang = useLang((s) => s.lang);
  const { pathname } = useNav();
  useEffect(() => { void useLang.persist.rehydrate(); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    const source = LIVE_TITLES[pathname] ?? "Une question à la fois, une vie à transmettre.";
    const fix = () => {
      const title = `${tr(source)} · Filémoire`;
      if (document.title !== title) document.title = title;
    };
    fix();
    const observer = new MutationObserver(fix);
    const title = document.querySelector("title");
    if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [lang, pathname]);
  // Live page roots subscribe to language changes without remounting their forms
  // or interrupting an active recorder. The demo keeps its separate lifecycle.
  return <>{children}<Toaster /></>;
}

function DemoProviders({ children }: { children: ReactNode }) {
  const { pathname } = useNav();
  const hydrated = useDemo((s) => s.hydrated);
  const lang = useLang((s) => s.lang);

  useEffect(() => {
    void useLang.persist.rehydrate();
  }, []);

  // Langue du document et titre d'onglet traduit (le titre est fixé par chaque page).
  useEffect(() => {
    document.documentElement.lang = lang;
    const fix = () => {
      const t = tr(document.title);
      if (t !== document.title) document.title = t;
    };
    fix();
    const el = document.querySelector("title");
    if (!el) return;
    const mo = new MutationObserver(fix);
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [lang, pathname]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(useDemo.persist.rehydrate()).then(() => {
      if (!alive) return;
      void useVisited.persist.rehydrate();
      const s = useDemo.getState();
      s.setHydrated();
      s.tick();
      // Reprend les transcriptions simulées interrompues par un rechargement.
      for (const p of s.projects) for (const a of p.audios) if (a.transcript.status === "en_cours") setTimeout(() => useDemo.getState().completeTranscription(p.id, a.id), 1200);
    });
    const t = setInterval(() => useDemo.getState().tick(), 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (hydrated) useVisited.getState().visit(pathname);
  }, [pathname, hydrated]);

  return (
    <>
      <Fragment key={lang}>{children}</Fragment>
      <Toaster
        position="top-center"
        offset={56}
        closeButton
        toastOptions={{
          classNames: {
            toast: "!rounded-lg !border !border-line !bg-white !text-ink !shadow-lift !font-sans !text-[15px]",
            success: "!border-success/30",
            error: "!border-danger/40",
            title: "!font-semibold",
            description: "!text-ink-muted",
          },
        }}
      />
      {hydrated && <GuidePanel key={`g-${lang}`} />}
    </>
  );
}

/** N'affiche le contenu qu'une fois l'état de démonstration chargé depuis ce navigateur. */
export function Hydrated({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useDemo((s) => s.hydrated);
  if (!hydrated)
    return (
      fallback ?? (
        <div className="container-page py-16" aria-busy="true" aria-live="polite">
          <div className="h-8 w-64 animate-pulse rounded bg-creme-300" />
          <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-creme-200" />
          <span className="sr-only">Chargement de la démonstration…</span>
        </div>
      )
    );
  return <>{children}</>;
}
