/**
 * Ajoute les traductions de .i18n/en-*.json absentes de src/i18n/en.ts et vérifie les trous {n}.
 * Usage : node scripts/i18n-merge.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, ".i18n");
const enFile = path.join(root, "src/i18n/en.ts");
const current = (() => {
  const m = readFileSync(enFile, "utf8").match(/=\s*(\{[\s\S]*\});?\s*$/);
  return m ? JSON.parse(m[1]) : {};
})();
// Les traductions déjà présentes dans en.ts (éventuellement relues à la main) ne sont jamais écrasées.
const merged = {};
for (const f of readdirSync(dir).filter((f) => /^en-.*\.json$/.test(f)).sort()) Object.assign(merged, JSON.parse(readFileSync(path.join(dir, f), "utf8")));
Object.assign(merged, current);
const problems = [];
for (const [k, v] of Object.entries(merged)) {
  if (typeof v !== "string") problems.push(`valeur non textuelle : ${k}`);
  const used = new Set([...v.matchAll(/\{(\d+)\}/g)].map((m) => m[1]));
  const avail = new Set([...k.matchAll(/\{(\d+)\}/g)].map((m) => m[1]));
  for (const u of used) if (!avail.has(u)) problems.push(`trou inconnu {${u}} : ${k} → ${v}`);
}
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b, "fr")));
writeFileSync(enFile, `/* Dictionnaire FR → EN (clé = texte français). Généré par scripts/i18n-merge.mjs puis relu. */\nexport const EN: Record<string, string> = ${JSON.stringify(sorted, null, 2)};\n`);
console.log(`${Object.keys(sorted).length} entrées dans src/i18n/en.ts`);
if (problems.length) {
  console.log(problems.join("\n"));
  process.exitCode = 1;
}
