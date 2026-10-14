/**
 * Extrait les textes français de src/ (textes JSX, chaînes, modèles `${…}` → {0}) vers
 * .i18n/keys.json, avec le fichier d'origine, pour tenir à jour src/i18n/en.ts.
 * Usage : node scripts/i18n-extract.mjs
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.ts$|\.d\.ts$|i18n[\\/]en\.ts$/.test(p)) files.push(p);
  }
})(path.join(root, "src"));

const keys = new Map();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const add = (s, file) => {
  const k = norm(s);
  if (!k || !/[A-Za-zÀ-ÿ«»]/.test(k.replace(/\{\d+\}/g, ""))) return;
  if (/^\{\d+\}$/.test(k)) return;
  if (!keys.has(k)) keys.set(k, new Set());
  keys.get(k).add(path.relative(root, file));
};
const looksLikeCode = (s) => {
  const t = s.trim();
  if (!t) return true;
  if (/^(\/|#|https?:|data:|\.\/|\.\.\/|@\/)/.test(t)) return true;
  if (/^[a-z0-9_.:\-]+$/.test(t)) return true; // identifiants, statuts, clés
  if (/^[a-z][a-zA-Z0-9]*$/.test(t)) return true; // camelCase
  const tokens = t.split(/\s+/);
  if (tokens.every((x) => /^[!a-z0-9:_\-\[\]\/.%#()&>*+=,'"~@]+$/.test(x)) && tokens.some((x) => /[-:\[]/.test(x))) return true; // classes CSS
  if (/^[A-Z_]+$/.test(t)) return true;
  return false;
};
const CLASS_CALLS = new Set(["cn", "cva", "clsx", "twMerge"]);
const SKIP_ATTRS = new Set(["className", "id", "htmlFor", "name", "type", "href", "value", "key", "role", "variant", "size", "tone", "align", "side", "inputMode", "autoComplete", "accept", "lang", "src", "dateTime", "rel", "target", "method", "mode", "position"]);

function inSkippedContext(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isJsxAttribute(p)) return SKIP_ATTRS.has(p.name.getText()) || p.name.getText().startsWith("data-");
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      if (CLASS_CALLS.has(callee)) return true;
      if (/^(console\.|localStorage\.|sessionStorage\.|document\.(getElementById|querySelector)|window\.matchMedia|createStore|uid|new RegExp|.*\.(includes|startsWith|endsWith|split|replace|join|getItem|setItem|removeItem|test|match))/.test(callee)) return true;
    }
    if (ts.isPropertyAssignment(p) && p.name && /^(classNames|className|toast|success|error|description|title)$/.test(p.name.getText?.() ?? "") && p.name.getText() === "classNames") return true;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
    if (ts.isCaseClause(p) || ts.isTypeNode(p) || ts.isLiteralTypeNode?.(p)) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    if (ts.isJsxExpression(p) || ts.isStatement(p) || ts.isBlock(p)) break;
  }
  return false;
}

function templatePattern(t) {
  if (ts.isNoSubstitutionTemplateLiteral(t)) return t.text;
  let s = t.head.text;
  t.templateSpans.forEach((sp, i) => (s += `{${i}}` + sp.literal.text));
  return s;
}

function jsxChildrenSegments(children) {
  const segs = [];
  let cur = [];
  let n = 0;
  const flush = () => {
    if (cur.length) segs.push(cur.join(""));
    cur = [];
    n = 0;
  };
  for (const c of children) {
    if (ts.isJsxText(c)) {
      const cleaned = cleanJsxText(c.text);
      if (cleaned) cur.push(cleaned);
    } else if (ts.isJsxExpression(c)) {
      const e = c.expression;
      if (!e) continue;
      if (ts.isStringLiteral(e)) cur.push(e.text);
      else if (ts.isTemplateExpression(e) || ts.isNoSubstitutionTemplateLiteral(e)) cur.push(templatePattern(e).replace(/\{(\d+)\}/g, () => `{${n++}}`));
      else if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e) || (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) || /\.map\(/.test(e.getText()) || (ts.isConditionalExpression(e) && /</.test(e.getText()))) flush();
      else cur.push(`{${n++}}`);
    } else flush();
  }
  flush();
  return segs;
}

// Nettoyage des textes JSX (même règle que React : lignes rognées, sauts de ligne supprimés).
function cleanJsxText(text) {
  const lines = text.split(/\r\n|\n|\r/);
  let out = "";
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, " ");
    if (i !== 0) l = l.replace(/^[ ]+/, "");
    if (i !== lines.length - 1) l = l.replace(/[ ]+$/, "");
    if (l) out += (out && i !== 0 ? " " : "") + l;
  });
  return out;
}

for (const file of files) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isJsxElement(node)) for (const s of jsxChildrenSegments(node.children)) add(s, file);
    else if (ts.isStringLiteral(node) && !ts.isJsxExpression(node.parent) && !inSkippedContext(node) && !looksLikeCode(node.text)) add(node.text, file);
    else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && !SKIP_ATTRS.has(node.name.getText()) && !looksLikeCode(node.initializer.text)) add(node.initializer.text, file);
    else if ((ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) && (!ts.isJsxExpression(node.parent) || ts.isJsxAttribute(node.parent.parent)) && !ts.isTaggedTemplateExpression(node.parent) && !inSkippedContext(node)) {
      const p = templatePattern(node);
      if (!looksLikeCode(p.replace(/\{\d+\}/g, "x"))) add(p, file);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

mkdirSync(path.join(root, ".i18n"), { recursive: true });
const out = [...keys].map(([k, f]) => ({ k, files: [...f] })).sort((a, b) => a.k.localeCompare(b.k, "fr"));
writeFileSync(path.join(root, ".i18n/keys.json"), JSON.stringify(out, null, 1));
const enSrc = readFileSync(path.join(root, "src/i18n/en.ts"), "utf8").match(/=\s*(\{[\s\S]*\});?\s*$/);
const known = new Set(Object.keys(enSrc ? JSON.parse(enSrc[1]) : {}).map(norm));
const NOISE = /^(use client|fr-FR|en-GB|Button|Input|Select|Textarea|audio\/\w+|image\/\w+|FM-2026-.*|SIM-COL-.*|SUP-.*|bg-\[.*|\{0\}\(\?<g.*)$/;
const todo = out.filter((x) => !known.has(x.k) && !NOISE.test(x.k)).map((x) => ({ fr: x.k, context: x.files.join(", ") }));
writeFileSync(path.join(root, ".i18n/todo.json"), JSON.stringify(todo, null, 1));
console.log(`${out.length} textes extraits de ${files.length} fichiers — ${todo.length} sans traduction anglaise (.i18n/todo.json)`);
