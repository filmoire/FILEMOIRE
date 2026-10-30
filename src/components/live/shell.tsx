"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useLang } from "@/i18n/lang";
import { Button } from "@/components/ui/button";
import type { Account } from "@/server/auth";
import { api, confirmNavigation, hasUnsavedChanges } from "./client";
import {
  DASH_NAV,
  ROLE_LABEL,
  dashboardHref,
  type DashboardRole,
} from "./dashboard-ui";
export function LiveShell({
  children,
  account,
  role = "buyer",
  view = "",
  roleSwitcher,
}: {
  children: ReactNode;
  account?: Account | null;
  role?: DashboardRole;
  view?: string;
  roleSwitcher?: ReactNode;
}) {
  useLang((s) => s.lang);
  const router = useRouter();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const initials = (account?.name || account?.email || "")
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="live-workspace dashboard"
      data-role={role}
      onClickCapture={async (event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (
          !anchor ||
          anchor.target === "_blank" ||
          anchor.hasAttribute("download") ||
          anchor.pathname.startsWith("/api/") ||
          anchor.hash ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          !hasUnsavedChanges()
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (await confirmNavigation()) router.push(anchor.href);
      }}
    >
      <a href="#live-main" className="sr-only-focusable">
        Aller au contenu
      </a>
      <header className="dash-header">
        <div className="dash-container dash-top">
          <Logo href={dashboardHref(role)} />
          <div className="dash-identity">
            {account && (
              <>
                <span className="dash-avatar" aria-hidden="true" translate="no">
                  {initials}
                </span>
                <span className="dash-identity-name" translate="no">
                  {account.name || account.email}
                </span>
              </>
            )}
            {roleSwitcher || (
              <span className="dash-badge">{ROLE_LABEL[role]}</span>
            )}
            <LangSwitch />
          </div>
        </div>
        <nav
          className="dash-container dash-nav"
          aria-label="Navigation du compte"
        >
          {DASH_NAV[role].map(([key, label]) => (
            <Link
              key={key}
              href={dashboardHref(role, key)}
              aria-current={view === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          {role === "buyer" && (
            <Link
              href="/offrir"
              aria-current={view === "offrir" ? "page" : undefined}
            >
              Offrir
            </Link>
          )}
        </nav>
      </header>
      <main id="live-main" className="dash-container dash-main" tabIndex={-1}>
        <Message error={error} />
        {children}
      </main>
      <footer className="dash-container dash-footer">
        <Logo href={dashboardHref(role)} />
        <p>Vos souvenirs restent à vous.</p>
        <div className="dash-footer-actions">
          <Button asChild variant="outline" size="sm">
            <Link href="/legal">Confidentialité</Link>
          </Button>
          <button
            disabled={signingOut}
            onClick={async () => {
              if (!(await confirmNavigation())) return;
              setSigningOut(true);
              try {
                await api("auth/logout", {});
                location.href = "/acces";
              } catch (e) {
                setError((e as Error).message);
                setSigningOut(false);
              }
            }}
          >
            Déconnexion
          </button>
        </div>
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
  info,
}: {
  error?: string;
  success?: string;
  info?: string;
}) =>
  error ? (
    <p
      role="alert"
      className="my-4 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-bg p-4 text-danger"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  ) : success ? (
    <p
      role="status"
      className="my-4 flex items-start gap-3 rounded-xl border border-success/20 bg-success-bg p-4 text-success"
    >
      <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>{success}</span>
    </p>
  ) : info ? (
    <p
      role="status"
      className="my-4 flex items-start gap-3 rounded-xl border border-info/20 bg-info-bg p-4 text-info"
    >
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>{info}</span>
    </p>
  ) : null;
