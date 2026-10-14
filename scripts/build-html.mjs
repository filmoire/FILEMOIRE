/**
 * Construit la version HTML autonome : dist/filemoire-prototype.html (un seul fichier).
 * Usage : pnpm build:html
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".html-build");
const dist = path.join(root, "dist");
mkdirSync(out, { recursive: true });
mkdirSync(dist, { recursive: true });

// 1. CSS Tailwind (mêmes jetons et classes que l'application Next.js)
execFileSync(path.join(root, "node_modules/.bin/tailwindcss"), ["-i", "src/app/globals.css", "-o", path.join(out, "app.css"), "--minify"], { cwd: root, stdio: "inherit" });

// 2. JavaScript : la navigation Next.js est remplacée par le routeur par hash
const navSwap = {
  name: "nav-swap",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/nav$/ }, () => ({ path: path.join(root, "src/html/nav.tsx") }));
  },
};
await build({
  entryPoints: [path.join(root, "src/html/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  jsxImportSource: "@/i18n",
  outfile: path.join(out, "app.js"),
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_APP_MODE": '"demo"' },
  loader: { ".png": "dataurl", ".svg": "dataurl", ".wav": "dataurl" },
  plugins: [navSwap],
  logLevel: "warning",
  logOverride: { "unsupported-directive": "silent" },
});

const css = readFileSync(path.join(out, "app.css"), "utf8");
const js = readFileSync(path.join(out, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="description" content="Prototype interactif Filémoire — données fictives, paiement, e-mails, transcription et impression simulés.">
<title>Prototype Filémoire</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap">
<style>${css}</style>`;
const body = `<div id="root"></div>
<noscript>Ce prototype nécessite JavaScript.</noscript>
<script>${js}</script>`;

// Fichier autonome (double-clic) et variante sans squelette pour la publication en page partagée.
writeFileSync(path.join(dist, "filemoire-prototype.html"), `<!doctype html>\n<html lang="fr">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
writeFileSync(path.join(out, "artifact.html"), `${head}\n${body}\n`);
const kb = (f) => Math.round(readFileSync(f).length / 1024);
console.log(`dist/filemoire-prototype.html — ${kb(path.join(dist, "filemoire-prototype.html"))} Ko`);
