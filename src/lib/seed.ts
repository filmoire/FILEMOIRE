/**
 * Données de démonstration — famille Martin entièrement FICTIVE.
 * Aucune donnée réelle de client ne doit être ajoutée ici.
 */
import { pkg } from "./catalog";
import { baseState, projectFromOrder, startJourney } from "./factory";
import type { DemoState, ExternalProject, Order, Project, Scenario, SupportCase } from "./types";
import { DAY, isoDay, uid } from "./utils";

export const FAMILY = {
  buyer: { name: "Sophie Martin", email: "sophie.martin@demo.filemoire.test" },
  narrator: { firstName: "Madeleine", lastName: "Martin", email: "madeleine.martin@demo.filemoire.test" },
  editor: { name: "Thomas Martin", email: "thomas.martin@demo.filemoire.test" },
};

function externals(now: number): { projects: ExternalProject[]; orders: Order[]; support: SupportCase[] } {
  const rows: [string, string, ExternalProject["packageCode"], number, number, ExternalProject["status"], ExternalProject["invitation"], number, string?][] = [
    ["Famille Diallo", "FM-2026-DL4K2", "voix", 47, 52, "impression", "acceptee", 0],
    ["Famille Nguyen", "FM-2026-NG7P3", "heritage", 52, 52, "preparation", "acceptee", 2],
    ["Famille Rossi", "FM-2026-RS2M8", "essentiel", 24, 26, "expedie", "acceptee", 0, "SIM-COL-58213"],
    ["Famille Benali", "FM-2026-BN9Q4", "heritage", 39, 52, "relecture_narrateur", "acceptee", 1],
    ["Famille Lefèvre", "FM-2026-LF3T6", "voix", 50, 52, "livre", "acceptee", 0, "SIM-COL-57720"],
    ["Famille Moreau", "FM-2026-MR5W2", "essentiel", 0, 26, "brouillon", "envoyee", 0],
  ];
  const projects = rows.map(([family, ref, code, answered, total, status, invitation, low, tracking], i) => ({
    id: `ext_${i}`,
    orderRef: ref,
    family,
    packageCode: code,
    answered,
    total,
    status,
    invitation,
    photosLowRes: low,
    tracking,
    updatedAt: now - (i + 1) * 2 * DAY,
  }));
  const orders: Order[] = projects.map((p, i) => ({
    id: `exto_${i}`,
    ref: p.orderRef,
    buyerName: `${["Awa", "Linh", "Marco", "Yasmine", "Claire", "Hugo"][i]} ${p.family.replace("Famille ", "")}`,
    buyerEmail: `client${i + 1}@demo.filemoire.test`,
    packageCode: p.packageCode,
    theme: "vie",
    length: p.total as 26 | 52,
    recipient: { firstName: "—", lastName: p.family.replace("Famille ", ""), email: `narrateur${i + 1}@demo.filemoire.test`, relation: "parent" },
    message: "",
    deliveryDate: isoDay(now - (90 - i * 12) * DAY),
    giftBox: i % 2 === 0,
    extraCopies: i % 3,
    total: (pkg(p.packageCode).price ?? 0) + (i % 3) * 4900,
    status: "payee",
    payments: [{ status: "acceptee", at: now - (90 - i * 12) * DAY, amount: pkg(p.packageCode).price ?? 0, label: "Paiement test (simulation)" }],
    createdAt: now - (90 - i * 12) * DAY,
    external: true,
  }));
  const support: SupportCase[] = [
    {
      id: "sup_1",
      ref: "SUP-0412",
      from: "client7@demo.filemoire.test",
      subject: "Demande de devis — Filémoire Bilingue (français / wolof)",
      body: "Bonjour, je voudrais offrir une édition bilingue à mon grand-père. Quels sont les délais ?",
      status: "ouverte",
      kind: "devis",
      createdAt: now - 3 * DAY,
    },
    {
      id: "sup_2",
      ref: "SUP-0415",
      from: "client6@demo.filemoire.test",
      subject: "Mon père n'a pas reçu l'invitation",
      body: "L'invitation a été envoyée il y a 4 jours mais elle n'apparaît pas dans sa boîte.",
      status: "en_cours",
      kind: "question",
      createdAt: now - 1 * DAY,
    },
  ];
  return { projects, orders, support };
}

