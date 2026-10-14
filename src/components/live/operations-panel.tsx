"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "./client";
import { Message } from "./shell";
type Operations = {
  prints: {
    id: string;
    status: string;
    tracking: string | null;
    incident: string | null;
  }[];
  orders: { id: string; total: number; status: string }[];
};
type Ticket = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
};
export function OperationsPanel() {
  const [data, setData] = useState<Operations | null>(null),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [ops, support] = await Promise.all([
      api<Operations>("admin/operations"),
      api<{ tickets: Ticket[] }>("admin/support"),
    ]);
    setData(ops);
    setTickets(support.tickets);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      await refresh();
      setSuccess("Opération enregistrée.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-8">
      <Message error={error} success={success} />
      <Button
        variant="outline"
        onClick={() => void run(refresh)}
        disabled={busy}
      >
        Actualiser les opérations
      </Button>
      <section>
        <h3>Production et livraison</h3>
        {data?.prints.map((p) => (
          <form
            key={p.id}
            className="my-4 space-y-3 rounded border border-line p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(() =>
                api(`admin/print/${p.id}`, {
                  status: f.get("status"),
                  tracking: String(f.get("tracking") ?? ""),
                  incident: String(f.get("incident") ?? ""),
                }),
              );
            }}
          >
            <p>
              {p.id} · {p.status}
            </p>
            <label className="block">
              Nouveau statut
              <select
                name="status"
                className="ml-3 rounded border border-line p-2"
              >
                <option value="impression">En impression</option>
                <option value="expedie">Expédié</option>
                <option value="livre">Livré</option>
                <option value="incident">Incident</option>
              </select>
            </label>
            <label className="block">
              Référence de suivi
              <Input
                name="tracking"
                defaultValue={p.tracking ?? ""}
                maxLength={200}
              />
            </label>
            <label className="block">
              Incident
              <Input
                name="incident"
                defaultValue={p.incident ?? ""}
                maxLength={1000}
              />
            </label>
            <Button type="submit" disabled={busy}>
              Enregistrer le statut
            </Button>
          </form>
        ))}
      </section>
      <section>
        <h3>Remboursements</h3>
        {data?.orders
          .filter((o) => o.status === "paid")
          .map((o) => (
            <div key={o.id} className="my-4 flex flex-wrap items-center gap-4">
              <p>
                {o.id.slice(0, 8)} · {(o.total / 100).toFixed(2)} €
              </p>
              <Button
                variant="danger-outline"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Rembourser intégralement la commande ${o.id.slice(0, 8)} ?`,
                    )
                  )
                    void run(() =>
                      api(`admin/refund/${o.id}`, {
                        requestKey: crypto.randomUUID(),
                      }),
                    );
                }}
              >
                Rembourser la commande
              </Button>
            </div>
          ))}
      </section>
      <section>
        <h3>Demandes de support et devis</h3>
        {tickets.map((t) => (
          <article
            key={t.id}
            className="my-4 space-y-3 rounded border border-line p-4"
          >
            <p>
              {t.name} · {t.email} · {t.topic} · {t.status}
            </p>
            <p className="whitespace-pre-wrap">{t.message}</p>
            {t.status === "open" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(() =>
                    api(`admin/support/${t.id}`, { text: f.get("reply") }),
                  );
                }}
              >
                <label className="block">
                  Réponse envoyée par e-mail
                  <Textarea
                    name="reply"
                    required
                    minLength={5}
                    maxLength={5000}
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  Envoyer la réponse au demandeur
                </Button>
              </form>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
