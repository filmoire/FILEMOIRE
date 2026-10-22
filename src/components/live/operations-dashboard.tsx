"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import type { Account } from "@/server/auth";
import type { dashboardOverview } from "@/server/dashboard";
import type { ProjectView } from "./dashboard";
import { ProjectWorkspace } from "./workspace";
import { api } from "./client";
import { Form } from "./form";
import { Message } from "./shell";
import { QuestionLibrary } from "./question-library";
import {
  PageIntro,
  EmptyPanel,
  StatusBadge,
  PrivacyNotice,
  Pagination,
  dashboardHref,
  PAYMENT_LABEL,
  money,
  dateLabel,
} from "./dashboard-ui";
import { tr } from "@/i18n/core";
import { BOOK_LABEL } from "@/lib/rules";

type Overview = Awaited<ReturnType<typeof dashboardOverview>>;
type RecordRow = {
  id: string;
  status: string;
  created_at: string;
  total: number;
  kind: string;
  activated: boolean;
  support_access: boolean;
  project_id: string;
  tracking: string | null;
  incident: string | null;
  name: string;
  email: string;
  message: string;
  topic: string;
};
type Records = { rows: RecordRow[]; total: number; page: number };
const titles: Record<string, string> = {
  accueil: "Vue d’ensemble",
  commandes: "Commandes",
  projets: "Projets et parcours",
  questions: "Bibliothèque de questions",
  impression: "File d’impression",
  support: "Demandes de support",
};
const statusLabel = (status: string) =>
  PAYMENT_LABEL[status] ??
  (
    {
      draft: "Brouillon",
      requested: "Demandée",
      incident: "Incident",
      open: "Ouverte",
      replied: "Répondue",
      closed: "Fermée",
      ...BOOK_LABEL,
    } as Record<string, string>
  )[status] ??
  status;