function advancedProject(state: DemoState, now: number): { order: Order; project: Project } {
  const bought = now - 56 * DAY;
  const order: Order = {
    id: "o_madeleine",
    ref: "FM-2026-MDL24",
    buyerName: FAMILY.buyer.name,
    buyerEmail: FAMILY.buyer.email,
    packageCode: "heritage",
    theme: "vie",
    length: 52,
    recipient: { ...FAMILY.narrator, relation: "Ma mère" },
    message: "Maman, tu nous as tant raconté à table. Cette fois, on aimerait que tes histoires restent pour toujours. Avec tout notre amour, Sophie et Thomas.",
    deliveryDate: isoDay(bought),
    giftBox: true,
    extraCopies: 1,
    total: 17900 + 2900 + 4900,
    status: "payee",
    payments: [{ status: "acceptee", at: bought, amount: 17900 + 2900 + 4900, label: "Paiement test (simulation)" }],
    createdAt: bought,
  };
  const p = projectFromOrder(order, state.library, bought);
  p.id = "p_madeleine";
  order.projectId = p.id;
  p.invitation = { token: "madeleine-demo", status: "acceptee", sendAt: bought, sentAt: bought, acceptedAt: bought + 2 * DAY, expiresAt: bought + 30 * DAY };
  p.onboarded = true;
  p.consentAt = bought + 2 * DAY;
  p.privacy = { defaultVisibility: "moi", buyerSeesProgress: true, reminders: "douces", marketing: false };
  startJourney(p, bought + 2 * DAY);
  const ch = (key: string) => p.chapters.find((c) => c.key === key)!.id;
  const q = p.questions;
  const done = (i: number, text: string, visibility: "moi" | "editeur" | "famille", extra: Partial<Project["memories"][number]> = {}) => {
    const m = {
      id: `m_${i}`,
      questionId: q[i].id,
      chapterId: ch(q[i].chapter),
      text,
      status: "terminee" as const,
      visibility,
      inBook: true,
      approvedByNarrator: false,
      createdAt: q[i].availableAt + DAY,
      updatedAt: q[i].availableAt + 2 * DAY,
      revisions: [],
      ...extra,
    };
    q[i].status = "repondue";
    p.memories.push(m);
    return m;
  };
  done(
    0,
    "Le premier lieu, c'est la boulangerie de mes parents, rue Jean-Jaurès à Douarnenez. Nous habitions juste au-dessus, et la chaleur du four montait par le plancher. L'hiver, je faisais mes devoirs assise sur la marche de l'escalier, parce que c'était l'endroit le plus chaud de la maison.\n\nJe me souviens surtout des bruits : la porte qui grinçait à cinq heures du matin quand mon père descendait, la sonnette de la boutique, et ma mère qui disait « Bonjour madame » à chaque cliente, toujours sur le même ton.\n\nAutour de moi, il y avait mes parents, ma grand-mère Anne qui écossait les petits pois dans l'arrière-boutique, et mon frère Yves, de trois ans plus âgé, qui me laissait goûter les miettes des croissants ratés.",
    "famille",
    { approvedByNarrator: true },
  );
  done(
    1,
    "Je suis née le 14 mars 1949, à la maison, comme beaucoup d'enfants à l'époque. Ma mère racontait qu'il y avait eu une tempête cette nuit-là et que la sage-femme était arrivée trempée, son vélo à la main.\n\nMon père, lui, n'a pas pu monter tout de suite : il avait la fournée du matin à sortir. Il disait toujours que j'étais née « entre deux pains », et toute la famille l'a répété pendant des années.",
    "editeur",
  );
  done(
    2,
    "Mon père, Joseph, venait de Quimper. Il avait appris le métier de boulanger chez un oncle avant la guerre. Ma mère, Marie, était de Douarnenez même, fille de marin-pêcheur. Ils se sont mariés en 1946, dans la petite chapelle de Tréboul.\n\nMa grand-mère Anne, la mère de ma mère, vivait avec nous. Elle parlait breton avec les clientes âgées et français avec nous, les enfants. Je regrette de ne pas avoir appris sa langue.",
    "editeur",
  );
  q[3].status = "passee";
  done(4, "On disait dans la famille que mon grand-père avait gagné sa première barque aux cartes. Je ne l'ai jamais vraiment cru, et je préfère garder cette histoire pour moi.", "moi", { inBook: false });
  q[5].status = "brouillon";
  p.memories.push({
    id: "m_5",
    questionId: q[5].id,
    chapterId: ch(q[5].chapter),
    text: "",
    draft: "L'odeur du kouign-amann le dimanche matin. Ma mère le préparait la veille et le laissait reposer sous un torchon",
    status: "brouillon",
    visibility: "moi",
    inBook: true,
    approvedByNarrator: false,
    createdAt: now - 4 * DAY,
    updatedAt: now - 4 * DAY,
    revisions: [],
  });
  q[6].status = "reportee";
  q[6].postponedUntil = now + 3 * DAY;
  q[7].status = "disponible";
  // Les questions suivantes restent verrouillées (cadence hebdomadaire).

  p.audios.push({
    id: "a_1",
    memoryId: "m_1",
    src: "/demo/exemple-enregistrement.wav",
    mime: "audio/wav",
    durationSec: 6,
    createdAt: q[1].availableAt + DAY,
    sample: true,
    transcript: {
      status: "validee",
      simulated: true,
      validatedAt: q[1].availableAt + 2 * DAY,
      text: p.memories.find((m) => m.id === "m_1")!.text,
    },
    qr: { enabled: false, token: "qr-madeleine-naissance" },
  });

  p.photos.push(
    { id: "ph_1", src: "/demo/boulangerie.svg", width: 2400, height: 1600, caption: "La boulangerie de la rue Jean-Jaurès, vers 1955", date: "vers 1955", people: "Joseph et Marie Le Goff", chapterId: ch("origines"), memoryId: "m_0", order: 0, inBook: true, illustration: true, createdAt: bought + 10 * DAY },
    { id: "ph_2", src: "/demo/mariage.svg", width: 1600, height: 2200, caption: "Joseph et Marie le jour de leur mariage", date: "1946", people: "Joseph Le Goff, Marie Le Goff", chapterId: ch("origines"), memoryId: "m_2", order: 1, inBook: true, illustration: true, createdAt: bought + 20 * DAY },
    { id: "ph_3", src: "/demo/plage.svg", width: 2400, height: 1600, caption: "Plage des Sables-Blancs, été 1957", date: "été 1957", people: "Madeleine et Yves", chapterId: ch("enfance"), order: 2, inBook: true, illustration: true, createdAt: bought + 30 * DAY },
    { id: "ph_4", src: "/demo/classe.svg", width: 820, height: 560, caption: "Photo de classe, école Sainte-Thérèse, 1958", date: "1958", people: "", chapterId: ch("enfance"), order: 3, inBook: true, illustration: true, createdAt: bought + 31 * DAY },
  );

  p.editors.push({ id: "ed_thomas", name: FAMILY.editor.name, email: FAMILY.editor.email, token: "thomas-demo", status: "active", canSuggest: true, invitedAt: bought + 12 * DAY, acceptedAt: bought + 13 * DAY });
  p.suggestions.push(
    {
      id: "s_1",
      kind: "texte",
      targetId: "m_2",
      before: p.memories.find((m) => m.id === "m_2")!.text,
      after: p.memories.find((m) => m.id === "m_2")!.text.replace("en 1946", "en 1947"),
      note: "D'après le livret de famille que j'ai retrouvé chez toi, c'était en 1947. À toi de voir !",
      author: FAMILY.editor.name,
      status: "en_attente",
      createdAt: now - 2 * DAY,
    },
    {
      id: "s_2",
      kind: "legende_photo",
      targetId: "ph_1",
      before: "La boulangerie de la rue Jean-Jaurès, vers 1955",
      after: "La boulangerie Le Goff, rue Jean-Jaurès, vers 1955",
      note: "Le nom était peint sur la vitrine.",
      author: FAMILY.editor.name,
      status: "en_attente",
      createdAt: now - 2 * DAY,
    },
    {
      id: "s_3",
      kind: "titre_chapitre",
      targetId: ch("origines"),
      before: "Origines",
      after: "D'où je viens",
      note: "Un titre plus personnel ?",
      author: FAMILY.editor.name,
      status: "refusee",
      createdAt: now - 20 * DAY,
      decidedAt: now - 19 * DAY,
    },
  );
  p.book.cover = { template: "prune", title: "Au fil de Madeleine", subtitle: "De Douarnenez à Lyon" };
  p.book.dedication = "À Sophie, à Thomas, et à leurs enfants.";
  return { order, project: p };
}

