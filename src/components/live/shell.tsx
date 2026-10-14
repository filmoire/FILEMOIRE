"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { useLang } from "@/i18n/lang";
import { api, confirmNavigation } from "./client";
export function LiveShell({ children }: { children: ReactNode }) {
  useLang((s) => s.lang);
  const [error, setError] = useState("");
  return (
    <div className="live-workspace min-h-screen bg-creme text-ink">
      <a href="#live-main" className="sr-only-focusable">
        Aller au contenu
      </a>
      <header className="border-b border-line bg-white">
        <div className="container-page flex min-h-20 flex-wrap items-center gap-4 py-4">
          <span
            onClick={(e) => {
              if (!confirmNavigation()) e.preventDefault();
            }}
          >
            <Logo />
          </span>
          <LangSwitch className="ml-auto" />
          <nav
            onClick={(e) => {
              if (
                (e.target as HTMLElement).closest("a") &&
                !confirmNavigation()
              )
                e.preventDefault();
            }}
            aria-label="Navigation du compte"
            className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 sm:w-auto"
          >
            <Link href="/espace">Mes livres</Link>
            <Link href="/offrir">Offrir</Link>
            <Link href="/legal">Confidentialité</Link>
            <button
              onClick={async () => {
                if (!confirmNavigation()) return;
                try {
                  await api("auth/logout", {});
                  location.href = "/acces";
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </header>
      <main id="live-main" className="container-page py-10">
        <Message error={error} />
        {children}
      </main>
      <footer className="container-page border-t border-line py-8 text-sm text-ink-muted">
        Filémoire · Vos souvenirs, sous votre contrôle.
      </footer>
    </div>
  );
}
export function LivePublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Logo />
      <LangSwitch />
    </header>
  );
}
export const Message = ({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) =>
  error ? (
    <p role="alert" className="my-4 rounded-md bg-danger-bg p-4 text-danger">
      {error}
    </p>
  ) : success ? (
    <p role="status" className="my-4 rounded-md bg-success-bg p-4 text-success">
      {success}
    </p>
  ) : null;
