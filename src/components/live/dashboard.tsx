"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/i18n/lang";
import { tr } from "@/i18n/core";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import type { Account } from "@/server/auth";
import type { projectView } from "@/server/projects";
import { BOOK_LABEL } from "@/lib/rules";
import { PACKAGES, THEMES } from "@/lib/catalog";
import { api, confirmNavigation } from "./client";
import { confirmAction } from "./confirmation";
import { LiveShell, Message } from "./shell";
import { CreateBook } from "./create-book";
import { ProjectWorkspace } from "./workspace";
import { OperationsDashboard } from "./operations-dashboard";
import {
  PageIntro,
  EmptyPanel,
  GiftLink,
  StatusBadge,
  dashboardHref,
  DASH_NAV,
  ROLE_LABEL,
  PAYMENT_LABEL,
  dateLabel,
  money,
  type DashboardRole,
} from "./dashboard-ui";
export type ProjectView = ReturnType<typeof projectView>;

export function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The language store can restore English before this Suspense boundary
  // hydrates. Keep the server and first client render language-independent;
  // mount the authenticated workspace once, preserving drafts on language changes.
  return mounted ? (
    <DashboardContent />
  ) : (
    <p className="container-page py-12" role="status" translate="no">
      Filémoire…
    </p>
  );
}