export function seedState(scenario: Scenario, now = Date.now()): DemoState {
  const s = baseState();
  s.scenario = scenario;
  const ext = externals(now);
  s.externalProjects = ext.projects;
  s.orders = ext.orders;
  s.support = ext.support;
  if (scenario === "avance") {
    const { order, project } = advancedProject(s, now);
    s.orders.unshift(order);
    s.projects.push(project);
    const n = (to: DemoState["notifications"][number]["to"], title: string, body: string, href: string, ago: number) =>
      s.notifications.push({ id: uid("n"), to, projectId: project.id, title, body, href, at: now - ago * DAY, read: false });
    n("narrateur", "Une nouvelle question vous attend", `« ${project.questions[7].text} »`, `/narrateur/questions/${project.questions[7].id}`, 1);
    n("narrateur", "Thomas a proposé 2 modifications", "Vous décidez de les accepter ou non.", "/narrateur/livre", 2);
    n("acheteur", "Madeleine avance dans son livre", "4 questions répondues sur 52.", "/acheteur/suivi", 3);
    n("editeur", "Madeleine a partagé 2 souvenirs avec vous", "Vous pouvez les relire et proposer des corrections.", "/editeur/livres/p_madeleine", 10);
    s.emails.push(
      { id: uid("e"), to: FAMILY.buyer.email, subject: "Filémoire — confirmation de votre commande FM-2026-MDL24", lines: ["Votre commande Filémoire Héritage est confirmée (paiement test — simulation).", "L'invitation a été envoyée à Madeleine Martin."], cta: { label: "Suivre le projet", href: "/acheteur/suivi" }, at: order.createdAt },
      { id: uid("e"), to: FAMILY.narrator.email, subject: "Sophie Martin vous offre Filémoire", lines: ["Une question par semaine pour raconter votre vie, à votre rythme.", "Vous décidez de ce qui est partagé et de ce qui va dans le livre."], cta: { label: "Ouvrir mon invitation", href: "/invitation/madeleine-demo" }, at: order.createdAt },
      { id: uid("e"), to: FAMILY.editor.email, subject: "Madeleine Martin vous invite à l'aider pour son livre", lines: ["Vous lirez uniquement les souvenirs qu'elle partage avec vous.", "Vos corrections seront des suggestions : Madeleine garde le dernier mot."], cta: { label: "Accepter l'invitation", href: "/invitation/thomas-demo" }, at: order.createdAt + 12 * DAY },
    );
  }
  return s;
}
