/** Livre d'exemple public : histoire et personnes entièrement fictives. */
import { buildLibrary } from "./catalog";
import { projectFromOrder, startJourney } from "./factory";
import type { Order, Project } from "./types";

const T0 = new Date(2026, 0, 10).getTime();

const STORIES: [string, string, string?][] = [
  [
    "q06",
    "L'odeur des confitures de prunes, à la fin de l'été. Ma grand-mère installait la bassine en cuivre dans la cour et nous avions le droit, mon frère et moi, de lécher l'écumoire. Les guêpes tournaient autour de nous et personne ne s'en inquiétait.\n\nAujourd'hui encore, quand je passe devant un marché en septembre, je cherche des yeux les prunes d'Ente. Je n'en fais plus de confiture, mais j'en achète toujours un sachet, pour l'odeur.",
    "cuisine",
  ],
  [
    "q12",
    "C'est mon oncle Émile qui m'a appris à lire l'heure, à pêcher la truite et à ne pas avoir peur du noir. Il disait que la nuit n'était que le jour qui se repose.\n\nIl n'avait pas fait d'études, mais il savait expliquer les choses avec ses mains. Quand il voulait me montrer comment tourne la Terre, il prenait une orange et la lampe à pétrole.",
  ],
  [
    "q24",
    "Je suis entrée à l'atelier de Mme Roux à quinze ans, rue des Carmes, à Toulouse. Les premiers mois, je ne faisais que des ourlets. Elle les défaisait le soir quand ils n'étaient pas réguliers, et je recommençais le lendemain sans rien dire.\n\nElle répétait : « Un vêtement bien fait, c'est celui qu'on ne remarque pas. » J'ai mis des années à comprendre qu'elle parlait aussi des gens.",
    "atelier",
  ],
  [
    "q35",
    "J'ai rencontré Paul au bal de la Saint-Jean, à Moissac, en 1962. Il dansait mal et il le savait, alors il m'a proposé de marcher le long du canal plutôt que de danser. Nous avons parlé jusqu'à ce que l'orchestre range ses instruments.\n\nCinquante ans plus tard, il dansait toujours aussi mal. Nous avons quand même dansé à chaque mariage de la famille.",
    "jardin",
  ],
  [
    "q45",
    "La garbure du dimanche. Il faut du chou, des haricots tarbais, un morceau de confit et surtout de la patience : elle doit frémir toute la matinée. Ma mère disait qu'une garbure réussie tient la cuillère debout.\n\nJe l'ai faite pour chacun de mes petits-enfants la première fois qu'ils sont venus dormir à la maison. C'est devenu notre rituel.",
  ],
  [
    "q48",
    "Que rien n'est jamais vraiment perdu tant qu'on en parle. J'ai connu des années difficiles, comme tout le monde, mais j'ai toujours eu quelqu'un à qui raconter ma journée.\n\nAlors parlez-vous. Posez des questions à vos parents pendant qu'il est temps. C'est un peu pour cela que j'ai accepté d'écrire ce livre.",
  ],
];

let cache: Project | null = null;

export function sampleProject(): Project {
  if (cache) return cache;
  const library = buildLibrary();
  const order: Order = {
    id: "o_sample",
    ref: "EXEMPLE",
    buyerName: "Claire Delmas",
    buyerEmail: "exemple@demo.filemoire.test",
    packageCode: "voix",
    theme: "vie",
    length: 52,
    recipient: { firstName: "Rose", lastName: "Delmas", email: "rose@demo.filemoire.test", relation: "Ma grand-mère" },
    message: "",
    deliveryDate: "2026-01-10",
    giftBox: false,
    extraCopies: 0,
    total: 0,
    status: "payee",
    payments: [],
    createdAt: T0,
  };
  const p = projectFromOrder(order, library, T0);
  p.id = "p_sample";
  p.onboarded = true;
  startJourney(p, T0);
  STORIES.forEach(([libId, text, ill], i) => {
    const q = p.questions.find((x) => x.libraryId === libId)!;
    q.status = "repondue";
    const ch = p.chapters.find((c) => c.key === q.chapter)!;
    const mid = `sm_${i}`;
    p.memories.push({ id: mid, questionId: q.id, chapterId: ch.id, text, status: "terminee", visibility: "famille", inBook: true, approvedByNarrator: true, createdAt: T0, updatedAt: T0, revisions: [] });
    if (ill) p.photos.push({ id: `sp_${i}`, src: `/demo/${ill}.svg`, width: 2400, height: 1600, caption: { cuisine: "La cuisine de la grand-mère, à Agen", atelier: "L'atelier de la rue des Carmes", jardin: "Paul et Rose au jardin" }[ill]!, date: "", people: "", chapterId: ch.id, memoryId: mid, order: i, inBook: true, illustration: true, createdAt: T0 });
  });
  p.audios.push({
    id: "sa_1",
    memoryId: "sm_3",
    src: "/demo/exemple-enregistrement.wav",
    mime: "audio/wav",
    durationSec: 6,
    createdAt: T0,
    sample: true,
    transcript: { status: "validee", text: STORIES[3][1], simulated: true, validatedAt: T0 },
    qr: { enabled: true, token: "exemple-rose" },
  });
  p.book = {
    status: "approuve",
    cover: { template: "creme", title: "Au fil de Rose", subtitle: "D'Agen à Toulouse, une vie racontée" },
    dedication: "À mes petits-enfants, pour qu'ils sachent d'où vient la garbure.",
    approvedAt: new Date(2026, 4, 2).getTime(),
  };
  cache = p;
  return p;
}
