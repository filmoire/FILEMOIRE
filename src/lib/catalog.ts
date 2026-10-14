import type { ChapterKey, LibraryQuestion, PackageCode, ThemeCode } from "./types";

/** Offres et prix TTC indicatifs du dossier (diapositive 8). Prix à confirmer. */
export interface PackageDef {
  code: PackageCode;
  name: string;
  short: string;
  /** Prix en centimes pour les offres achetables en ligne. */
  price?: number;
  priceLabel: string;
  questions?: 26 | 52;
  features: string[];
  binding?: string;
  voice: boolean;
  transcription: boolean;
  qr: boolean;
  quoteOnly?: boolean;
  highlight?: boolean;
}

export const PACKAGES: PackageDef[] = [
  {
    code: "essentiel",
    name: "Filémoire Essentiel",
    short: "26 questions, texte, photos et livre souple",
    price: 9900,
    priceLabel: "99 €",
    questions: 26,
    features: ["26 questions guidées", "Réponses écrites", "Photos et légendes", "Livre souple"],
    binding: "Livre souple",
    voice: false,
    transcription: false,
    qr: false,
  },
  {
    code: "heritage",
    name: "Filémoire Héritage",
    short: "52 questions, livre relié, éditeur, 1 exemplaire",
    price: 17900,
    priceLabel: "179 €",
    questions: 52,
    features: ["52 questions guidées", "Réponses écrites ou vocales*", "Éditeur familial", "Livre relié, 1 exemplaire"],
    binding: "Livre relié",
    voice: true,
    transcription: true,
    qr: false,
    highlight: true,
  },
  {
    code: "voix",
    name: "Filémoire Voix",
    short: "52 questions, transcription et QR audio",
    price: 24900,
    priceLabel: "249 €",
    questions: 52,
    features: ["Tout Héritage", "Transcription à relire", "QR audio privé dans le livre", "Voix conservée"],
    binding: "Livre relié",
    voice: true,
    transcription: true,
    qr: true,
  },
  {
    code: "bilingue",
    name: "Filémoire Bilingue",
    short: "Édition dans deux langues avec relecture humaine",
    priceLabel: "299 – 449 €",
    features: ["Deux langues", "Traduction relue par un humain", "Pilote limité"],
    voice: true,
    transcription: true,
    qr: false,
    quoteOnly: true,
  },
  {
    code: "accompagne",
    name: "Filémoire Accompagné",
    short: "Interviews par un biographe et édition premium",
    priceLabel: "690 – 1 490 €",
    features: ["Entretiens avec un biographe", "Édition premium", "Sur rendez-vous"],
    voice: true,
    transcription: true,
    qr: false,
    quoteOnly: true,
  },
];

export const EXTRA_COPY_PRICE = 4900; // fourchette dossier : 39-69 €
export const GIFT_BOX_PRICE = 2900; // fourchette dossier : +19-39 €
export const VOICE_UPGRADE_PRICE = 7000; // différence Héritage → Voix [P]

export const pkg = (code: PackageCode) => PACKAGES.find((p) => p.code === code)!;

export const THEMES: { code: ThemeCode; name: string; description: string }[] = [
  { code: "vie", name: "Une vie en 52 questions", description: "De l'enfance aux valeurs : le parcours complet." },
  { code: "migration", name: "Migration et double culture", description: "Départs, langues, deux pays dans un même cœur." },
  { code: "metier", name: "Métier et savoir-faire", description: "Les gestes, les outils et les leçons d'un métier." },
  { code: "couple", name: "Histoire d'un couple", description: "Une rencontre, un engagement, une vie à deux." },
  { code: "parentalite", name: "Parentalité", description: "Devenir parent, transmettre, apprendre de ses enfants." },
  { code: "recettes", name: "Recettes", description: "Les plats de famille et les histoires qui vont avec." },
  { code: "retraite", name: "Retraite et héritage professionnel", description: "Transformer une carrière en héritage." },
];
export const theme = (code: ThemeCode) => THEMES.find((t) => t.code === code)!;

export const CHAPTERS: { key: ChapterKey; title: string }[] = [
  { key: "origines", title: "Origines" },
  { key: "enfance", title: "Enfance" },
  { key: "famille", title: "Famille" },
  { key: "ecole", title: "École et jeunesse" },
  { key: "travail", title: "Travail" },
  { key: "migration", title: "Migration et voyages" },
  { key: "amour", title: "Amour et amitiés" },
  { key: "epreuves", title: "Épreuves" },
  { key: "traditions", title: "Traditions" },
  { key: "valeurs", title: "Valeurs" },
];
export const chapterTitle = (k: ChapterKey | "libre") => CHAPTERS.find((c) => c.key === k)?.title ?? "Souvenirs libres";