export function OperationsDashboard({
  account,
  refreshAccount,
  view,
}: {
  account: Account;
  refreshAccount: () => Promise<void>;
  view: string;
}) {
  return (
    <>
      <PageIntro title={titles[view]}>
        {view === "accueil"
          ? "Activation, production et support, sans accès au contenu des récits."
          : view === "questions"
            ? "Les modifications s’appliquent aux nouveaux parcours, jamais aux parcours en cours."
            : view === "impression"
              ? "Préparation, impression, expédition et incidents."
              : view === "support"
                ? "Résoudre un problème technique sans banaliser la sensibilité du contenu."
                : "Retrouvez les statuts et les informations nécessaires au suivi."}
      </PageIntro>
      <PrivacyNotice />
      {!account.mfa ? (
        <MfaGate refresh={refreshAccount} />
      ) : view === "accueil" ? (
        <OverviewPanel />
      ) : view === "questions" ? (
        <QuestionLibrary />
      ) : (
        <RecordsPanel key={view} view={view} />
      )}
    </>
  );
}
function MfaGate({ refresh }: { refresh: () => Promise<void> }) {
  const [uri, setUri] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="dash-blank space-y-5">
      <h2>Confirmez votre identité</h2>
      <p>
        Confirmez votre code d’authentification pour accéder aux opérations.
      </p>
      <Message error={error} />
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            setUri((await api<{ uri: string }>("auth/mfa/setup", {})).uri);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Configurer un authentificateur
      </Button>
      {uri && (
        <p>
          <a className="underline" href={uri}>
            Ajouter à mon authentificateur
          </a>
        </p>
      )}
      <Form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            await api("auth/mfa/verify", { code: form.get("code") });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Code de l’authentificateur
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            className="mt-2"
          />
        </label>
        <Button type="submit" disabled={busy} aria-busy={busy}>
          Vérifier
        </Button>
      </Form>
    </section>
  );
}
function OverviewPanel() {
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api<Overview>("admin/dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Message error={error} />
      {error && (
        <Button variant="outline" onClick={() => void load()}>
          Réessayer
        </Button>
      )}
      {data ? (
        <>
          <div className="dash-metrics">
            {[
              ["Commandes payées", data.paid, money(data.revenue), "commandes"],
              [
                "Activation des narrateurs",
                data.projects
                  ? `${Math.round((data.accepted / data.projects) * 100)} %`
                  : "—",
                `${data.accepted} / ${data.projects}`,
                "projets",
              ],
              [
                "Livres en production",
                data.production,
                "De la validation à l’expédition",
                "impression",
              ],
              [
                "Demandes de support ouvertes",
                data.openSupport,
                "Demandes à suivre",
                "support",
              ],
            ].map(([label, value, detail, destination]) => (
              <Link
                className="dash-metric"
                key={String(destination)}
                href={dashboardHref("operations", String(destination))}
              >
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </Link>
            ))}
          </div>
          <h2>À traiter</h2>
          {data.openSupport ? (
            <Link
              className="dash-work-link"
              href={dashboardHref("operations", "support", { status: "open" })}
            >
              Demandes de support ouvertes <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p>Aucune demande de support à traiter.</p>
          )}
          {data.jobs.map((job) => (
            <div className="dash-row" key={job.id}>
              <p>
                {job.kind} · {job.attempts} tentative(s)
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`admin/retry-job/${job.id}`, {});
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Réessayer
              </Button>
            </div>
          ))}
          <div className="dash-actions mt-8">
            <Button asChild variant="outline">
              <Link href={dashboardHref("operations", "impression")}>
                File d’impression
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={dashboardHref("operations", "questions")}>
                Bibliothèque de questions
              </Link>
            </Button>
          </div>
        </>
      ) : (
        !error && <p role="status">Chargement des opérations…</p>
      )}
    </>
  );
}
function RecordsPanel({ view }: { view: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const page = Math.max(1, Number(params.get("page")) || 1),
    status = params.get("status") ?? "";
  const [data, setData] = useState<Records | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  const [action, setAction] = useState<{
    kind: "refund" | "print" | "reply";
    row: RecordRow;
    key: string;
  } | null>(null);
  const [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false);
  const cancelAction = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    api<Records>(
      `admin/records/${view}?${new URLSearchParams({ page: String(page), status })}`,
    )
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [view, page, status, reload]);
  const href = (next: number, filter = status) =>
    dashboardHref("operations", view, {
      page: String(next),
      ...(filter ? { status: filter } : {}),
    });
  const options: Record<string, string[]> = {
    commandes: ["paid", "pending", "refunded", "expired"],
    projets: [],
    impression: [
      "requested",
      "preparation",
      "impression",
      "expedie",
      "livre",
      "incident",
    ],
    support: ["open", "replied", "closed"],
  };
  const openAction = (kind: "refund" | "print" | "reply", row: RecordRow) => {
    setActionError("");
    setAction({ kind, row, key: crypto.randomUUID() });
  };
  const selectedId = view === "projets" ? params.get("livre") : null;
  return (
    <>
      <div className="dash-toolbar">
        {options[view].length > 0 && (
          <label>
            Statut
            <Select
              className="mt-2 min-w-40"
              value={status}
              onChange={(e) => router.push(href(1, e.target.value))}
            >
              <option value="">Toutes</option>
              {options[view].map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </Select>
          </label>
        )}
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => setReload((v) => v + 1)}
        >
          Actualiser
        </Button>
      </div>
      <Message error={error} success={success} />
      {error && (
        <Button variant="outline" onClick={() => setReload((v) => v + 1)}>
          Réessayer
        </Button>
      )}
      {loading ? (
        <p role="status" className="py-12">
          Chargement…
        </p>
      ) : data && data.rows.length === 0 ? (
        <EmptyPanel
          title={
            status
              ? "Aucun résultat pour ce filtre"
              : ({
                  commandes: "Aucune commande",
                  projets: "Aucun projet pour l’instant",
                  impression: "Aucun livre dans la file",
                  support: "Aucune demande de support",
                }[view] ?? "Aucun résultat")
          }
        >
          {status
            ? "Essayez un autre statut ou affichez toutes les entrées."
            : "Les nouvelles entrées apparaîtront ici."}
        </EmptyPanel>
      ) : (
        data &&
        (view === "support" ? (
          <div className="dash-tickets">
            {data.rows.map((row) => (
              <article className="dash-ticket" key={row.id}>
                <div className="dash-actions justify-between mb-5">
                  <StatusBadge>{statusLabel(row.status)}</StatusBadge>
                  <small>{dateLabel(row.created_at)}</small>
                </div>
                <h2>
                  {row.topic === "devis" ? "Demande de devis" : "Question"}
                </h2>
                <p translate="no" className="dash-quiet text-sm mb-4">
                  {row.name} · {row.email}
                </p>
                <p translate="no" className="whitespace-pre-wrap mb-5">
                  {row.message}
                </p>
                {row.status === "open" && (
                  <Button
                    variant="outline"
                    onClick={() => openAction("reply", row)}
                  >
                    Répondre
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div
            className="dash-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={tr(titles[view])}
          >
            <table className="dash-table">
              <caption className="sr-only">{titles[view]}</caption>
              <thead>
                <tr>
                  {(view === "commandes"
                    ? ["Référence", "Date", "Total TTC", "Paiement", "Action"]
                    : view === "projets"
                      ? [
                          "Référence",
                          "Type de livre",
                          "Invitation",
                          "Livre",
                          "Accès support",
                        ]
                      : ["Commande", "Livre", "Statut", "Suivi", "Action"]
                  ).map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td translate="no">{row.id.slice(0, 8).toUpperCase()}</td>
                    {view === "commandes" ? (
                      <>
                        <td>{dateLabel(row.created_at)}</td>
                        <td>{money(row.total)}</td>
                        <td>
                          <StatusBadge>{statusLabel(row.status)}</StatusBadge>
                        </td>
                        <td>
                          {row.status === "paid" && (
                            <Button
                              variant="danger-outline"
                              size="sm"
                              onClick={() => openAction("refund", row)}
                            >
                              Rembourser
                            </Button>
                          )}
                        </td>
                      </>
                    ) : view === "projets" ? (
                      <>
                        <td>
                          {row.kind === "personal"
                            ? "Manuscrit personnel"
                            : "Cadeau"}
                        </td>
                        <td>{row.activated ? "Acceptée" : "En attente"}</td>
                        <td>
                          <StatusBadge>{statusLabel(row.status)}</StatusBadge>
                        </td>
                        <td>
                          {row.support_access ? (
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={dashboardHref("operations", "projets", {
                                  livre: row.id,
                                })}
                              >
                                Lire avec autorisation
                              </Link>
                            </Button>
                          ) : (
                            "Aucun accès"
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td translate="no">{row.project_id.slice(0, 8)}</td>
                        <td>
                          <StatusBadge>{statusLabel(row.status)}</StatusBadge>
                        </td>
                        <td translate="no">
                          {row.tracking || "—"}
                          {row.incident && <small>{row.incident}</small>}
                        </td>
                        <td>
                          {row.status !== "livre" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAction("print", row)}
                            >
                              Mettre à jour
                            </Button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
      {data && <Pagination total={data.total} page={data.page} href={href} />}
      {selectedId && <AuthorizedBook key={selectedId} id={selectedId} />}
      <Dialog
        appearance="dashboard"
        initialFocusRef={action?.kind === "refund" ? cancelAction : undefined}
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
        title={tr(
          action?.kind === "refund"
            ? "Rembourser la commande"
            : action?.kind === "print"
              ? "Mettre à jour l’impression"
              : "Répondre à la demande",
        )}
        description={tr(
          action?.kind === "refund"
            ? "Le montant total sera remboursé. Cette action financière ne peut pas être annulée."
            : action?.kind === "print"
              ? "Enregistrez uniquement une étape confirmée par votre imprimeur."
              : "La réponse sera envoyée par e-mail au demandeur.",
        )}
      >
        {action && (
          <Form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const f = new FormData(event.currentTarget);
              setBusy(true);
              setActionError("");
              try {
                if (action.kind === "refund")
                  await api(`admin/refund/${action.row.id}`, {
                    requestKey: action.key,
                  });
                if (action.kind === "print")
                  await api(`admin/print/${action.row.id}`, {
                    status: f.get("status"),
                    tracking: f.get("tracking"),
                    incident: f.get("incident"),
                  });
                if (action.kind === "reply")
                  await api(`admin/support/${action.row.id}`, {
                    text: f.get("reply"),
                  });
                setAction(null);
                setSuccess("Opération enregistrée.");
                setReload((v) => v + 1);
              } catch (e) {
                setActionError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Message error={actionError} />
            {action.kind === "refund" ? (
              <p>
                {money(action.row.total)} ·{" "}
                <span translate="no">{action.row.id.slice(0, 8)}</span>
              </p>
            ) : action.kind === "reply" ? (
              <label className="block">
                Réponse envoyée par e-mail
                <Textarea
                  name="reply"
                  required
                  minLength={5}
                  maxLength={5000}
                  className="mt-2"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  Nouveau statut
                  <Select name="status" className="mt-2">
                    {["impression", "expedie", "livre", "incident"].map(
                      (value) => (
                        <option key={value} value={value}>
                          {statusLabel(value)}
                        </option>
                      ),
                    )}
                  </Select>
                </label>
                <label className="block">
                  Référence de suivi
                  <Input
                    className="mt-2"
                    name="tracking"
                    maxLength={200}
                    defaultValue={action.row.tracking ?? ""}
                  />
                </label>
                <label className="block">
                  Incident
                  <Input
                    className="mt-2"
                    name="incident"
                    maxLength={1000}
                    defaultValue={action.row.incident ?? ""}
                  />
                </label>
              </>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                ref={cancelAction}
                variant="outline"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                variant={action.kind === "refund" ? "danger" : "primary"}
              >
                {action.kind === "refund"
                  ? "Rembourser la commande"
                  : action.kind === "reply"
                    ? "Envoyer la réponse au demandeur"
                    : "Enregistrer le statut"}
              </Button>
            </div>
          </Form>
        )}
      </Dialog>
    </>
  );
}

/** Recheck the current grant on every open; never reuse a cached support book. */
function AuthorizedBook({ id }: { id: string }) {
  const [book, setBook] = useState<ProjectView | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBook(null);
    setError("");
    api<ProjectView>(`projects/${id}`)
      .then((value) => {
        if (active) setBook(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  return (
    <section className="mt-12">
      <Message error={error} />
      {error ? (
        <Button variant="outline" onClick={() => setReload((v) => v + 1)}>
          Réessayer
        </Button>
      ) : book ? (
        <>
          <h2>Accès temporaire autorisé</h2>
          <ProjectWorkspace
            view={book}
            update={setBook}
            refresh={async () => setReload((v) => v + 1)}
          />
        </>
      ) : (
        <p role="status">Chargement…</p>
      )}
    </section>
  );
}
