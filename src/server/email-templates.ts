import brand from "../../tailwind.config";

/** Email-safe adapter of the existing public brand. No remote fonts or CSS. */
const colors = brand.theme.extend.colors;
const ink = colors.ink.DEFAULT;
const plum = colors.prune.DEFAULT;
const muted = colors.ink.muted;
const paper = colors.creme.DEFAULT;
const wash = colors.prune[50];
const line = colors.line;
const sans = "Arial, Helvetica, sans-serif";
const serif = "Georgia, 'Times New Roman', serif";

export type EmailTemplate =
  | { kind: "login"; token: string }
  | {
      kind: "family-invitation";
      token: string;
      email: string;
      name: string;
      role: "editor" | "contributor";
    }
  | {
      kind: "gift-invitation";
      token: string;
      email: string;
      name: string;
      buyerName: string;
      message: string;
    }
  | { kind: "invitation-renewed"; token: string; email: string; name: string }
  | { kind: "order-confirmation"; reference: string; totalCents: number }
  | {
      kind: "withdrawal-receipt";
      name: string;
      email: string;
      reference: string;
      orderReference: string;
      receivedAt: string;
      declaration: string;
      language: "fr" | "en";
    }
  | { kind: "question" | "reminder"; question: string }
  | { kind: "support-reply"; name: string; message: string };

export type RenderedEmail = { subject: string; text: string; html: string };
type Content = {
  language?: "fr" | "en";
  subject: string;
  preview: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  note?: { label: string; text: string };
  details?: [string, string][];
  action?: { label: string; url: string };
  help: string;
};

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
function prose(value: string) {
  return escape(value).replace(/\r?\n/g, "<br />");
}
function originOf(value: string) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  ) {
    throw new Error("Email links require an HTTPS app origin (or local HTTP)");
  }
  return url.origin;
}