type Q = [ChapterKey, string, string, { official?: true; short?: true }?];

/**
 * 52 questions de démonstration. Les 10 marquées « official » sont les exemples du dossier
 * (diapositive 7). Toutes restent à valider par la direction éditoriale.
 */
const CORE: Q[] = [
  ["origines", "Quel est le premier lieu dont vous vous souvenez ? Qui vous y entourait ?", "Une pièce, une rue, un jardin… Décrivez ce que vous voyiez, entendiez ou sentiez.", { official: true, short: true }],
  ["origines", "Que savez-vous de l'endroit où vous êtes né·e et du jour de votre naissance ?", "Ce qu'on vous en a raconté compte aussi."],
  ["origines", "D'où venaient vos parents et vos grands-parents ?", "Villes, villages, pays, métiers : tout ce qui vous revient.", { short: true }],
  ["origines", "Comment avez-vous reçu votre prénom ?", "Son histoire, un surnom, ce que vous en pensez."],
  ["origines", "Y a-t-il une histoire de famille que l'on vous a souvent racontée ?", "Même si vous n'êtes pas sûr·e qu'elle soit tout à fait vraie.", { short: true }],
  ["enfance", "Quel jeu, odeur ou repas vous ramène immédiatement à votre enfance ?", "Fermez les yeux un instant : qu'est-ce qui revient en premier ?", { official: true, short: true }],
  ["enfance", "À quoi ressemblait une journée ordinaire quand vous aviez dix ans ?", "Le matin, l'école, le soir, le dimanche.", { short: true }],
  ["enfance", "Qui étaient vos camarades de jeu, et à quoi jouiez-vous ?", "Des prénoms, des cachettes, des règles inventées."],
  ["enfance", "Quelle bêtise d'enfant vous fait encore sourire ?", "Racontez-la comme vous la raconteriez à vos petits-enfants."],
  ["enfance", "Où passiez-vous vos vacances ou vos jours de fête ?", "Un lieu, un trajet, une maison de famille.", { short: true }],
  ["enfance", "De quoi aviez-vous peur, et qui vous rassurait ?", "Vous pouvez passer cette question si vous préférez."],
  ["famille", "Quelle personne vous a le plus appris, et comment ?", "Un parent, un voisin, un aîné : un geste ou une phrase suffit.", { official: true, short: true }],
  ["famille", "Comment décririez-vous votre mère à quelqu'un qui ne l'a pas connue ?", "Sa voix, ses mains, ses mots, ses habitudes.", { short: true }],
  ["famille", "Comment décririez-vous votre père à quelqu'un qui ne l'a pas connu ?", "Ce que vous en savez, ce que vous en gardez."],
  ["famille", "Quelle place aviez-vous parmi vos frères et sœurs, ou comme enfant unique ?", "Les alliances, les disputes, les complicités."],
  ["famille", "Quel moment passé en famille aimeriez-vous revivre ?", "Un repas, une fête, un simple après-midi.", { short: true }],
  ["famille", "Quelles expressions ou manies de famille vous reviennent ?", "Les phrases que tout le monde répétait."],
  ["ecole", "Quel choix ou quelle rencontre a changé votre direction ?", "Une décision, un hasard, une personne au bon moment.", { official: true, short: true }],
  ["ecole", "Quel souvenir gardez-vous de votre école ou d'un enseignant ?", "Une salle de classe, une odeur d'encre, un mot d'encouragement.", { short: true }],
  ["ecole", "Qu'est-ce qui vous passionnait à quinze ans ?", "Une musique, un sport, une cause, un rêve."],
  ["ecole", "Quelle musique, quel livre ou quel film a marqué votre jeunesse ?", "Et ce qu'il disait de vous à l'époque."],
  ["ecole", "Quel a été votre premier sentiment de liberté ?", "Un premier voyage seul·e, un premier salaire, une première clé."],
  ["ecole", "Que rêviez-vous de devenir ?", "Et ce qu'il en reste aujourd'hui.", { short: true }],
  ["travail", "Quel métier avez-vous réellement appris sur le terrain ?", "Ce qu'aucune école ne vous a enseigné.", { official: true, short: true }],
  ["travail", "Comment s'est passé votre premier emploi ?", "Le premier jour, les collègues, la première paie.", { short: true }],
  ["travail", "Quelle personne vous a appris votre métier ?", "Ses conseils, sa manière de faire."],
  ["travail", "De quelle réussite professionnelle êtes-vous fier·ère ?", "Grande ou petite, elle compte.", { short: true }],
  ["travail", "Qu'est-ce que votre travail vous a appris sur les autres ?", "Les clients, les collègues, les inconnus."],
  ["migration", "Qu'avez-vous emporté, découvert ou dû laisser derrière vous ?", "Un objet, une personne, une habitude, une langue.", { official: true, short: true }],
  ["migration", "Quel voyage vous a le plus transformé·e ?", "Proche ou lointain, choisi ou subi."],
  ["migration", "Quels lieux avez-vous habités, et lequel vous ressemble le plus ?", "Une adresse, un quartier, une vue depuis la fenêtre.", { short: true }],
  ["migration", "Quels mots ou quelles langues portez-vous avec vous ?", "Les mots que vous ne savez pas traduire."],
  ["migration", "Où vous sentez-vous chez vous aujourd'hui ?", "Un lieu, des personnes, un moment de la journée."],
  ["amour", "Quelle relation a transformé votre manière de voir la vie ?", "Amour, amitié, rencontre : ce qui a changé en vous.", { official: true, short: true }],
  ["amour", "Comment avez-vous rencontré une personne qui a compté dans votre vie ?", "Le lieu, le jour, la première impression.", { short: true }],
  ["amour", "Quelle amitié a traversé les années ?", "Ce qui l'a fait durer."],
  ["amour", "Quel jour de fête ou de mariage vous a marqué·e ?", "La musique, les invités, un imprévu."],
  ["amour", "Qu'avez-vous appris sur l'amour avec le temps ?", "Ce que vous diriez à un jeune couple.", { short: true }],
  ["epreuves", "Quelle difficulté vous a appris quelque chose que vous transmettez encore ?", "Racontez seulement ce que vous souhaitez partager.", { official: true, short: true }],
  ["epreuves", "Qui vous a aidé·e dans un moment difficile ?", "Un geste de soutien que vous n'avez pas oublié.", { short: true }],
  ["epreuves", "Qu'est-ce qui vous donne de la force quand tout va mal ?", "Une personne, une habitude, une conviction."],
  ["epreuves", "Y a-t-il un moment où vous avez dû recommencer ?", "Un déménagement, un nouveau métier, une nouvelle vie."],
  ["traditions", "Quelles expressions, recettes ou gestes ne doivent pas se perdre ?", "Ce que vous aimeriez voir continuer après vous.", { official: true, short: true }],
  ["traditions", "Comment se passaient les fêtes importantes dans votre famille ?", "Les préparatifs, les plats, les chants."],
  ["traditions", "Quelle recette aimeriez-vous transmettre, et avec quelle histoire ?", "Les ingrédients, le tour de main, la personne qui vous l'a apprise.", { short: true }],
  ["traditions", "Quel objet de famille a une histoire à raconter ?", "D'où vient-il, qui l'a gardé, où est-il aujourd'hui ?"],
  ["traditions", "Quelle chanson, quel conte ou quelle prière vous a accompagné·e ?", "Vous pouvez aussi la chanter dans un enregistrement."],
  ["valeurs", "Qu'aimeriez-vous que les plus jeunes comprennent de votre parcours ?", "Ce qu'on ne voit pas toujours de l'extérieur.", { official: true, short: true }],
  ["valeurs", "De quoi êtes-vous le plus reconnaissant·e ?", "Une personne, une chance, un moment."],
  ["valeurs", "Qu'est-ce qui a vraiment de l'importance pour vous ?", "Ce qui guide vos choix."],
  ["valeurs", "Quel conseil auriez-vous aimé recevoir à vingt ans ?", "Écrivez-le comme une lettre."],
  ["valeurs", "Que voudriez-vous que l'on retienne de vous ?", "Quelques mots suffisent.", { short: true }],
];

