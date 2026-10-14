/**
 * Règles métier pures (sans React) : progression, droits de lecture, composition et
 * pagination du livre, check-lists d'impression. Testées dans rules.test.ts.
 *
 * IMPORTANT : ces contrôles s'exécutent dans le navigateur. Ils démontrent le comportement
 * attendu mais ne constituent PAS une sécurité : en production, chaque règle doit être
 * appliquée côté serveur.
 */
import { CHAPTERS, pkg } from "./catalog";
import type { AudioRec, BookStatus, Chapter, Memory, Photo, Project, Suggestion } from "./types";

export type Viewer =
  | { kind: "narrateur" }
  | { kind: "editeur"; email: string }
  | { kind: "acheteur" }
  | { kind: "ops"; now: number };

export const BOOK_FLOW: BookStatus[] = [
  "brouillon",
  "relecture_editoriale",
  "relecture_narrateur",
  "approuve",
  "preparation",
  "impression",
  "expedie",
  "livre",
];

export const BOOK_LABEL: Record<BookStatus, string> = {
  brouillon: "Brouillon",
  relecture_editoriale: "Relecture éditoriale",
  relecture_narrateur: "Relecture du narrateur",
  approuve: "Approuvé",
  preparation: "Préparation impression",
  impression: "En impression",
  expedie: "Expédié",
  livre: "Livré",
};

export const isLocked = (p: Project) => BOOK_FLOW.indexOf(p.book.status) >= BOOK_FLOW.indexOf("approuve");

export function progress(p: Project) {
  const q = p.questions;
  const answered = q.filter((x) => x.status === "repondue").length;
  return {
    total: q.length,
    answered,
    skipped: q.filter((x) => x.status === "passee").length,
    postponed: q.filter((x) => x.status === "reportee").length,
    drafts: q.filter((x) => x.status === "brouillon").length,
    available: q.filter((x) => x.status === "disponible").length,
    locked: q.filter((x) => x.status === "verrouillee").length,
    /** Une question passée n'est jamais comptée comme répondue. */
    percent: q.length ? Math.round((answered / q.length) * 100) : 0,
  };
}

/** Débloque les questions arrivées à échéance et réactive les questions reportées. */
export function refreshQuestions(p: Project, now: number): string[] {
  const opened: string[] = [];
  if (!p.startedAt) return opened;
  for (const q of p.questions) {
    if (q.status === "verrouillee" && q.availableAt <= now) {
      q.status = "disponible";
      opened.push(q.id);
    }
    if (q.status === "reportee" && q.postponedUntil && q.postponedUntil <= now) {
      q.status = "disponible";
      q.postponedUntil = undefined;
      opened.push(q.id);
    }
  }
  return opened;
}

/** Prochaine question à proposer : une seule action à la fois. */
export function nextQuestion(p: Project) {
  return (
    p.questions.find((q) => q.status === "brouillon") ??
    p.questions.find((q) => q.status === "disponible") ??
    undefined
  );
}

export function activeEditor(p: Project, email: string) {
  return p.editors.find((e) => e.email.toLowerCase() === email.toLowerCase() && e.status === "active");
}

/** Droit de lecture d'un souvenir. Le narrateur lit tout ; les autres, seulement ce qui est partagé. */
export function canRead(p: Project, m: Memory, v: Viewer): boolean {
  if (v.kind === "narrateur") return true;
  if (m.status !== "terminee" || !m.inBook) return false; // brouillons et contenus masqués : jamais
  if (v.kind === "editeur") return !!activeEditor(p, v.email) && (m.visibility === "editeur" || m.visibility === "famille");
  if (v.kind === "acheteur") return m.visibility === "famille";
  if (v.kind === "ops") return !!p.privacy.supportAccessUntil && p.privacy.supportAccessUntil > v.now;
  return false;
}

export type MemoryState = "brouillon" | "masque" | "en_relecture" | "approuve" | "partage" | "prive";

export const MEMORY_STATE_LABEL: Record<MemoryState, string> = {
  brouillon: "Brouillon",
  masque: "Masqué du livre",
  en_relecture: "En relecture",
  approuve: "Approuvé",
  partage: "Partagé",
  prive: "Privé",
};

export function memoryState(p: Project, m: Memory): MemoryState {
  if (m.status === "brouillon") return "brouillon";
  if (!m.inBook) return "masque";
  if (p.suggestions.some((s) => s.status === "en_attente" && s.kind === "texte" && s.targetId === m.id)) return "en_relecture";
  if (m.approvedByNarrator) return "approuve";
  if (m.visibility !== "moi") return "partage";
  return "prive";
}