function layout(content: Content, origin: string): RenderedEmail {
  const { action, note, details } = content;
  const en = content.language === "en";
  const signature = en
    ? "Your memories remain yours."
    : "Vos souvenirs restent à vous.";
  const helpLabel = en ? "Need help?" : "Besoin d’aide ?";
  const privacyLabel = en ? "Privacy" : "Confidentialité";
  const text = [
    "Filémoire",
    content.title,
    ...content.paragraphs,
    note ? `${note.label}\n${note.text}` : "",
    ...(details ?? []).map(([label, value]) => `${label} : ${value}`),
    action ? `${action.label} : ${action.url}` : "",
    content.help,
    signature,
    `${helpLabel} ${origin}/#contact`,
    `${privacyLabel} : ${origin}/legal`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = `<!doctype html>
<html lang="${en ? "en" : "fr"}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>${escape(content.subject)}</title>
<style>body{margin:0!important;padding:0!important}table{border-collapse:collapse}a:focus-visible{outline:3px solid ${colors.terre.DEFAULT};outline-offset:4px}a:hover{text-decoration:underline!important}.content-copy{overflow-wrap:anywhere;word-break:break-word}@media(max-width:480px){.outer{padding:16px 10px!important}.content{padding-left:22px!important;padding-right:22px!important}.title{font-size:30px!important}.brand{padding:28px 22px!important}.button{display:block!important;text-align:center!important}.action-table{width:100%!important}}</style></head>
<body style="margin:0;padding:0;background-color:${paper};color:${ink};font-family:${sans};-webkit-text-size-adjust:100%">
<div style="display:none;font-size:1px;color:${paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escape(content.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${paper}"><tr><td class="outer" align="center" style="padding:40px 16px">
<!--[if mso]><table role="presentation" width="620" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0">
<tr><td class="brand" align="center" style="padding:16px 32px 32px"><a href="${origin}" style="color:${plum};text-decoration:none"><img src="${origin}/brand/filemoire-logo.png" alt="Filémoire" width="200" height="44" style="display:block;width:200px;max-width:100%;height:auto;border:0;font-family:${serif};font-size:30px;color:${plum}" /></a></td></tr>
<tr><td style="background-color:#ffffff;border:1px solid ${line};border-radius:20px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="content" style="padding:40px 40px 0"><p style="margin:0 0 18px;font-family:${sans};font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;color:${muted}">${escape(content.eyebrow)}</p>
<h1 class="title" style="margin:0 0 22px;font-family:${serif};font-size:36px;line-height:1.17;font-weight:normal;color:${plum}">${escape(content.title)}</h1>
${content.paragraphs.map((p) => `<p class="content-copy" style="margin:0 0 18px;font-family:${sans};font-size:16px;line-height:27px;color:${ink}">${prose(p)}</p>`).join("\n")}</td></tr>
${note ? `<tr><td class="content" style="padding:8px 40px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 24px;background-color:${wash};border:1px solid ${line};border-radius:12px"><p style="margin:0 0 8px;font-family:${sans};font-size:12px;line-height:18px;font-weight:bold;color:${plum}">${escape(note.label)}</p><p class="content-copy" style="margin:0;font-family:${serif};font-size:20px;line-height:29px;color:${plum}">${prose(note.text)}</p></td></tr></table></td></tr>` : ""}
${details ? `<tr><td class="content" style="padding:4px 40px 24px"><table width="100%" cellpadding="0" cellspacing="0" style="font-family:${sans};font-size:15px;line-height:24px">${details.map(([label, value]) => `<tr><th scope="row" align="left" style="padding:12px 12px 12px 0;border-bottom:1px solid ${line};font-weight:normal;color:${muted}">${escape(label)}</th><td class="content-copy" align="right" style="padding:12px 0;border-bottom:1px solid ${line};color:${ink}">${escape(value)}</td></tr>`).join("")}</table></td></tr>` : ""}
${action ? `<tr><td class="content" style="padding:8px 40px 24px"><table class="action-table" role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${plum}" style="border-radius:28px;mso-padding-alt:17px 26px"><a class="button" href="${escape(action.url)}" style="display:inline-block;padding:17px 26px;border:1px solid ${plum};border-radius:28px;background-color:${plum};color:#ffffff;font-family:${sans};font-size:16px;line-height:22px;font-weight:bold;text-decoration:none;mso-padding-alt:0">${escape(action.label)}</a></td></tr></table></td></tr>` : ""}
<tr><td class="content" style="padding:0 40px 32px"><p class="content-copy" style="margin:0;font-family:${sans};font-size:13px;line-height:21px;color:${muted}">${prose(content.help)}</p>
${action ? `<p style="margin:18px 0 6px;font-family:${sans};font-size:12px;line-height:19px;color:${muted}">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p><p style="margin:0;word-break:break-all;overflow-wrap:anywhere;font-family:${sans};font-size:12px;line-height:20px"><a href="${escape(action.url)}" style="color:${plum};text-decoration:underline;word-break:break-all">${escape(action.url)}</a></p>` : ""}</td></tr>
<tr><td align="center" style="padding:24px;border-top:1px solid ${line}"><p style="margin:0;font-family:${serif};font-size:18px;line-height:26px;font-style:italic;color:${plum}">${signature}</p></td></tr>
</table></td></tr>
<tr><td align="center" style="padding:24px 16px 8px;font-family:${sans};font-size:12px;line-height:22px;color:${muted}"><a href="${origin}/#contact" style="color:${muted};text-decoration:underline">${helpLabel}</a><span aria-hidden="true"> &nbsp;·&nbsp; </span><a href="${origin}/legal" style="color:${muted};text-decoration:underline">${privacyLabel}</a><br />Filémoire — ${en ? "The stories that connect us." : "Les histoires qui nous relient."}</td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { subject: content.subject, text, html };
}

/** All active transactional email types; user-authored text is always escaped. */
export function renderEmail(
  template: EmailTemplate,
  appOrigin: string,
): RenderedEmail {
  const origin = originOf(appOrigin);
  const workspace = `${origin}/espace`;
  const invitation = (token: string) =>
    `${origin}/rejoindre#token=${encodeURIComponent(token)}`;
  const invitationHelp =
    "Cette invitation est valable 30 jours. Vous restez libre de l’accepter. Si vous ne connaissez pas son expéditeur, vous pouvez ignorer cet e-mail.";
  const greeting = (name: string) =>
    name.trim() ? `Bonjour ${name.trim()},` : "Bonjour,";
  let content: Content;
  switch (template.kind) {
    case "login":
      content = {
        subject: "Votre lien de connexion Filémoire",
        preview:
          "Retrouvez votre espace grâce à votre lien personnel, valable 15 minutes.",
        eyebrow: "VOTRE ESPACE FILÉMOIRE",
        title: "Votre histoire vous attend.",
        paragraphs: [
          "Un clic suffit pour retrouver votre espace, vos souvenirs et les livres que vous accompagnez. Aucun mot de passe à retenir.",
        ],
        note: {
          label: "Un lien personnel",
          text: "Valable 15 minutes · Une seule utilisation",
        },
        action: {
          label: "Ouvrir mon espace",
          url: `${origin}/acces#token=${encodeURIComponent(template.token)}`,
        },
        help: "Vous n’avez pas demandé ce lien ? Ignorez cet e-mail. Ne partagez pas ce lien : il donne accès à votre compte. S’il a expiré, demandez-en un nouveau sur la page de connexion.",
      };
      break;
    case "family-invitation":
      content = {
        subject: "Votre invitation Filémoire",
        preview: "Un proche vous invite à l’aider à transmettre son histoire.",
        eyebrow: "UNE HISTOIRE À PARTAGER",
        title: "Votre place dans son histoire.",
        paragraphs: [
          greeting(template.name),
          "Un proche vous invite à participer à son livre de souvenirs. Vous ne verrez que les éléments qu’il choisit de partager avec vous.",
        ],
        note: {
          label:
            template.role === "editor"
              ? "Éditeur familial"
              : "Contributeur familial",
          text: "Le narrateur garde la main sur son livre et sur ce qu’il partage.",
        },
        details: [["Adresse invitée", template.email]],
        action: {
          label: "Découvrir l’invitation",
          url: invitation(template.token),
        },
        help: `Connectez-vous avec ${template.email} pour accepter. ${invitationHelp}`,
      };
      break;
    case "gift-invitation":
      content = {
        subject: "Un livre de souvenirs vous attend",
        preview: "Un cadeau pour raconter votre histoire, à votre rythme.",
        eyebrow: "UN CADEAU POUR VOUS",
        title: "Les souvenirs deviennent un livre.",
        paragraphs: [
          greeting(template.name),
          `${template.buyerName || "Un proche"} vous offre Filémoire : un espace pour raconter les moments qui comptent, puis les rassembler dans un livre.`,
          "Une question après l’autre, vous choisissez vos mots, vos photos et votre rythme.",
        ],
        ...(template.message.trim()
          ? { note: { label: "Un mot pour vous", text: template.message } }
          : {}),
        action: {
          label: "Découvrir mon cadeau",
          url: invitation(template.token),
        },
        help: `Connectez-vous avec ${template.email} pour accepter. ${invitationHelp}`,
      };
      break;
    case "invitation-renewed":
      content = {
        subject: "Votre invitation Filémoire",
        preview: "Voici votre nouveau lien pour découvrir votre cadeau.",
        eyebrow: "VOTRE INVITATION",
        title: "La première page est à vous.",
        paragraphs: [
          greeting(template.name),
          "Un livre de souvenirs vous attend. Voici une nouvelle invitation pour découvrir votre cadeau et commencer quand vous le souhaitez.",
        ],
        note: {
          label: "Votre nouveau lien",
          text: "Cette invitation remplace la précédente.",
        },
        action: {
          label: "Découvrir mon cadeau",
          url: invitation(template.token),
        },
        help: `Connectez-vous avec ${template.email} pour accepter. ${invitationHelp}`,
      };
      break;
    case "withdrawal-receipt": {
      const en = template.language === "en";
      content = {
        language: template.language,
        subject: en
          ? "Your Filémoire withdrawal acknowledgement"
          : "Votre accusé de réception de rétractation Filémoire",
        preview: en
          ? "Keep this dated acknowledgement of your declaration."
          : "Conservez cet accusé de réception daté de votre déclaration.",
        eyebrow: en ? "WITHDRAWAL DECLARATION" : "DÉCLARATION DE RÉTRACTATION",
        title: en
          ? "Your declaration is recorded."
          : "Votre déclaration est enregistrée.",
        paragraphs: [template.declaration],
        details: [
          [
            en ? "Request reference" : "Référence de demande",
            template.reference,
          ],
          [
            en ? "Contract / order" : "Contrat / commande",
            template.orderReference,
          ],
          [en ? "Name" : "Nom", template.name],
          ["E-mail", template.email],
          [en ? "Received at (UTC)" : "Reçu le (UTC)", template.receivedAt],
        ],
        help: en
          ? "This acknowledges receipt of your declaration. It is not confirmation of a completed refund. Intertrad will check the identified contract and applicable rights. Questions: admin-dev@filemoire.fr. If you did not submit this declaration, contact us; no order has been automatically changed."
          : "Cet accusé confirme la réception de votre déclaration, pas l’exécution d’un remboursement. Intertrad vérifiera le contrat identifié et les droits applicables. Questions : admin-dev@filemoire.fr. Si vous n’avez pas envoyé cette déclaration, contactez-nous ; aucune commande n’a été modifiée automatiquement.",
      };
      break;
    }
    case "order-confirmation":
      content = {
        subject: "Votre commande Filémoire est confirmée",
        preview:
          "Votre paiement est confirmé. Retrouvez votre commande dans votre espace.",
        eyebrow: "MERCI POUR VOTRE CONFIANCE",
        title: "Le début d’un beau cadeau.",
        paragraphs: [
          "Votre paiement a bien été reçu. Vous pouvez retrouver votre commande et suivre l’invitation de votre proche depuis votre espace.",
        ],
        details: [
          ["Référence", template.reference],
          [
            "Montant payé",
            new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(template.totalCents / 100),
          ],
        ],
        action: {
          label: "Voir ma commande",
          url: `${workspace}?role=buyer&vue=commandes`,
        },
        help: "Ce message confirme votre commande. Il ne signifie pas que le livre est déjà imprimé ou expédié. Conservez votre référence pour toute question.",
      };
      break;
    case "question":
    case "reminder": {
      const reminder = template.kind === "reminder";
      content = {
        subject: reminder
          ? "Un souvenir, à votre rythme"
          : "Votre prochaine question Filémoire",
        preview: reminder
          ? "Votre question vous attend, quand le moment sera le bon."
          : "Une nouvelle question pour continuer le fil de votre histoire.",
        eyebrow: reminder ? "À VOTRE RYTHME" : "LE FIL DE VOTRE HISTOIRE",
        title: reminder
          ? "Les souvenirs prennent leur temps."
          : "Un souvenir à raconter.",
        paragraphs: [
          reminder
            ? "Votre question est toujours là. Quelques mots aujourd’hui, ou un autre jour : vous choisissez le bon moment."
            : "Une nouvelle question vous attend dans votre espace. Prenez le temps de laisser revenir les images, les voix, les petits détails.",
        ],
        note: { label: "Votre question", text: template.question },
        action: {
          label: reminder ? "Retrouver ma question" : "Raconter ce souvenir",
          url: workspace,
        },
        help: "Vous pouvez modifier votre rythme et désactiver les rappels dans les préférences de votre livre. Vos réponses restent privées selon vos choix de partage.",
      };
      break;
    }
    case "support-reply":
      content = {
        subject: "Votre demande Filémoire",
        preview: "L’équipe Filémoire a répondu à votre demande.",
        eyebrow: "À VOTRE ÉCOUTE",
        title: "Un mot de notre équipe.",
        paragraphs: [
          greeting(template.name),
          "Voici notre réponse à votre demande.",
        ],
        note: { label: "La réponse de Filémoire", text: template.message },
        action: { label: "Contacter l’équipe", url: `${origin}/#contact` },
        help: "Besoin d’une précision ? Retrouvez-nous depuis le formulaire de contact. Évitez d’y transmettre un mot de passe ou un lien de connexion.",
      };
      break;
  }
  return layout(content, origin);
}

/** Brand new plain-text callers without treating their text as HTML. */
export function renderLegacyEmail(
  subject: string,
  text: string,
  appOrigin: string,
) {
  return layout(
    {
      subject,
      preview: "Un message de Filémoire vous attend.",
      eyebrow: "FILÉMOIRE",
      title: subject,
      paragraphs: [text],
      help: "Ce message concerne votre espace Filémoire.",
    },
    originOf(appOrigin),
  ).html;
}
