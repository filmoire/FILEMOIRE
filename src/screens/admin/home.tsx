"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { BOOK_FLOW, isLowRes, progress } from "@/lib/rules";
import { useDemo, useNow } from "@/lib/store";
import { DAY, fmtEur } from "@/lib/utils";
import { OpsHeader } from "./shared";

export function AdminHome() {
  const orders = useDemo((s) => s.orders);
  const projects = useDemo((s) => s.projects);
  const ext = useDemo((s) => s.externalProjects);
  const support = useDemo((s) => s.support);
  const now = useNow();
  const paid = orders.filter((o) => o.status === "payee");
  const inv = [...projects.map((p) => p.invitation.status), ...ext.map((e) => e.invitation)];
  const accepted = inv.filter((s) => s === "acceptee").length;
  const sent = inv.filter((s) => s !== "programmee" && s !== "revoquee").length;
  const printing = [...projects.map((p) => p.book.status), ...ext.map((e) => e.status)].filter((s) => BOOK_FLOW.indexOf(s) >= BOOK_FLOW.indexOf("approuve") && s !== "livre").length;
  const avg = projects.filter((p) => p.startedAt).map((p) => progress(p).answered);
  const alerts: { t: string; href: string }[] = [
    ...projects.filter((p) => p.invitation.status === "envoyee" && p.invitation.expiresAt - now < 7 * DAY).map((p) => ({ t: `Invitation de ${p.narrator.firstName} ${p.narrator.lastName} : expire dans moins de 7 jours`, href: "/admin/projets" })),
    ...projects.filter((p) => p.invitation.status === "expiree").map((p) => ({ t: `Invitation expirée : ${p.narrator.firstName} ${p.narrator.lastName}`, href: "/admin/projets" })),
    ...projects.filter((p) => p.book.status === "preparation" && !p.print.preflightRunAt).map((p) => ({ t: `Préflight à lancer : livre de ${p.narrator.firstName}`, href: "/admin/impression" })),
    ...projects.filter((p) => BOOK_FLOW.indexOf(p.book.status) >= BOOK_FLOW.indexOf("approuve") && p.photos.some((ph) => ph.inBook && isLowRes(ph))).map((p) => ({ t: `Photos en basse résolution dans le livre de ${p.narrator.firstName}`, href: "/admin/impression" })),
    ...projects.filter((p) => p.print.incident).map((p) => ({ t: `Incident d'impression : livre de ${p.narrator.firstName}`, href: "/admin/impression" })),
    ...support.filter((s) => s.status === "ouverte").map((s) => ({ t: `Support ${s.ref} : ${s.subject}`, href: "/admin/support" })),
  ];
  return (
    <div className="container-page py-10">
      <OpsHeader title="Vue d'ensemble" intro="Activation, production et support, sans accès au contenu des récits." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Commandes payées (test)" value={paid.length} sub={`${fmtEur(paid.reduce((s, o) => s + o.total, 0))} TTC simulés`} />
        <Stat label="Activation des narrateurs" value={sent ? `${Math.round((accepted / sent) * 100)} %` : "—"} sub={`${accepted} invitation(s) acceptée(s) sur ${sent} envoyée(s)`} />
        <Stat label="Livres en production" value={printing} sub="De la validation à l'expédition" />
        <Stat label="Demandes de support ouvertes" value={support.filter((s) => s.status !== "resolue").length} sub={avg.length ? `Moyenne : ${Math.round(avg.reduce((a, b) => a + b, 0) / avg.length)} question(s) racontée(s) par projet actif` : undefined} />
      </div>
      <section className="mt-10" aria-labelledby="h-alerts">
        <h2 id="h-alerts" className="text-2xl">
          À traiter
        </h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-ink-muted">Rien d'urgent.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-white">
            {alerts.map((a, i) => (
              <li key={i}>
                <Link href={a.href} className="flex items-center gap-3 px-4 py-3 no-underline hover:bg-creme-200">
                  <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
                  <span className="flex-1 text-ink">{a.t}</span>
                  <ArrowRight className="size-4 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="secondary" asChild><Link href="/admin/impression">File d'impression</Link></Button>
        <Button variant="outline" asChild><Link href="/admin/questions">Bibliothèque de questions</Link></Button>
      </div>
    </div>
  );
}
