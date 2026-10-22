"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { CHAPTERS, THEMES } from "@/lib/catalog";
import type { EditorialQuestion } from "@/server/question-library";
import { tr } from "@/i18n/core";
import { api } from "./client";
import { Form } from "./form";
import { Message } from "./shell";
import {
  EmptyPanel,
  Pagination,
  StatusBadge,
  dashboardHref,
} from "./dashboard-ui";
export function QuestionLibrary() {
  const params = useSearchParams(),
    router = useRouter();
  const query = params.get("q") ?? "",
    chapter = params.get("chapitre") ?? "",
    theme = params.get("parcours") ?? "",
    page = Math.max(1, Number(params.get("page")) || 1);
  const [questions, setQuestions] = useState<EditorialQuestion[] | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [editing, setEditing] = useState<EditorialQuestion | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [dialogError, setDialogError] = useState("");
  const [searchDraft, setSearchDraft] = useState(query);
  useEffect(() => {
    setSearchDraft(query);
  }, [query]);
  const search = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      setQuestions(
        (await api<{ questions: EditorialQuestion[] }>("admin/questions"))
          .questions,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const href = (extra: Record<string, string>) =>
    dashboardHref("operations", "questions", {
      q: query,
      chapitre: chapter,
      parcours: theme,
      ...extra,
    });
  const filtered = (questions ?? []).filter(
    (q) =>
      (!chapter || q.chapter === chapter) &&
      (!theme || (theme === "base" ? !q.theme : q.theme === theme)) &&
      (!query ||
        `${q.custom ? q.text : tr(q.text)} ${q.custom ? q.help : tr(q.help)}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  const currentPage = Math.min(page, Math.ceil(filtered.length / 25) || 1);
  const edit = (q: EditorialQuestion | "new") => {
    setDialogError("");
    setEditing(q);
  };
  return (
    <>
      <Message error={error} success={success} />
      <div className="dash-summary mb-6">
        <Form
          className="flex flex-wrap items-end gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(
              href({
                q: String(
                  new FormData(event.currentTarget).get("search") ?? "",
                ),
                page: "1",
              }),
            );
          }}
        >
          <label className="min-w-48 flex-1">
            Parcours
            <Select
              value={theme}
              onChange={(e) =>
                router.push(href({ parcours: e.target.value, page: "1" }))
              }
              className="mt-2"
            >
              <option value="">Tous les parcours</option>
              <option value="base">Questions de base</option>
              {THEMES.filter((t) => t.code !== "vie").map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="min-w-48 flex-[2]">
            Rechercher
            <Input
              ref={search}
              name="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="mt-2"
            />
          </label>
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
          {searchDraft && (
            <Button
              variant="ghost"
              aria-label="Effacer la recherche"
              onClick={() => {
                if (search.current) {
                  setSearchDraft("");
                  search.current.focus();
                }
                router.push(href({ q: "", page: "1" }));
              }}
            >
              Effacer
            </Button>
          )}
          <Button onClick={() => edit("new")}>Ajouter une question</Button>
        </Form>
      </div>
      {error ? (
        <Button variant="outline" onClick={() => void load()}>
          Réessayer
        </Button>
      ) : questions === null ? (
        <p role="status">Chargement des questions…</p>
      ) : (
        <>
          <p className="dash-note mb-6">
            {questions.filter((q) => q.status === "validee").length} validée(s)
            · {questions.filter((q) => q.status !== "validee").length} à valider
          </p>
          <div className="dash-question-layout">
            <nav
              className="dash-question-nav"
              aria-label="Thèmes des questions"
            >
              <Link
                href={href({ chapitre: "", page: "1" })}
                aria-current={!chapter ? "page" : undefined}
              >
                Tous les thèmes
              </Link>
              {CHAPTERS.map((c) => (
                <Link
                  key={c.key}
                  href={href({ chapitre: c.key, page: "1" })}
                  aria-current={chapter === c.key ? "page" : undefined}
                >
                  {c.title}
                </Link>
              ))}
            </nav>
            <section>
              {filtered.length ? (
                <div className="dash-rows">
                  {filtered
                    .slice((currentPage - 1) * 25, currentPage * 25)
                    .map((q) => (
                      <article className="dash-row" key={q.id}>
                        <div>
                          <StatusBadge>
                            {q.status === "validee" ? "Validée" : "À valider"}
                          </StatusBadge>
                          <h3 translate={q.custom ? "no" : undefined}>
                            {q.text}
                          </h3>
                          <p translate={q.custom ? "no" : undefined}>
                            {q.help}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => edit(q)}
                        >
                          Modifier
                        </Button>
                      </article>
                    ))}
                </div>
              ) : (
                <EmptyPanel title="Aucune question trouvée">
                  Essayez un autre mot ou un autre thème.
                </EmptyPanel>
              )}
              <Pagination
                total={filtered.length}
                page={currentPage}
                href={(p) => href({ page: String(p) })}
              />
            </section>
          </div>
        </>
      )}
      <Dialog
        appearance="dashboard"
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
        title={tr(
          editing === "new" ? "Ajouter une question" : "Modifier la question",
        )}
        description={tr(
          "Les parcours déjà commencés conservent leurs questions. Une nouvelle question doit être validée avant d’être utilisée.",
        )}
      >
        {editing && (
          <Form
            key={typeof editing === "string" ? editing : editing.id}
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const f = new FormData(event.currentTarget);
              setBusy(true);
              setDialogError("");
              try {
                await api("admin/questions", {
                  ...(editing !== "new" ? { id: editing.id } : {}),
                  revision: editing === "new" ? 0 : editing.revision,
                  text: f.get("text"),
                  help: f.get("help"),
                  chapter: f.get("chapter"),
                  theme: f.get("theme") || "vie",
                  status: f.get("status"),
                });
                setEditing(null);
                setSuccess("Question enregistrée.");
                await load();
              } catch (e) {
                setDialogError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Message error={dialogError} />
            <label className="block">
              Question
              <Textarea
                name="text"
                required
                minLength={5}
                maxLength={1000}
                defaultValue={editing === "new" ? "" : editing.text}
              />
            </label>
            <label className="block">
              Aide à la réponse
              <Textarea
                name="help"
                maxLength={1000}
                defaultValue={editing === "new" ? "" : editing.help}
              />
            </label>
            <label className="block">
              Thème
              <Select
                name="chapter"
                defaultValue={editing === "new" ? "origines" : editing.chapter}
              >
                {CHAPTERS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              Parcours
              <Select
                name="theme"
                defaultValue={
                  editing === "new" ? "vie" : (editing.theme ?? "vie")
                }
              >
                {THEMES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              Statut
              <Select
                name="status"
                defaultValue={editing === "new" ? "a_valider" : editing.status}
              >
                <option value="a_valider">À valider</option>
                <option value="validee">Validée</option>
              </Select>
            </label>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={busy} aria-busy={busy}>
                Enregistrer la question
              </Button>
            </div>
          </Form>
        )}
      </Dialog>
    </>
  );
}