const THEME_Q: [ThemeCode, ChapterKey, string, string][] = [
  ["migration", "migration", "Quel jour êtes-vous parti·e, et comment s'est passé ce départ ?", "Les adieux, le voyage, l'arrivée."],
  ["migration", "traditions", "Quelles odeurs ou quels plats de là-bas recherchiez-vous ici ?", "Et où les trouviez-vous."],
  ["migration", "migration", "Dans quelle langue rêvez-vous, comptez-vous, vous fâchez-vous ?", "Les langues de la vie quotidienne."],
  ["migration", "valeurs", "Que souhaitez-vous transmettre de vos deux cultures ?", "Ce qui doit continuer des deux côtés."],
  ["metier", "travail", "Décrivez un geste de votre métier que personne ne fait comme vous.", "Prenez le temps de le détailler."],
  ["metier", "travail", "Quel outil ou quel objet de travail garderiez-vous ?", "Et pourquoi celui-là."],
  ["metier", "epreuves", "Quelle erreur vous a le plus appris au travail ?", "Ce qu'elle a changé dans votre façon de faire."],
  ["metier", "valeurs", "Quel savoir-faire aimeriez-vous transmettre ?", "À qui, et comment."],
  ["couple", "amour", "Quel est le premier souvenir que vous gardez de votre rencontre ?", "Le lieu, les vêtements, les premiers mots."],
  ["couple", "amour", "Comment s'est décidé votre engagement ?", "Une demande, une évidence, une discussion."],
  ["couple", "epreuves", "Quelle épreuve avez-vous traversée ensemble ?", "Et ce qui vous a permis de la traverser."],
  ["couple", "traditions", "Quel rituel de couple vous tient à cœur ?", "Un repas, une promenade, une chanson."],
  ["parentalite", "famille", "Comment avez-vous vécu l'arrivée de votre premier enfant ?", "Les premiers jours, les premières nuits."],
  ["parentalite", "valeurs", "Qu'avez-vous voulu transmettre à vos enfants, et qu'avez-vous appris d'eux ?", "Dans les deux sens."],
  ["parentalite", "traditions", "Quelle histoire racontiez-vous le soir ?", "Vous pouvez la raconter à voix haute."],
  ["parentalite", "famille", "Quel moment avec vos enfants vous rend le plus fier·ère ?", "Un petit moment suffit."],
  ["recettes", "traditions", "Quelle recette vous a été transmise, et par qui ?", "Les quantités « à l'œil » comptent aussi."],
  ["recettes", "traditions", "Quel plat préparez-vous pour les grandes occasions ?", "Et pour qui."],
  ["recettes", "traditions", "Quel ingrédient ou quel geste fait toute la différence ?", "Le secret que vous pouvez partager."],
  ["recettes", "famille", "Quel repas partagé reste inoubliable ?", "La table, les invités, les rires."],
  ["retraite", "travail", "Comment avez-vous vécu votre dernier jour de travail ?", "Les au revoir, le pot, le lendemain."],
  ["retraite", "valeurs", "Que faites-vous aujourd'hui de votre temps ?", "Ce que la retraite vous a permis."],
  ["retraite", "travail", "Quelle leçon de votre carrière voulez-vous transmettre ?", "Pour ceux qui commencent."],
  ["retraite", "travail", "Qui avez-vous formé ou aidé dans votre métier ?", "Et ce qu'il ou elle est devenu·e."],
];

