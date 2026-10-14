/**
 * Traduction FR → EN.
 *
 * Le français est la langue source : chaque texte de l'interface est sa propre clé.
 * Les textes composés à l'exécution (« 4 questions racontées sur 52 ») sont reconnus par
 * des modèles à trous (« {0} questions racontées sur {1} ») ; les valeurs capturées sont
 * elles-mêmes traduites si elles figurent au dictionnaire (titres de chapitres, offres…).
 *
 * La traduction est appliquée au rendu par un runtime JSX dédié (./jsx-runtime) : les
 * composants n'ont pas à appeler de fonction de traduction.
 */
import { EN } from "./en";

export type Lang = "fr" | "en";

let current: Lang = "fr";
export const getLang = () => current;
export function setLangCore(l: Lang) {
  current = l;
}
export const locale = () => (current === "en" ? "en-GB" : "fr-FR");

const hasLetter = /[A-Za-zÀ-ÿ€]/; // « 99 € » → « €99 »
const norm = (x: string) => x.trim().replace(/\s+/g, " ");
const exact = new Map<string, string>();
const outputs = new Set<string>();
for (const [k, v] of Object.entries(EN)) {
  exact.set(norm(k), v);
  outputs.add(norm(v));
  // Les textes en plusieurs paragraphes sont aussi affichés paragraphe par paragraphe.
  const kp = k.split(/\n\s*\n/);
  const vp = v.split(/\n\s*\n/);
  if (kp.length > 1 && kp.length === vp.length)
    kp.forEach((x, i) => {
      if (!exact.has(norm(x))) exact.set(norm(x), vp[i].trim());
      outputs.add(norm(vp[i]));
    });
}

