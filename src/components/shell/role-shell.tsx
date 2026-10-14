"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNav } from "@/lib/nav";
import { homeOf, personaLabel, useNarratorProject } from "@/lib/session";
import { FAMILY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import type { Persona } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { DemoBar } from "./demo-bar";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";
import { NotificationBell } from "./notifications";
import { Hydrated } from "./providers";
import { SiteFooter } from "./public-shell";

type Role = "acheteur" | "narrateur" | "editeur" | "ops";

const NAV: Record<Role, { href: string; label: string; match?: string[] }[]> = {
  acheteur: [
    { href: "/acheteur", label: "Tableau de bord" },
    { href: "/acheteur/cadeaux", label: "Mes cadeaux" },
    { href: "/acheteur/suivi", label: "Suivi" },
    { href: "/acheteur/commandes", label: "Commandes" },
    { href: "/acheteur/offrir", label: "Offrir" },
  ],
  narrateur: [
    { href: "/narrateur", label: "Accueil" },
    { href: "/narrateur/questions", label: "Questions" },
    { href: "/narrateur/souvenirs", label: "Souvenirs" },
    { href: "/narrateur/photos", label: "Photos" },
    { href: "/narrateur/livre", label: "Mon livre", match: ["/narrateur/chapitres"] },
    { href: "/narrateur/apercu", label: "Aperçu" },
    { href: "/narrateur/famille", label: "Famille" },
    { href: "/narrateur/confidentialite", label: "Confidentialité" },
  ],
  editeur: [
    { href: "/editeur", label: "Accueil" },
    { href: "/editeur/livres", label: "Livres confiés" },
    { href: "/editeur/relecture", label: "Mes suggestions" },
  ],
  ops: [
    { href: "/admin", label: "Vue d'ensemble" },
    { href: "/admin/commandes", label: "Commandes" },
    { href: "/admin/projets", label: "Projets" },
    { href: "/admin/questions", label: "Questions" },
    { href: "/admin/impression", label: "Impression" },
    { href: "/admin/support", label: "Support" },
  ],
};

const ROLE_NAME: Record<Role, string> = {
  acheteur: "l'acheteur du cadeau",
  narrateur: "la personne qui raconte (narrateur)",
  editeur: "l'éditeur familial invité",
  ops: "l'équipe Opérations Filémoire",
};

export function RoleShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="sr-only-focusable fixed left-2 top-2 z-[60] rounded bg-white px-3 py-2 shadow">
        Aller au contenu
      </a>
      <DemoBar />
      <Hydrated>
        <Guarded role={role}>{children}</Guarded>
      </Hydrated>
      <SiteFooter />
    </div>
  );
}

function Guarded({ role, children }: { role: Role; children: ReactNode }) {
  const persona = useDemo((s) => s.persona);
  const project = useNarratorProject();
  const { pathname, replace } = useNav();
  const needsOnboarding = role === "narrateur" && project && !project.onboarded && pathname !== "/narrateur/bienvenue";
  useEffect(() => {
    if (needsOnboarding) replace("/narrateur/bienvenue");
  }, [needsOnboarding, replace]);

  const allowed = persona.role === role && (role !== "narrateur" || (!!project && project.invitation.status === "acceptee"));
  return (
    <>
      <AppHeader role={role} allowed={allowed} />
      <main id="contenu" className="flex-1">
        {allowed ? needsOnboarding ? null : children : <AccessDenied role={role} persona={persona} />}
      </main>
    </>
  );
}

function AppHeader({ role, allowed }: { role: Role; allowed: boolean }) {
  const { pathname } = useNav();
  const project = useNarratorProject();
  const persona = useDemo((s) => s.persona);
  const projects = useDemo((s) => s.projects);
  const items = NAV[role];
  const active = (h: string, match?: string[]) =>
    pathname === h || (h !== `/${pathname.split("/")[1]}` && pathname.startsWith(h + "/")) || !!match?.some((m) => pathname.startsWith(m));
  const name = role === "acheteur" ? FAMILY.buyer.name : role === "editeur" ? (persona.role === "editeur" ? persona.name ?? FAMILY.editor.name : FAMILY.editor.name) : role === "ops" ? "Équipe Filémoire" : project ? `${project.narrator.firstName} ${project.narrator.lastName}` : "";
  const showNav = allowed && !(role === "narrateur" && project && !project.onboarded);
  return (
    <header className="no-print border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex h-[68px] items-center gap-4">
        <Logo href={homeOf(persona)} />
        <span className="hidden rounded-full bg-creme-200 px-3 py-1 text-xs font-semibold text-prune lg:inline">
          {{ acheteur: "Espace acheteur", narrateur: "Mon espace", editeur: "Espace éditeur familial", ops: "Opérations (interne)" }[role]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch />
          {allowed && <NotificationBell to={role} projectId={role === "narrateur" ? project?.id : undefined} />}
          {allowed && (
            <span className="hidden items-center gap-2 sm:flex" title={personaLabel(persona, projects)}>
              <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-prune text-sm font-semibold text-creme">
                {initials(name || "F")}
              </span>
              <span className="text-[15px] font-medium text-ink">{name}</span>
            </span>
          )}
        </div>
      </div>
      {showNav && (
        <nav aria-label="Navigation de l'espace" className="container-page -mb-px flex gap-1 overflow-x-auto">
          {items.map((it) => {
            const on = active(it.href, it.match);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-[3px] px-3 py-3 text-[15px] no-underline transition-colors sm:px-4",
                  on ? "border-terre font-semibold text-prune" : "border-transparent text-ink-muted hover:text-prune",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

function AccessDenied({ role, persona }: { role: Role; persona: Persona }) {
  const projects = useDemo((s) => s.projects);
  const nav = useNav();
  const narrators = projects.filter((p) => p.invitation.status === "acceptee");
  const become = (p: Persona) => {
    useDemo.getState().setPersona(p);
    nav.push(homeOf(p) === "/narrateur" && role === "narrateur" ? nav.pathname : homeOf(p));
  };
  return (
    <div className="container-page max-w-2xl py-16">
      <div className="card p-6 sm:p-8">
        <ShieldAlert className="size-10 text-terre" aria-hidden />
        <h1 className="mt-4 text-3xl">Cet espace est réservé à {ROLE_NAME[role]}</h1>
        <p className="mt-3 text-ink-muted">
          Vous êtes actuellement : <strong className="text-ink">{personaLabel(persona, projects)}</strong>. Filémoire n'affiche jamais un espace à une personne qui n'y est pas autorisée.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Dans ce prototype, la vérification se fait dans le navigateur ; en production, le serveur refuserait la requête.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {role === "narrateur" ? (
            narrators.length ? (
              narrators.map((p) => (
                <Button key={p.id} onClick={() => become({ role: "narrateur", projectId: p.id })}>
                  Démo : devenir {p.narrator.firstName} {p.narrator.lastName}
                </Button>
              ))
            ) : (
              <p className="rounded-md bg-creme-200 p-3 text-sm">
                Aucun narrateur n'a encore accepté d'invitation. Commencez par <Link href="/acheteur/offrir">offrir Filémoire</Link>, puis ouvrez l'invitation dans la <Link href="/demo/boite-mail">boîte e-mail de démonstration</Link>.
              </p>
            )
          ) : (
            <Button onClick={() => become({ role } as Persona)}>Démo : changer de rôle</Button>
          )}
          <Button variant="outline" asChild>
            <Link href={homeOf(persona)}>Retour à mon espace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
