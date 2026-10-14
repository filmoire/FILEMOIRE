import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/misc";

export function OpsHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Opérations · interne" title={title} intro={intro} actions={actions} />
      <Alert tone="privacy" className="mt-5">
        Accès limité aux métadonnées (statuts, dates, quantités). La lecture d'un récit exige une autorisation temporaire accordée par le narrateur. Toutes les familles sont fictives.
      </Alert>
    </>
  );
}

export function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[760px] text-left text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-creme-200/70 text-sm text-ink-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