function DashboardContent() {
  const lang = useLang((s) => s.lang);
  const params = useSearchParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [personalDrafts, setPersonalDrafts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const me = await api<{
        account: Account | null;
        personalDraftsEnabled: boolean;
      }>("me");
      if (!me.account) {
        location.href = "/acces";
        return;
      }
      const result = await api<{ projects: ProjectView[] }>("projects");
      setAccount(me.account);
      setProjects(result.projects);
      setPersonalDrafts(me.personalDraftsEnabled);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const roles: DashboardRole[] = [
    ...(account?.admin ? ["operations" as const] : []),
    ...(projects.some((p) => p.role === "narrator") || personalDrafts
      ? ["narrator" as const]
      : []),
    // The empty shared-books landing is available before an invitation arrives.
    // Project access still comes exclusively from server-authorized memberships.
    "editor",
    "buyer",
  ];
  const defaultRole = account?.admin
    ? "operations"
    : projects.some((p) => p.role === "narrator")
      ? "narrator"
      : projects.some((p) => ["editor", "contributor"].includes(p.role))
        ? "editor"
        : projects.length === 0 && personalDrafts
          ? "narrator"
          : "buyer";
  const requested = params.get("role") as DashboardRole;
  const role = roles.includes(requested) ? requested : defaultRole;
  const view = DASH_NAV[role].some(([key]) => key === params.get("vue"))
    ? params.get("vue")!
    : "accueil";
  const relevant = projects.filter((p) =>
    role === "narrator"
      ? p.role === "narrator"
      : role === "editor"
        ? ["editor", "contributor"].includes(p.role)
        : p.purchasedByAccount,
  );
  const selected =
    relevant.find((p) => p.id === params.get("livre")) ?? relevant[0];
  const update = (updated: ProjectView) =>
    setProjects((all) => all.map((p) => (p.id === updated.id ? updated : p)));
  const greeting = (
    <>
      Bonjour
      {account?.name && (
        <>
          {" "}
          <span translate="no">{account.name}</span>
        </>
      )}
    </>
  );
  useEffect(() => {
    const title = `${tr(DASH_NAV[role].find(([key]) => key === view)?.[1] ?? "Mes livres")} · Filémoire`;
    const restoreTitle = () => {
      if (document.title !== title) document.title = title;
    };
    restoreTitle();
    // Next also updates metadata when only a filter/search parameter changes.
    const observer = new MutationObserver(restoreTitle);
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [role, view, lang]);
  return (
    <LiveShell
      account={account}
      role={role}
      view={view}
      roleSwitcher={
        account && roles.length > 1 ? (
          <select
            aria-label="Espace"
            value={role}
            onChange={async (e) => {
              const value = e.target.value as DashboardRole;
              if (await confirmNavigation()) {
                setCreating(false);
                router.push(dashboardHref(value));
              }
            }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      <Message error={error} />
      {loading ? (
        <p role="status" className="py-12">
          Chargement de vos livres…
        </p>
      ) : error ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void refresh()}>
            Réessayer
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </div>
      ) : role === "operations" && account ? (
        <OperationsDashboard
          account={account}
          refreshAccount={refresh}
          view={view}
        />
      ) : role === "narrator" ? (
        <>
          <PageIntro
            title={greeting}
            action={
              <div className="dash-actions">
                {personalDrafts && (
                  <Button
                    onClick={async () => {
                      if (await confirmNavigation())
                        setCreating((value) => !value);
                    }}
                  >
                    {creating ? "Revenir à mes livres" : "Nouveau livre"}
                  </Button>
                )}
                <GiftLink />
              </div>
            }
          >
            Une question à la fois, votre histoire prend forme.
          </PageIntro>
          {view === "commandes" ? (
            <BuyerOrders />
          ) : personalDrafts && (creating || relevant.length === 0) ? (
            <CreateBook
              onCreated={(value) => {
                setProjects((all) => [
                  value,
                  ...all.filter((p) => p.id !== value.id),
                ]);
                setCreating(false);
                router.push(
                  dashboardHref("narrator", "accueil", { livre: value.id }),
                );
                void refresh();
              }}
            />
          ) : selected ? (
            <>
              <label className="mb-8 block max-w-lg dash-sans">
                Livre
                <Select
                  className="mt-2"
                  value={selected.id}
                  onChange={async (e) => {
                    const value = e.target.value;
                    if (await confirmNavigation())
                      router.push(dashboardHref(role, view, { livre: value }));
                  }}
                >
                  {relevant.map((p) => (
                    <option key={p.id} value={p.id} translate="no">
                      {p.project.book.cover.title}
                    </option>
                  ))}
                </Select>
              </label>
              <ProjectWorkspace
                key={selected.id}
                view={selected}
                update={update}
                refresh={refresh}
              />
            </>
          ) : (
            <EmptyPanel
              title="Votre premier livre commence ici"
              illustration="lecture"
              action={<GiftLink />}
            >
              Acceptez l’invitation reçue dans votre messagerie pour commencer.
            </EmptyPanel>
          )}
        </>
      ) : role === "editor" ? (
        <EditorDashboard
          view={view}
          projects={relevant}
          selected={params.get("livre") ? selected : undefined}
          greeting={greeting}
          update={update}
          refresh={refresh}
        />
      ) : (
        <BuyerDashboard
          view={view}
          projects={relevant}
          greeting={greeting}
          refresh={refresh}
          update={update}
        />
      )}
    </LiveShell>
  );
}

function BuyerDashboard({
  view,
  projects,
  greeting,
  refresh,
  update,
}: {
  view: string;
  projects: ProjectView[];
  greeting: React.ReactNode;
  refresh: () => Promise<void>;
  update: (p: ProjectView) => void;
}) {
  if (view === "commandes")
    return (
      <>
        <PageIntro title="Mes commandes">
          Les formules offertes, leurs montants et vos exemplaires
          supplémentaires.
        </PageIntro>
        <BuyerOrders />
      </>
    );
  if (view === "suivi")
    return (
      <>
        <PageIntro title="Le chemin vers le livre">
          Suivez les grandes étapes, sans consulter les souvenirs de votre
          proche.
        </PageIntro>
        {projects.length ? (
          projects.map(({ project: p }) =>
            !p.startedAt ? (
              <section key={p.id} className="dash-row">
                <div>
                  <h3>
                    <span translate="no">{p.narrator.firstName}</span> n’a pas
                    encore accepté son invitation
                  </h3>
                  <Link href={dashboardHref("buyer", "cadeaux")}>
                    Gérer l’invitation
                  </Link>
                </div>
              </section>
            ) : (
              <section key={p.id} className="dash-summary">
                <StatusBadge>
                  <span translate="no">{p.narrator.firstName}</span> ·{" "}
                  {PACKAGES.find((x) => x.code === p.packageCode)?.name}
                </StatusBadge>
                <h2 className="mt-5">
                  {p.privacy.buyerSeesProgress
                    ? p.book.status === "brouillon"
                      ? "Son histoire prend forme."
                      : BOOK_LABEL[p.book.status]
                    : "Chaque histoire suit son rythme."}
                </h2>
                {p.privacy.buyerSeesProgress ? (
                  <>
                    <p>
                      Le parcours est en cours. Les réponses et les photos
                      restent privées, sauf partage choisi par le narrateur.
                    </p>
                    <ol className="dash-timeline">
                      {[
                        ["Invitation acceptée", !!p.startedAt],
                        ["Récit en cours", !!p.startedAt],
                        [
                          "Validation du livre",
                          [
                            "approuve",
                            "preparation",
                            "impression",
                            "expedie",
                            "livre",
                          ].includes(p.book.status),
                        ],
                        [
                          "Impression",
                          ["impression", "expedie", "livre"].includes(
                            p.book.status,
                          ),
                        ],
                      ].map(([label, done]) => (
                        <li key={String(label)} data-complete={done}>
                          {label}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p>Votre proche a choisi de garder son avancement privé.</p>
                )}
              </section>
            ),
          )
        ) : (
          <EmptyPanel
            title="Chaque histoire suit son rythme."
            illustration="lecture"
            action={<GiftLink />}
          >
            Après votre premier cadeau, vous retrouverez ici les étapes du
            parcours jusqu’au livre imprimé.
          </EmptyPanel>
        )}
        <p className="dash-note">
          Le livre est imprimé après relecture et validation par le narrateur.
        </p>
      </>
    );
  const gifts = projects.length ? (
    <GiftRows projects={projects} refresh={refresh} />
  ) : (
    <EmptyPanel
      title={
        view === "cadeaux"
          ? "À qui offrirez-vous la parole ?"
          : "La première page reste à offrir."
      }
      illustration="cadeau"
      action={<GiftLink />}
    >
      {view === "cadeaux"
        ? "Vos cadeaux et le statut de leurs invitations seront réunis ici."
        : "Choisissez une formule, un proche et une date. Nous lui enverrons votre invitation."}
    </EmptyPanel>
  );
  return (
    <>
      <PageIntro
        title={view === "cadeaux" ? "Mes cadeaux" : greeting}
        action={<GiftLink />}
      >
        {view === "cadeaux"
          ? "Retrouvez vos invitations. Vous pouvez les renvoyer ou les annuler tant qu’elles ne sont pas acceptées."
          : "Un cadeau qui commence avec vous. Une histoire qui appartient à votre proche."}
      </PageIntro>
      {view === "cadeaux" ? (
        <>
          <div className="dash-gifts-full">{gifts}</div>
          <p className="dash-note">
            Chaque invitation est valable 30 jours. Le narrateur reste libre
            d’accepter.
          </p>
        </>
      ) : (
        <div className="dash-columns">
          <section>
            <h2>Vos cadeaux</h2>
            {gifts}
            <p className="dash-note">
              Vous suivez l’avancement autorisé. Votre proche choisit les
              souvenirs à partager.
            </p>
          </section>
          <aside>
            <section className="dash-aside">
              <h2>Au fil des nouvelles</h2>
              <p>
                {projects.some(
                  (p) =>
                    p.project.startedAt && p.project.privacy.buyerSeesProgress,
                )
                  ? "Un de vos proches a commencé son parcours. Vous pouvez suivre les grandes étapes de son livre."
                  : "Les prochaines étapes de vos cadeaux apparaîtront ici."}
              </p>
            </section>
            <section className="dash-aside">
              <h3>Un livre à partager</h3>
              <p>
                Des exemplaires supplémentaires pour les enfants et
                petits-enfants.
              </p>
              <Link
                href={dashboardHref("buyer", "commandes")}
                className="underline"
              >
                Voir mes commandes
              </Link>
            </section>
          </aside>
        </div>
      )}
      {projects
        .filter((p) => p.project.memories.length > 0)
        .map((p) => (
          <section key={p.id} className="mt-12">
            <h2>Souvenirs partagés avec vous</h2>
            <ProjectWorkspace view={p} update={update} refresh={refresh} />
          </section>
        ))}
    </>
  );
}
function GiftRows({
  projects,
  refresh,
}: {
  projects: ProjectView[];
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function invitation(id: string, cancel: boolean) {
    if (
      !(await confirmAction(
        cancel
          ? "Annuler cette invitation ? Son lien ne permettra plus de rejoindre le livre. Vous pourrez envoyer une nouvelle invitation."
          : "Envoyer une nouvelle invitation ? Les anciens liens seront désactivés.",
        cancel ? "Annuler l’invitation" : "Renvoyer l’invitation",
      ))
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(
        `projects/${id}/narrator-invitation`,
        {},
        cancel ? "DELETE" : "POST",
      );
      await refresh();
      setSuccess(
        cancel
          ? "Invitation annulée."
          : "Une nouvelle invitation est programmée.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Message error={error} success={success} />
      <div className="dash-rows">
        {projects.map(({ project: p }) => (
          <article className="dash-row" key={p.id}>
            <div>
              <StatusBadge>
                {p.startedAt
                  ? "En cours"
                  : p.invitation.status === "revoquee"
                    ? "Invitation annulée"
                    : "Invitation à accepter"}
              </StatusBadge>
              <h3 translate="no">{p.book.cover.title}</h3>
              <p>
                {PACKAGES.find((x) => x.code === p.packageCode)?.name} ·{" "}
                {p.startedAt
                  ? "Invitation acceptée"
                  : p.invitation.status === "programmee"
                    ? "Invitation programmée"
                    : p.invitation.status === "revoquee"
                      ? "Invitation annulée"
                      : "Invitation envoyée"}
                {!p.startedAt && p.invitation.status !== "revoquee" && (
                  <>
                    {" "}
                    · {dateLabel(p.invitation.sentAt ?? p.invitation.sendAt)}
                  </>
                )}
              </p>
              {!p.startedAt && p.invitation.status !== "revoquee" && (
                <p>
                  Valable jusqu’au{" "}
                  <span>{dateLabel(p.invitation.expiresAt)}</span> · 30 jours
                </p>
              )}
            </div>
            <div className="dash-actions">
              {!p.startedAt ? (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void invitation(p.id, false)}
                  >
                    Renvoyer
                  </Button>
                  {p.invitation.status !== "revoquee" && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void invitation(p.id, true)}
                    >
                      Annuler l’invitation
                    </Button>
                  )}
                </>
              ) : (
                <Link
                  href={dashboardHref("buyer", "suivi")}
                  className="underline"
                >
                  Voir l’avancement
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function EditorDashboard({
  view,
  projects,
  selected,
  greeting,
  update,
  refresh,
}: {
  view: string;
  projects: ProjectView[];
  selected?: ProjectView;
  greeting: React.ReactNode;
  update: (p: ProjectView) => void;
  refresh: () => Promise<void>;
}) {
  if (view === "propositions")
    return (
      <>
        <PageIntro title="Mes propositions">
          Le narrateur accepte ou refuse chacune de vos propositions. Seuls les
          souvenirs encore partagés apparaissent ici.
        </PageIntro>
        <ProposalList />
      </>
    );
  return (
    <>
      <PageIntro title={view === "livres" ? "Livres confiés" : greeting}>
        {view === "livres"
          ? null
          : "Vous aidez à relire et organiser des livres de famille. Vous ne voyez que ce que chaque narrateur choisit de vous partager, et vos modifications sont des propositions."}
      </PageIntro>
      {selected ? (
        <>
          <Link className="underline" href={dashboardHref("editor", "livres")}>
            Revenir aux livres confiés
          </Link>
          <h2 className="mt-8" translate="no">
            {selected.project.book.cover.title}
          </h2>
          <ProjectWorkspace
            key={selected.id}
            view={selected}
            update={update}
            refresh={refresh}
          />
          {selected.project.memories.length === 0 && (
            <EmptyPanel title="Aucun souvenir partagé">
              Le narrateur choisit ce qu’il souhaite vous confier.
            </EmptyPanel>
          )}
        </>
      ) : projects.length ? (
        projects.map((p) => (
          <section
            className={view === "livres" ? "dash-shared-book" : "dash-row"}
            key={p.id}
          >
            {view === "livres" && (
              <img
                src="/dashboard/relecture.webp"
                width={1200}
                height={800}
                alt=""
              />
            )}
            <div>
              <StatusBadge>Partagé avec vous</StatusBadge>
              <h2 className="mt-4" translate="no">
                {p.project.book.cover.title}
              </h2>
              <p>
                {p.project.memories.length} souvenir(s) partagé(s). Le narrateur
                garde le dernier mot.
              </p>
              {view === "livres" && (
                <Button variant="outline" asChild>
                  <Link
                    href={dashboardHref("editor", "livres", { livre: p.id })}
                  >
                    Ouvrir le livre confié
                  </Link>
                </Button>
              )}
            </div>
            {view !== "livres" && (
              <Button asChild variant="outline">
                <Link href={dashboardHref("editor", "livres", { livre: p.id })}>
                  Voir les éléments partagés
                </Link>
              </Button>
            )}
          </section>
        ))
      ) : (
        <EmptyPanel
          title={
            view === "livres" ? "Aucun livre" : "Aucun livre ne vous est confié"
          }
          illustration={view === "livres" ? undefined : "relecture"}
        >
          {view === "livres"
            ? "Vous n’avez été invité sur aucun livre pour l’instant."
            : "Un narrateur peut vous inviter depuis sa page « Famille ». L’invitation arrive par e-mail."}
        </EmptyPanel>
      )}
    </>
  );
}
function ProposalList() {
  const [rows, setRows] = useState<
      | {
          id: string;
          title: string;
          kind: string;
          projectId: string;
          createdAt: number;
          status: string;
        }[]
      | null
    >(null),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<{ proposals: NonNullable<typeof rows> }>("proposals")
        .then((r) => {
          setRows(r.proposals);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Message error={error} />
      {error ? (
        <Button variant="outline" onClick={() => void load()}>
          Réessayer
        </Button>
      ) : rows === null ? (
        <p role="status">Chargement…</p>
      ) : rows.length ? (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <caption className="sr-only">Mes propositions</caption>
            <thead>
              <tr>
                <th>Livre</th>
                <th>Proposition</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td translate="no">{r.title}</td>
                  <td>
                    <Link
                      href={dashboardHref("editor", "livres", {
                        livre: r.projectId,
                      })}
                    >
                      {(
                        {
                          texte: "Correction proposée · texte",
                          titre_chapitre: "Titre de chapitre",
                          ordre_chapitres: "Ordre des chapitres",
                          legende_photo: "Légende de photo",
                        } as Record<string, string>
                      )[r.kind] ?? "Correction proposée"}
                    </Link>
                    <small>{dateLabel(r.createdAt)}</small>
                  </td>
                  <td>
                    <StatusBadge>
                      {{
                        en_attente: "À valider",
                        acceptee: "Acceptée",
                        refusee: "Refusée",
                      }[r.status] ?? r.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyPanel title="Aucune proposition pour l’instant">
          Ouvrez un livre confié et proposez une correction sur un souvenir
          partagé.
        </EmptyPanel>
      )}
    </>
  );
}
export function BuyerOrders() {
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<
      | {
          id: string;
          total: number;
          status: string;
          created_at: string;
          packageCode: string;
          recipient: string;
          theme: string;
          deliveryDate: string;
          giftBox: boolean;
          extraCopies: number;
        }[]
      | null
    >(null),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<{ orders: NonNullable<typeof rows> }>("orders")
        .then((r) => {
          setRows(r.orders);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Message error={error} />
      {error ? (
        <Button variant="outline" onClick={() => void load()}>
          Réessayer
        </Button>
      ) : rows === null ? (
        <p role="status">Chargement des commandes…</p>
      ) : rows.length ? (
        <div className="dash-rows">
          {rows.map((o) => (
            <article className="dash-row" key={o.id}>
              <div>
                <p className="dash-sans" translate="no">
                  {o.id.slice(0, 8).toUpperCase()} · {dateLabel(o.created_at)}
                </p>
                <h3>
                  <span translate="no">{o.recipient}</span> ·{" "}
                  {PACKAGES.find((p) => p.code === o.packageCode)?.name.replace(
                    "Filémoire ",
                    "",
                  )}
                </h3>
                <p>{PAYMENT_LABEL[o.status] ?? o.status}</p>
              </div>
              <strong className="dash-sans">{money(o.total)}</strong>
              <Button variant="outline" onClick={() => setSelected(o.id)}>
                Voir le détail
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="Vos commandes, au même endroit."
          illustration="cadeau"
          action={<GiftLink />}
        >
          Dès votre premier cadeau, retrouvez ici le récapitulatif de votre
          achat.
        </EmptyPanel>
      )}
      <section className="dash-aside mt-0">
        <h3>Envie d’un exemplaire en plus ?</h3>
        <p>
          Disponible pour un livre validé. Contactez-nous pour les exemplaires
          supplémentaires.
        </p>
        <Link href="/#contact" className="underline">
          Nous contacter
        </Link>
      </section>
      <Dialog
        appearance="dashboard"
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={tr("Détail de la commande")}
        description={tr(
          "La formule et les options enregistrées lors de votre achat.",
        )}
      >
        {rows
          ?.filter((row) => row.id === selected)
          .map((o) => (
            <dl key={o.id} className="dash-review">
              <div>
                <dt>Référence</dt>
                <dd translate="no">{o.id}</dd>
              </div>
              <div>
                <dt>Destinataire</dt>
                <dd translate="no">{o.recipient}</dd>
              </div>
              <div>
                <dt>Formule</dt>
                <dd>{PACKAGES.find((p) => p.code === o.packageCode)?.name}</dd>
              </div>
              <div>
                <dt>Parcours</dt>
                <dd>{THEMES.find((t) => t.code === o.theme)?.name}</dd>
              </div>
              <div>
                <dt>Date d’envoi de l’invitation</dt>
                <dd>{dateLabel(o.deliveryDate + "T12:00:00Z")}</dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>
                  {o.giftBox ? "Coffret cadeau" : "Sans coffret"} ·{" "}
                  {o.extraCopies} exemplaire(s) supplémentaire(s)
                </dd>
              </div>
              <div>
                <dt>Total TTC</dt>
                <dd>{money(o.total)}</dd>
              </div>
              <div>
                <dt>Paiement</dt>
                <dd>{PAYMENT_LABEL[o.status] ?? o.status}</dd>
              </div>
            </dl>
          ))}
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setSelected(null)}
        >
          Fermer
        </Button>
      </Dialog>
    </>
  );
}
