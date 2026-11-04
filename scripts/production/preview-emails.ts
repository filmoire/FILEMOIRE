/** Synthetic examples only. This tool never connects to a database or sends mail. */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import {
  renderEmail,
  type EmailTemplate,
} from "../../src/server/email-templates";

const output = resolve("artifacts/production/email-design");
const origin = "http://localhost:3399";
const invitation = {
  token: "preview-only-not-a-real-token",
  email: "rose@example.test",
  name: "Rose",
};
const samples: [string, string, EmailTemplate][] = [
  [
    "connexion",
    "Connexion et récupération d’accès",
    { kind: "login", token: invitation.token },
  ],
  [
    "invitation-famille",
    "Invitation familiale",
    { kind: "family-invitation", ...invitation, role: "editor" },
  ],
  [
    "cadeau",
    "Invitation cadeau",
    {
      kind: "gift-invitation",
      ...invitation,
      buyerName: "Sophie",
      message:
        "Pour garder une trace de tes souvenirs, de tes éclats de rire et de ces histoires que toi seule sais raconter.\nAvec tout mon amour,\nSophie",
    },
  ],
  [
    "nouvelle-invitation",
    "Invitation renouvelée",
    { kind: "invitation-renewed", ...invitation },
  ],
  [
    "commande",
    "Confirmation de commande",
    { kind: "order-confirmation", reference: "FM-EXEMPLE", totalCents: 17900 },
  ],
  [
    "question",
    "Nouvelle question",
    {
      kind: "question",
      question:
        "Quel est le premier lieu dont vous vous souvenez ? Qu’y avait-il autour de vous ?",
    },
  ],
  [
    "rappel",
    "Rappel doux",
    {
      kind: "reminder",
      question: "Quelle tradition de famille aimeriez-vous transmettre ?",
    },
  ],
  [
    "support",
    "Réponse du support",
    {
      kind: "support-reply",
      name: "Rose",
      message:
        "Vous pouvez ajouter une photo depuis votre souvenir, puis enregistrer vos modifications.\nSi vous avez besoin d’aide, dites-nous à quelle étape vous êtes bloquée. Nous vous accompagnerons.",
    },
  ],
];

async function main() {
  await mkdir(output, { recursive: true });
  const pages = new Map<string, { content: string | Buffer; type: string }>();
  for (const [name, , template] of samples) {
    const email = renderEmail(template, origin);
    await writeFile(resolve(output, `${name}.html`), email.html);
    await writeFile(resolve(output, `${name}.txt`), email.text);
    pages.set(`/${name}.html`, {
      content: email.html,
      type: "text/html; charset=utf-8",
    });
  }
  const index = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Filémoire — Collection d’e-mails</title><style>body{margin:0;background:#fbf7f0;color:#4c253b;font:16px/1.6 Arial,sans-serif}main{max-width:960px;margin:0 auto;padding:40px 24px}img{width:200px;height:auto}h1{font:40px/1.15 Georgia,serif;margin:32px 0 12px}p{color:#6e5d68}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;padding:0;list-style:none}a{display:block;padding:22px;background:white;border:1px solid #e5d9c9;border-radius:12px;color:#4c253b;text-decoration:none}a:hover,a:focus-visible{outline:2px solid #4c253b}small{display:block;color:#6e5d68}footer{margin-top:30px}</style></head><body><main><img src="/brand/filemoire-logo.png" alt="Filémoire"><h1>Chaque message, le même soin.</h1><p>Huit e-mails transactionnels. Exemples fictifs, sans envoi et sans lien de connexion actif.</p><ul>${samples.map(([name, label]) => `<li><a href="/${name}.html">${label}<small>Voir le modèle →</small></a></li>`).join("")}</ul><footer>Les e-mails disposent aussi d’une version texte. L’application utilise des liens de connexion, sans mot de passe.</footer></main></body></html>`;
  await writeFile(resolve(output, "index.html"), index);
  pages.set("/", { content: index, type: "text/html; charset=utf-8" });
  pages.set("/brand/filemoire-logo.png", {
    content: await readFile("public/brand/filemoire-logo.png"),
    type: "image/png",
  });
  console.log(`Generated ${samples.length} HTML + text previews in ${output}`);
  if (process.argv.includes("--serve")) {
    const server = createServer((request, response) => {
      const page = pages.get(new URL(request.url ?? "/", origin).pathname);
      response.writeHead(page ? 200 : 404, {
        "Content-Type": page?.type ?? "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(
        page?.content ?? "Preview only — this example link is not active.",
      );
    });
    server.listen(3399, "127.0.0.1", () =>
      console.log(`Email preview: ${origin}`),
    );
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
