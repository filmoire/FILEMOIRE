"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, locale } from "@/i18n/core";

export type DashboardRole = "buyer" | "editor" | "narrator" | "operations";
export const ROLE_LABEL: Record<DashboardRole, string> = {
  buyer: "Acheteur",
  editor: "Éditeur familial",
  narrator: "Narrateur",
  operations: "Opérations",
};
export const DASH_NAV: Record<DashboardRole, [string, string][]> = {
  buyer: [
    ["accueil", "Tableau de bord"],
    ["cadeaux", "Mes cadeaux"],
    ["suivi", "Suivi"],
    ["commandes", "Commandes"],
  ],
  editor: [
    ["accueil", "Accueil"],
    ["livres", "Livres confiés"],
    ["propositions", "Mes propositions"],
  ],
  narrator: [
    ["accueil", "Mes livres"],
    ["commandes", "Commandes"],
  ],
  operations: [
    ["accueil", "Vue d’ensemble"],
    ["commandes", "Commandes"],
    ["projets", "Projets"],
    ["questions", "Questions"],
    ["impression", "Impression"],
    ["support", "Support"],
  ],
};
export function dashboardHref(
  role: DashboardRole,
  view = "accueil",
  extra: Record<string, string> = {},
) {
  return `/espace?${new URLSearchParams({ role, vue: view, ...extra })}`;
}
export function PageIntro({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="dash-intro">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action && <div className="dash-intro-action">{action}</div>}
    </div>
  );
}
export function GiftLink() {
  return (
    <Button asChild>
      <Link href="/offrir">
        Offrir un cadeau <ArrowUpRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
export function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="dash-badge">{children}</span>;
}
export function EmptyPanel({
  title,
  children,
  illustration,
  action,
}: {
  title: ReactNode;
  children: ReactNode;
  illustration?: "cadeau" | "lecture" | "relecture";
  action?: ReactNode;
}) {
  return illustration ? (
    <section className="dash-empty">
      <div className="dash-empty-copy">
        <h2>{title}</h2>
        <p>{children}</p>
        {action}
      </div>
      <img
        src={`/dashboard/${illustration}.webp`}
        width={1200}
        height={800}
        alt=""
      />
    </section>
  ) : (
    <section className="dash-blank">
      <h2>{title}</h2>
      <p>{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
export function PrivacyNotice() {
  return (
    <p className="dash-notice">
      Accès limité aux métadonnées (statuts, dates, quantités). La lecture d’un
      récit exige une autorisation temporaire accordée par le narrateur.
    </p>
  );
}
export function Pagination({
  total,
  page,
  href,
  size = 25,
}: {
  total: number;
  page: number;
  href: (page: number) => string;
  size?: number;
}) {
  return (
    <nav className="dash-pagination" aria-label="Pagination">
      <p role="status">
        {total === 0
          ? tr("Aucun résultat")
          : `${(page - 1) * size + 1}–${Math.min(page * size, total)} / ${total}`}
      </p>
      <div className="dash-actions">
        {page > 1 ? (
          <Button asChild variant="outline">
            <Link href={href(page - 1)}>Précédent</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Précédent
          </Button>
        )}
        {page * size < total ? (
          <Button asChild variant="outline">
            <Link href={href(page + 1)}>Suivant</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Suivant
          </Button>
        )}
      </div>
    </nav>
  );
}
export const money = (cents: number) =>
  (cents / 100).toLocaleString(locale(), {
    style: "currency",
    currency: "EUR",
  });
export const dateLabel = (value: string | number) =>
  new Date(value).toLocaleDateString(locale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const PAYMENT_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payée",
  refunded: "Remboursée",
  expired: "Expirée",
};
