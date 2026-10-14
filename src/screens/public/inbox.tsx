"use client";

import { Inbox } from "lucide-react";
import { useState } from "react";
import { Hydrated } from "@/components/shell/providers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { cn, fmtDateTime } from "@/lib/utils";

export function InboxScreen() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Démonstration" title="Boîte e-mail simulée" intro="Aucun e-mail n'est réellement envoyé. Les invitations, confirmations et rappels sont capturés ici pour la démonstration." />
      <Hydrated>
        <Mailbox />
      </Hydrated>
    </div>
  );
}

function Mailbox() {
  const emails = useDemo((s) => s.emails);
  const [to, setTo] = useState("");
  const [sel, setSel] = useState<string>();
  const recipients = [...new Set(emails.map((e) => e.to))];
  const list = emails.filter((e) => !to || e.to === to);
  const cur = list.find((e) => e.id === sel) ?? list[0];
  if (!emails.length)
    return (
      <div className="mt-8">
        <EmptyState icon={<Inbox />} title="Aucun e-mail pour l'instant" action={<Button asChild><Link href="/acheteur/offrir">Offrir Filémoire</Link></Button>}>
          Les e-mails apparaîtront après un achat, une invitation ou un rappel.
        </EmptyState>
      </div>
    );
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <label htmlFor="mail-to" className="text-sm font-medium">
          Destinataire
        </label>
        <Select id="mail-to" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1">
          <option value="">Tous ({emails.length})</option>
          {recipients.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <ul className="mt-3 space-y-2">
          {list.map((e) => (
            <li key={e.id}>
              <button onClick={() => setSel(e.id)} aria-current={cur?.id === e.id ? "true" : undefined} className={cn("w-full rounded-lg border bg-white p-3 text-left", cur?.id === e.id ? "border-prune ring-1 ring-prune" : "border-line hover:border-or")}>
                <span className="block font-semibold text-ink">{e.subject}</span>
                <span className="block break-words text-xs text-ink-muted">
                  À : {e.to} · {fmtDateTime(e.at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {cur && (
        <article className="card self-start p-6 sm:p-8" aria-label="E-mail sélectionné">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-or-700">Filémoire</p>
          <h2 className="mt-2 text-2xl">{cur.subject}</h2>
          <p className="mt-1 break-words text-sm text-ink-muted">
            À : {cur.to} · {fmtDateTime(cur.at)}
          </p>
          <div className="mt-6 space-y-3 text-[16px]">
            {cur.lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          {cur.cta && (
            <Button size="lg" className="mt-6" asChild>
              <Link href={cur.cta.href}>{cur.cta.label}</Link>
            </Button>
          )}
          <p className="quote mt-8 border-t border-line pt-4 text-lg">Une question à la fois, une vie à transmettre.</p>
          <Alert tone="sim" className="mt-4">E-mail simulé : en production, envoi par un service transactionnel (non branché ici).</Alert>
        </article>
      )}
    </div>
  );
}
