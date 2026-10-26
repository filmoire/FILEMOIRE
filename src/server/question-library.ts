import { z } from "zod";
import { buildLibrary } from "@/lib/catalog";
import type { LibraryQuestion } from "@/lib/types";
import { pool, transaction, type DB } from "./db";
import { requireAdmin, type Account } from "./auth";
import { assert, audit, id } from "./security";
export type EditorialQuestion = LibraryQuestion & {
  revision: number;
  custom?: boolean;
};
export async function editorialLibrary(
  db: DB = pool(),
): Promise<EditorialQuestion[]> {
  const { rows } = await db.query(
    "SELECT id,definition,revision FROM question_library ORDER BY updated_at,id",
  );
  const overrides = new Map<string, EditorialQuestion>(
    rows.map((r) => [
      r.id,
      { ...r.definition, id: r.id, revision: r.revision },
    ]),
  );
  const base = buildLibrary().map((q) => {
    const saved = overrides.get(q.id);
    overrides.delete(q.id);
    return saved ?? { ...q, revision: 0 };
  });
  return [
    ...base,
    ...[...overrides.values()].map((q) => ({ ...q, custom: true })),
  ];
}
export async function journeyLibrary(db: DB = pool()) {
  const all = (await editorialLibrary(db)).filter((q) => q.active);
  // New questions are explicitly approved before use. Existing journeys are snapshots.
  return [
    ...all.filter((q) => q.custom && q.status === "validee"),
    ...all.filter((q) => !q.custom),
  ];
}
const schema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    revision: z.number().int().min(0),
    text: z.string().trim().min(5).max(1000),
    help: z.string().trim().max(1000),
    chapter: z.enum([
      "origines",
      "enfance",
      "famille",
      "ecole",
      "travail",
      "migration",
      "amour",
      "epreuves",
      "traditions",
      "valeurs",
    ]),
    theme: z
      .enum([
        "vie",
        "migration",
        "metier",
        "couple",
        "parentalite",
        "recettes",
        "retraite",
      ])
      .optional(),
    status: z.enum(["a_valider", "validee"]),
    active: z.boolean().optional(),
  })
  .strict();
export async function saveEditorialQuestion(account: Account, input: unknown) {
  requireAdmin(account);
  const value = schema.parse(input);
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(817022)");
    const library = await editorialLibrary(db);
    assert(
      library.length < 1000 || !!value.id,
      409,
      "La bibliothèque a atteint sa limite.",
    );
    const existing = value.id
      ? library.find((q) => q.id === value.id)
      : undefined;
    assert(!value.id || existing, 404, "Question introuvable.");
    assert(
      (existing?.revision ?? 0) === value.revision,
      409,
      "Cette question a changé. Actualisez la bibliothèque avant de réessayer.",
    );
    const question: LibraryQuestion = {
      id: existing?.id ?? id(),
      text: value.text,
      help: value.help,
      chapter: value.chapter,
      theme: value.theme === "vie" ? undefined : value.theme,
      status: value.status,
      active: value.active ?? existing?.active ?? true,
      short: existing?.short,
      official: existing?.official,
    };
    await db.query(
      "INSERT INTO question_library(id,definition) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET definition=EXCLUDED.definition,revision=question_library.revision+1,updated_at=now()",
      [question.id, JSON.stringify(question)],
    );
    await audit(db, account.id, null, "library.updated");
    return { ...question, revision: value.revision + 1 };
  });
}
