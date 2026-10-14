import { Check } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { BOOK_FLOW, BOOK_LABEL, MEMORY_STATE_LABEL, type MemoryState } from "@/lib/rules";
import type { BookStatus, Invitation, Order, QuestionStatus, SupportCase } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

export const INVITATION: Record<Invitation["status"], [string, Tone]> = {
  programmee: ["Programmée", "info"],
  envoyee: ["Envoyée, en attente", "warning"],
  acceptee: ["Acceptée", "success"],
  expiree: ["Expirée", "danger"],
  revoquee: ["Annulée", "neutral"],
};
export const QUESTION: Record<QuestionStatus, [string, Tone]> = {
  verrouillee: ["À venir", "neutral"],
  disponible: ["À raconter", "terre"],
  brouillon: ["Brouillon", "warning"],
  repondue: ["Racontée", "success"],
  passee: ["Passée", "neutral"],
  reportee: ["Reportée", "info"],
};
export const ORDER: Record<Order["status"], [string, Tone]> = {
  en_attente: ["Paiement en attente", "warning"],
  payee: ["Payée (test)", "success"],
  annulee: ["Annulée", "neutral"],
};
export const SUPPORT: Record<SupportCase["status"], [string, Tone]> = {
  ouverte: ["Ouverte", "warning"],
  en_cours: ["En cours", "info"],
  resolue: ["Résolue", "success"],
};
const MEMORY_TONE: Record<MemoryState, Tone> = { brouillon: "warning", masque: "neutral", en_relecture: "info", approuve: "success", partage: "prune", prive: "or" };
const BOOK_TONE = (s: BookStatus): Tone => (s === "brouillon" ? "neutral" : s.startsWith("relecture") ? "info" : s === "approuve" ? "success" : s === "livre" ? "success" : "prune");

export const InvitationBadge = ({ s }: { s: Invitation["status"] }) => <Badge tone={INVITATION[s][1]}>{INVITATION[s][0]}</Badge>;
export const QuestionBadge = ({ s }: { s: QuestionStatus }) => <Badge tone={QUESTION[s][1]}>{QUESTION[s][0]}</Badge>;
export const OrderBadge = ({ s }: { s: Order["status"] }) => <Badge tone={ORDER[s][1]}>{ORDER[s][0]}</Badge>;
export const MemoryBadge = ({ s }: { s: MemoryState }) => <Badge tone={MEMORY_TONE[s]}>{MEMORY_STATE_LABEL[s]}</Badge>;
export const BookBadge = ({ s }: { s: BookStatus }) => <Badge tone={BOOK_TONE(s)}>{BOOK_LABEL[s]}</Badge>;

/** Frise du livre : Brouillon → … → Livré. */
export function BookPipeline({ status, events }: { status: BookStatus; events?: { at: number; status: string }[] }) {
  const cur = BOOK_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-label="Étapes du livre">
      {BOOK_FLOW.map((s, i) => {
        const done = i < cur;
        const on = i === cur;
        const ev = events?.filter((e) => e.status === s).at(-1);
        return (
          <li key={s} className={cn("rounded-md border p-2.5 text-sm", on ? "border-prune bg-prune text-creme" : done ? "border-success/30 bg-success-bg" : "border-line bg-white text-ink-muted")} aria-current={on ? "step" : undefined}>
            <span className="flex items-center gap-1 font-semibold">
              {done && <Check className="size-3.5 text-success" aria-hidden />}
              {BOOK_LABEL[s]}
            </span>
            {ev && <span className={cn("block text-xs", on ? "text-creme/80" : "text-ink-muted")}>{fmtDate(ev.at)}</span>}
            <span className="sr-only">{done ? "terminé" : on ? "étape actuelle" : "à venir"}</span>
          </li>
        );
      })}
    </ol>
  );
}
