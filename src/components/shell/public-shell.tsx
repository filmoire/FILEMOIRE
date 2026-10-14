"use client";
import { useLang } from "@/i18n/lang";
import { isLive } from "@/lib/mode";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNav } from "@/lib/nav";
import { homeOf } from "@/lib/session";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DemoBar } from "./demo-bar";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";

const LINKS = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/offres", label: "Offres" },
  { href: "/livre-exemple", label: "Livre exemple" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  useLang((s) => s.lang);
  const { pathname, push } = useNav();
  const persona = useDemo((s) => s.persona);
  const hydrated = useDemo((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const offer = () => {
    if (isLive) {
      window.location.assign("/offrir");
      return;
    }
    if (persona.role !== "acheteur")
      useDemo.getState().setPersona({ role: "acheteur" });
    push("/acheteur/offrir");
  };
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only-focusable fixed left-2 top-2 z-[60] rounded bg-white px-3 py-2 shadow"
      >
        Aller au contenu
      </a>
      <DemoBar />
      <header className="no-print border-b border-line/80 bg-creme/95 backdrop-blur supports-[backdrop-filter]:bg-creme/80">
        <div className="container-page flex h-[72px] items-center gap-6">
          <Logo />
          <nav
            aria-label="Navigation principale"
            className="ml-auto hidden items-center gap-1 md:flex"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-[15px] no-underline hover:text-terre",
                  pathname === l.href ? "font-semibold text-prune" : "text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
            {isLive || (hydrated && persona.role !== "visiteur") ? (
              <Link
                href={isLive ? "/espace" : homeOf(persona)}
                className="rounded-md px-3 py-2 text-[15px] text-ink no-underline hover:text-terre"
              >
                Mon espace
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="rounded-md px-3 py-2 text-[15px] text-ink no-underline hover:text-terre"
              >
                Connexion
              </Link>
            )}
            <Button onClick={offer} className="ml-2">
              Offrir Filémoire
            </Button>
            <LangSwitch className="ml-2" />
          </nav>
          <LangSwitch className="ml-auto md:hidden" />
          <button
            className="ml-auto rounded-md p-2 md:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {open && (
          <nav
            id="menu-mobile"
            aria-label="Navigation principale"
            className="container-page flex flex-col gap-1 pb-4 md:hidden"
          >
            {[
              ...LINKS,
              {
                href: isLive
                  ? "/espace"
                  : hydrated && persona.role !== "visiteur"
                    ? homeOf(persona)
                    : "/connexion",
                label:
                  isLive || (hydrated && persona.role !== "visiteur")
                    ? "Mon espace"
                    : "Connexion",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-lg text-ink no-underline hover:bg-creme-200"
              >
                {l.label}
              </Link>
            ))}
            <Button onClick={offer} size="lg" className="mt-2">
              Offrir Filémoire
            </Button>
          </nav>
        )}
      </header>
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-line bg-creme-200/60">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="quote mt-4 text-xl">
            « Une question à la fois, une vie à transmettre. »
          </p>
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            {isLive
              ? "Un espace privé pour recueillir et transmettre votre histoire. Les exemples présentés sont fictifs."
              : "Prototype de démonstration. Toutes les personnes, commandes et histoires sont fictives. Paiement, e-mails, transcription et impression sont simulés."}
          </p>
        </div>
        <div>
          <p className="font-semibold text-prune">Découvrir</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link
                href="/comment-ca-marche"
                className="text-ink no-underline hover:text-terre"
              >
                Comment ça marche
              </Link>
            </li>
            <li>
              <Link
                href="/offres"
                className="text-ink no-underline hover:text-terre"
              >
                Offres et tarifs
              </Link>
            </li>
            <li>
              <Link
                href="/livre-exemple"
                className="text-ink no-underline hover:text-terre"
              >
                Livre exemple
              </Link>
            </li>
            <li>
              <Link
                href="/#faq"
                className="text-ink no-underline hover:text-terre"
              >
                Questions fréquentes
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-prune">Confiance</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link
                href="/#confidentialite"
                className="text-ink no-underline hover:text-terre"
              >
                Confidentialité et contrôle
              </Link>
            </li>
            <li>
              <Link
                href="/#contact"
                className="text-ink no-underline hover:text-terre"
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href={isLive ? "/acces" : "/connexion"}
                className="text-ink no-underline hover:text-terre"
              >
                Connexion
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-muted">
        {isLive ? (
          <Link href="/legal">Filémoire · Conditions et confidentialité</Link>
        ) : (
          "Filémoire — prototype 2026 · Ne saisissez aucune donnée réelle."
        )}
      </div>
    </footer>
  );
}