export const VISIBILITY_LABEL = {
  moi: "Moi seul·e",
  editeur: "Moi et mon éditeur familial",
  famille: "Ma famille (acheteur et éditeur)",
} as const;

export function sortedChapters(p: Project): Chapter[] {
  return p.chapters.slice().sort((a, b) => a.order - b.order);
}

export function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface BookMemory {
  memory: Memory;
  question: string;
  paras: string[];
  audio?: AudioRec;
}
export interface BookChapter {
  chapter: Chapter;
  memories: BookMemory[];
  photos: Photo[];
}

/** Contenu du livre tel que le lecteur `v` a le droit de le voir. Le contenu masqué n'y figure jamais. */
export function composeBook(p: Project, v: Viewer): BookChapter[] {
  const out: BookChapter[] = [];
  for (const ch of sortedChapters(p)) {
    const memories: BookMemory[] = p.memories
      .filter((m) => m.chapterId === ch.id && m.status === "terminee" && m.inBook && m.text.trim() && canRead(p, m, v))
      .sort((a, b) => questionIndex(p, a) - questionIndex(p, b))
      .map((m) => ({
        memory: m,
        question: p.questions.find((q) => q.id === m.questionId)?.text ?? "",
        paras: paragraphs(m.text),
        audio: (p.kind === "personal" || p.orderId === null || pkg(p.packageCode).qr) ? p.audios.find((a) => a.memoryId === m.id && a.qr.enabled && a.transcript.status === "validee") : undefined,
      }));
    const visibleMemoryIds = new Set(memories.map((m) => m.memory.id));
    const photos = p.photos
      // Une photo suit la visibilité du souvenir auquel elle est rattachée ; une photo non rattachée reste privée.
      .filter((ph) => ph.inBook && ph.chapterId === ch.id && (ph.memoryId ? visibleMemoryIds.has(ph.memoryId) : v.kind === "narrateur"))
      .sort((a, b) => a.order - b.order);
    if (memories.length || photos.length) out.push({ chapter: ch, memories, photos });
  }
  return out;
}

function questionIndex(p: Project, m: Memory) {
  return p.questions.find((q) => q.id === m.questionId)?.index ?? 999;
}

export type PageBlock =
  | { t: "question"; text: string; memoryId: string }
  | { t: "para"; text: string; memoryId: string }
  | { t: "photo"; photo: Photo }
  | { t: "qr"; audio: AudioRec };

export type Page =
  | { kind: "cover" }
  | { kind: "title"; n: number }
  | { kind: "dedication"; n: number }
  | { kind: "toc"; n: number; entries: { title: string; page: number }[] }
  | { kind: "chapter"; n: number; title: string; index: number }
  | { kind: "content"; n: number; chapter: string; blocks: PageBlock[] }
  | { kind: "closing"; n: number };

const CAPACITY = 1400;
const cost = (b: PageBlock) =>
  b.t === "question" ? 220 : b.t === "para" ? b.text.length + 90 : b.t === "photo" ? 760 : 200;