/** Questions remplacées en priorité par les questions thématiques (index dans CORE). */
const REPLACEABLE_LONG = [50, 49, 45, 40, 35, 29, 21, 16];
const REPLACEABLE_SHORT = [37, 30, 22, 9];

export function buildLibrary(): LibraryQuestion[] {
  const core = CORE.map(([chapter, text, help, f], i) => ({
    id: `q${String(i + 1).padStart(2, "0")}`,
    chapter,
    text,
    help,
    official: f?.official,
    short: f?.short,
    status: f?.official ? ("validee" as const) : ("a_valider" as const),
    active: true,
  }));
  const themed = THEME_Q.map(([t, chapter, text, help], i) => ({
    id: `t${String(i + 1).padStart(2, "0")}`,
    chapter,
    text,
    help,
    theme: t,
    status: "a_valider" as const,
    active: true,
  }));
  return [...core, ...themed];
}

const chapterOrder = (k: ChapterKey) => CHAPTERS.findIndex((c) => c.key === k);

/** Sélectionne les questions d'un parcours (26 ou 52) pour un thème, dans l'ordre des chapitres. */
export function selectJourney(library: LibraryQuestion[], length: 26 | 52, t: ThemeCode): LibraryQuestion[] {
  const core = library.filter((q) => !q.theme && q.active);
  let base = length === 26 ? core.filter((q) => q.short) : core.slice();
  const extra = t === "vie" ? [] : library.filter((q) => q.theme === t && q.active);
  if (extra.length) {
    const replaceIdx = (length === 26 ? REPLACEABLE_SHORT : REPLACEABLE_LONG).map((i) => `q${String(i + 1).padStart(2, "0")}`);
    const remove = new Set(replaceIdx.filter((id) => base.some((q) => q.id === id)).slice(0, extra.length));
    base = base.filter((q) => !remove.has(q.id));
  }
  const all = [...base, ...extra].slice(0, Math.max(length, base.length + extra.length));
  return all
    .map((q, i) => ({ q, i }))
    .sort((a, b) => chapterOrder(a.q.chapter) - chapterOrder(b.q.chapter) || (a.q.theme ? 1 : 0) - (b.q.theme ? 1 : 0) || a.i - b.i)
    .map((x) => x.q)
    .slice(0, length);
}