interface Pattern {
  re: RegExp;
  en: string;
  literal: number;
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns: Pattern[] = Object.entries(EN)
  .filter(([k]) => /\{\d+\}/.test(k))
  .map(([k, en]) => {
    const parts = k.split(/\{\d+\}/);
    const order = [...k.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    const src = parts.map(escape).reduce((acc, p, i) => (i === 0 ? p : `${acc}(?<g${order[i - 1]}>[\\s\\S]*?)${p}`), "");
    return { re: new RegExp(`^${src}$`), en, literal: parts.join("").length };
  })
  .sort((a, b) => b.literal - a.literal);

/** Modèles anglais : reconnaître un texte déjà en anglais (données créées en anglais). */
const enPatterns: RegExp[] = Object.values(EN)
  .filter((v) => /\{\d+\}/.test(v) && v.replace(/\{\d+\}/g, "").trim().length >= 4)
  .map((v) => new RegExp(`^${v.split(/\{\d+\}/).map(escape).join("[\\s\\S]*?")}$`));
const isEnglish = (core: string) => outputs.has(core) || enPatterns.some((re) => re.test(core));

/** Mots propres au français (présents dans les clés, absents des traductions) : détectent un oubli. */
const words = (s: string) => s.toLowerCase().match(/[a-zà-ÿœ']{3,}/g) ?? [];
const enWords = new Set([...Object.values(EN).flatMap(words), "sept"]); // « Sept » : abréviation anglaise de septembre
const frWords = new Set(Object.keys(EN).flatMap(words).filter((w) => !enWords.has(w)));
const looksFrench = (s: string) => words(s).some((w) => frWords.has(w));

const cache = new Map<string, string>();
/** Textes sans traduction rencontrés en anglais (outil de contrôle, exposé sur window). */
export const MISSING = new Set<string>();
if (typeof window !== "undefined") (window as unknown as { __I18N_MISSING__: Set<string> }).__I18N_MISSING__ = MISSING;

function lookup(core: string, depth: number): string | null {
  const hit = exact.get(core);
  if (hit !== undefined) return hit;
  for (const p of patterns) {
    const m = p.re.exec(core);
    if (!m) continue;
    const g = m.groups ?? {};
    return p.en.replace(/\{(\d+)\}/g, (_, i: string) => {
      const v = g[`g${i}`] ?? "";
      const t = depth < 2 ? lookup(v.trim(), depth + 1) : null;
      // Une valeur capturée qui ressemble à une phrase française non traduite est signalée.
      if (t === null && looksFrench(v) && !isEnglish(v.trim())) MISSING.add(v.trim());
      return t ?? v;
    });
  }
  return null;
}

/** Traduit un texte affiché (identité en français). */
export function tr(s: string): string {
  if (current === "fr" || !s || !hasLetter.test(s)) return s;
  const c = cache.get(s);
  if (c !== undefined) return c;
  const lead = s.match(/^\s*/)![0];
  const trail = s.match(/\s*$/)![0];
  const core = s.trim().replace(/\s+/g, " ");
  let out = s;
  if (core && !outputs.has(core)) {
    const t = lookup(core, 0);
    if (t !== null) {
      out = lead + t + trail;
      outputs.add(t); // un texte déjà traduit n'est jamais retraduit (éléments imbriqués)
    }
    else if (looksFrench(core) && !isEnglish(core)) MISSING.add(core);
  }
  cache.set(s, out);
  return out;
}

export function resetTranslationCache() {
  cache.clear();
}

/** Propriétés textuelles à traduire (éléments HTML et composants). */
const TEXT_PROPS = ["title", "description", "label", "hint", "intro", "eyebrow", "legend", "placeholder", "aria-label", "aria-roledescription", "alt", "confirm", "body", "error", "how"];

type AnyProps = Record<string, unknown> & { children?: unknown };

function translateChildren(children: unknown): unknown {
  if (typeof children === "string") return tr(children);
  if (!Array.isArray(children)) return children;
  // Les fragments de texte voisins (« 4 », « questions racontées sur », « 52 ») sont réunis puis traduits ensemble.
  // Preserve every child slot, including null/false placeholders. Removing them
  // moves unkeyed components during a language switch and destroys form/recorder state.
  const out: unknown[] = children.slice();
  let buf: (string | number)[] = [];
  let start = 0;
  const flush = () => {
    if (!buf.length) return;
    const joined = buf.join("");
    out[start] = buf.length === 1 && typeof buf[0] === "number" ? buf[0] : tr(joined);
    for (let i = 1; i < buf.length; i++) out[start + i] = "";
    buf = [];
  };
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (typeof c === "string" || typeof c === "number") {
      if (!buf.length) start = i;
      buf.push(c);
    } else {
      flush();
    }
  }
  flush();
  return out;
}

export function translateProps(props: AnyProps | null | undefined, childrenOnly = false): AnyProps | null | undefined {
  // translate="no" : contenu à ne jamais traduire (texte saisi, différences mot à mot…)
  if (current === "fr" || !props || props.translate === "no") return props;
  let next: AnyProps | null = null;
  for (const k of childrenOnly ? [] : TEXT_PROPS) {
    const v = props[k];
    if (typeof v === "string") {
      const t = tr(v);
      if (t !== v) (next ??= { ...props })[k] = t;
    }
  }
  if ("children" in props) {
    const c = translateChildren(props.children);
    if (c !== props.children) (next ??= { ...props }).children = c;
  }
  return next ?? props;
}

/** Champs de données affichés (pas les identifiants) traduits quand la démo est créée en anglais. */
const DATA_KEYS = new Set(["text", "draft", "help", "caption", "title", "subtitle", "dedication", "note", "body", "subject", "message", "relation", "before", "after", "people", "date", "reason", "label", "lines", "supportAccessReason"]);

function localizeString(s: string): string {
  if (!hasLetter.test(s)) return s;
  // Texte en plusieurs paragraphes : traduit paragraphe par paragraphe pour garder la mise en page.
  const paras = s.split(/\n\s*\n/);
  if (paras.length > 1) {
    const out = paras.map((p) => lookup(norm(p), 0));
    if (out.every((x) => x !== null)) {
      out.forEach((x) => outputs.add(x!));
      return out.join("\n\n");
    }
  }
  const core = s.trim().replace(/\s+/g, " ");
  const t = lookup(core, 0);
  if (t !== null) outputs.add(t);
  return t ?? s;
}

/**
 * Crée les données de démonstration dans la langue active (histoires, légendes, couverture…).
 * Comme de vraies données, elles restent ensuite dans cette langue si l'on change d'interface.
 */
export function localizeData<T>(value: T): T {
  if (current === "fr") return value;
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") return key && DATA_KEYS.has(key) ? localizeString(v) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key === "lines" ? key : undefined));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}