function splitLong(text: string): string[] {
  if (text.length + 90 <= CAPACITY) return [text];
  const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [text];
  const parts: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length + 90 > CAPACITY - 120 && cur) {
      parts.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Pagination approximative d'un livre A5 (prototype). */
export function paginate(p: Project, book: BookChapter[]): Page[] {
  const pages: Page[] = [{ kind: "cover" }];
  let n = 1;
  pages.push({ kind: "title", n: n++ });
  if (p.book.dedication.trim()) pages.push({ kind: "dedication", n: n++ });
  const toc: Extract<Page, { kind: "toc" }> = { kind: "toc", n: n++, entries: [] };
  pages.push(toc);
  book.forEach((bc, i) => {
    const opener = { kind: "chapter" as const, n: n++, title: bc.chapter.title, index: i + 1 };
    pages.push(opener);
    toc.entries.push({ title: bc.chapter.title, page: opener.n });
    const blocks: PageBlock[] = [];
    for (const bm of bc.memories) {
      blocks.push({ t: "question", text: bm.question, memoryId: bm.memory.id });
      for (const para of bm.paras) for (const part of splitLong(para)) blocks.push({ t: "para", text: part, memoryId: bm.memory.id });
      for (const ph of bc.photos.filter((x) => x.memoryId === bm.memory.id)) blocks.push({ t: "photo", photo: ph });
      if (bm.audio) blocks.push({ t: "qr", audio: bm.audio });
    }
    for (const ph of bc.photos.filter((x) => !x.memoryId || !bc.memories.some((m) => m.memory.id === x.memoryId))) blocks.push({ t: "photo", photo: ph });
    let cur: PageBlock[] = [];
    let used = 0;
    for (const b of blocks) {
      const c = cost(b);
      if (used + c > CAPACITY && cur.length) {
        pages.push({ kind: "content", n: n++, chapter: bc.chapter.title, blocks: cur });
        cur = [];
        used = 0;
      }
      cur.push(b);
      used += c;
    }
    if (cur.length) pages.push({ kind: "content", n: n++, chapter: bc.chapter.title, blocks: cur });
  });
  pages.push({ kind: "closing", n: n++ });
  return pages;
}

export const PRINT_MIN_LONG_SIDE = 1500;
export const isLowRes = (ph: Photo) => Math.max(ph.width, ph.height) < PRINT_MIN_LONG_SIDE;

export type CheckState = "ok" | "warn" | "todo";
export interface CheckItem {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  href?: string;
}

/** Check-list de préparation à l'impression (côté narrateur). */
export function printChecklist(p: Project): CheckItem[] {
  const book = composeBook(p, { kind: "narrateur" });
  const memCount = book.reduce((s, c) => s + c.memories.length, 0);
  const photosInBook = p.photos.filter((ph) => ph.inBook && ph.chapterId);
  const low = photosInBook.filter(isLowRes);
  const hidden = p.memories.filter((m) => !m.inBook).length + p.photos.filter((ph) => !ph.inBook).length;
  const pending = p.suggestions.filter((s) => s.status === "en_attente").length;
  const qrPkg = (p.kind === "personal" || p.orderId === null || pkg(p.packageCode).qr);
  const qrAudios = p.audios.filter((a) => a.qr.enabled);
  const qrNotReady = qrAudios.filter((a) => a.transcript.status !== "validee");
  const approved = isLocked(p);
  return [
    {
      id: "cover",
      label: "Couverture choisie",
      state: p.book.cover.title.trim() ? "ok" : "todo",
      detail: p.book.cover.title.trim() ? `« ${p.book.cover.title} » — modèle ${COVER_LABEL[p.book.cover.template]}` : "Donnez un titre au livre.",
      href: "/narrateur/apercu#couverture",
    },
    {
      id: "chapters",
      label: "Chapitres et ordre",
      state: memCount ? "ok" : "todo",
      detail: memCount ? `${book.length} chapitre(s), ${memCount} souvenir(s) dans le livre.` : "Aucun souvenir terminé dans le livre pour l'instant.",
      href: "/narrateur/livre",
    },
    {
      id: "images",
      label: "Images et résolution",
      state: low.length ? "warn" : "ok",
      detail: low.length
        ? `${low.length} photo(s) risquent d'être floues à l'impression (moins de ${PRINT_MIN_LONG_SIDE} px). Vous pouvez les garder.`
        : photosInBook.length
          ? `${photosInBook.length} photo(s), résolution suffisante.`
          : "Aucune photo : le livre sera uniquement textuel.",
      href: "/narrateur/photos",
    },
    {
      id: "hidden",
      label: "Contenus masqués exclus",
      state: "ok",
      detail: hidden ? `${hidden} élément(s) masqué(s) ne seront pas imprimés.` : "Aucun contenu masqué.",
      href: "/narrateur/livre",
    },
    {
      id: "suggestions",
      label: "Suggestions traitées",
      state: pending ? "todo" : "ok",
      detail: pending ? `${pending} suggestion(s) de l'éditeur familial attendent votre décision.` : "Aucune suggestion en attente.",
      href: "/narrateur/livre",
    },
    {
      id: "qr",
      label: "QR audio",
      state: !qrPkg ? "ok" : qrNotReady.length ? "warn" : "ok",
      detail: !qrPkg
        ? "Non inclus dans cette formule."
        : qrAudios.length === 0
          ? "Aucun enregistrement n'est relié à un QR code."
          : qrNotReady.length
            ? `${qrNotReady.length} QR en attente : la transcription doit être relue et validée.`
            : `${qrAudios.length} QR code(s) privés prêts.`,
      href: "/narrateur/souvenirs",
    },
    {
      id: "approval",
      label: "Validation du narrateur",
      state: approved ? "ok" : "todo",
      detail: approved ? "Contenu validé : le livre est verrouillé." : "Le narrateur doit valider explicitement le contenu final.",
      href: "/narrateur/apercu#validation",
    },
    {
      id: "delivery",
      label: "Adresse de livraison",
      state: p.print.address ? "ok" : "todo",
      detail: p.print.address ? `${p.print.address.name}, ${p.print.address.postalCode} ${p.print.address.city}` : "À renseigner au moment de la validation.",
      href: "/narrateur/apercu#validation",
    },
  ];
}

export const COVER_LABEL = { prune: "Prune mémoire", creme: "Crème et or", terre: "Terre cuite" } as const;

/** Préflight SIMULÉ : aucune vérification réelle de fichier d'imprimeur n'est effectuée. */
export function preflight(p: Project) {
  const pages = paginate(p, composeBook(p, { kind: "narrateur" }));
  const low = p.photos.filter((ph) => ph.inBook && ph.chapterId && isLowRes(ph)).length;
  const printable = pages.length - 1;
  return [
    { label: "Fichier PDF généré", state: "ok" as CheckState, detail: "Simulation — aucun PDF d'imprimeur n'est produit par le prototype." },
    { label: "Format A5 (148 × 210 mm), fonds perdus 3 mm", state: "warn" as CheckState, detail: "Hypothèse à confirmer avec la fiche technique de l'imprimeur." },
    { label: "Nombre de pages", state: (printable % 4 === 0 ? "ok" : "warn") as CheckState, detail: `${printable} pages intérieures${printable % 4 === 0 ? "" : " — des pages blanches seront ajoutées (multiple de 4)"}.` },
    { label: "Images ≥ 300 dpi", state: (low ? "warn" : "ok") as CheckState, detail: low ? `${low} image(s) sous le seuil recommandé.` : "Toutes les images atteignent le seuil." },
    { label: "Polices incorporées", state: "ok" as CheckState, detail: "Simulation (EB Garamond, Inter)." },
    { label: "QR codes lisibles", state: "ok" as CheckState, detail: "Simulation — à tester sur épreuve papier." },
  ];
}

export const COVER_TEMPLATES = ["prune", "creme", "terre"] as const;

export function suggestionLabel(s: Suggestion) {
  return {
    texte: "Correction de texte",
    titre_chapitre: "Titre de chapitre",
    ordre_chapitres: "Ordre des chapitres",
    legende_photo: "Légende de photo",
  }[s.kind];
}

/** Applique une suggestion acceptée par le narrateur. */
export function applySuggestion(p: Project, s: Suggestion, now: number) {
  if (s.kind === "texte") {
    const m = p.memories.find((x) => x.id === s.targetId);
    if (m) {
      m.revisions.push({ at: now, by: m.text === s.before ? s.author : "Narrateur", text: m.text });
      m.text = s.after;
      m.updatedAt = now;
    }
  } else if (s.kind === "titre_chapitre") {
    const c = p.chapters.find((x) => x.id === s.targetId);
    if (c) c.title = s.after;
  } else if (s.kind === "ordre_chapitres") {
    const ids: string[] = JSON.parse(s.after);
    ids.forEach((id, i) => {
      const c = p.chapters.find((x) => x.id === id);
      if (c) c.order = i;
    });
  } else if (s.kind === "legende_photo") {
    const ph = p.photos.find((x) => x.id === s.targetId);
    if (ph) ph.caption = s.after;
  }
}

export const chapterKeyOrder = (key: string) => {
  const i = CHAPTERS.findIndex((c) => c.key === key);
  return i < 0 ? 99 : i;
};

/** Mots de différence simples pour l'affichage d'une suggestion (mot à mot). */
export function wordDiff(a: string, b: string): { t: string; k: "same" | "del" | "add" }[] {
  const A = a.split(/(\s+)/);
  const B = b.split(/(\s+)/);
  const n = A.length;
  const m = B.length;
  if (n * m > 400_000) return [{ t: a, k: "del" }, { t: b, k: "add" }];
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { t: string; k: "same" | "del" | "add" }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ t: A[i], k: "same" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: A[i++], k: "del" });
    else out.push({ t: B[j++], k: "add" });
  }
  while (i < n) out.push({ t: A[i++], k: "del" });
  while (j < m) out.push({ t: B[j++], k: "add" });
  return out;
}
