"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { api, confirmNavigation } from "./client";
export function LiveShell({ children }: { children: ReactNode }) {
  const [error, setError] = useState("");
  return (
    <div className="live-workspace min-h-screen bg-creme text-ink">
      <a href="#live-main" className="sr-only-focusable">
        Aller au contenu
      </a>
      <header className="border-b border-line bg-white">
        <div className="container-page flex min-h-20 flex-wrap items-center gap-6 py-4">
          <span
            onClick={(e) => {
              if (!confirmNavigation()) e.preventDefault();
            }}
          >
            <Logo />
          </span>
          <nav
            onClick={(e) => {
              if (
                (e.target as HTMLElement).closest("a") &&
                !confirmNavigation()
              )
                e.preventDefault();
            }}
            aria-label="Navigation du compte"
            className="ml-auto flex flex-wrap gap-5"
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
