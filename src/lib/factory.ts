import { CHAPTERS, buildLibrary, selectJourney } from "./catalog";
import type {
  Chapter,
  DemoState,
  JourneyQuestion,
  LibraryQuestion,
  Order,
  Project,
} from "./types";
import { DAY, dayStart, token, uid } from "./utils";

export const STATE_VERSION = 3;
export const INVITATION_VALIDITY_DAYS = 30;

/** Crée le projet d'un narrateur à partir d'une commande payée. */
export function projectFromOrder(
  order: Order,
  library: LibraryQuestion[],
  now: number,
): Project {
  return createProject({ ...order, orderId: order.id }, library, now);
}

/** A project can exist before any purchase; personal manuscripts have no order. */
export function createProject(
  order: Pick<
    Order,
    | "recipient"
    | "buyerName"
    | "packageCode"
    | "theme"
    | "length"
    | "deliveryDate"
    | "extraCopies"
  > & { orderId: string | null },
  library: LibraryQuestion[],
  now: number,
): Project {
  const journey = selectJourney(library, order.length, order.theme);
  const usedKeys = new Set(journey.map((q) => q.chapter));
  const chapters: Chapter[] = CHAPTERS.filter((c) => usedKeys.has(c.key)).map(
    (c, i) => ({
      id: uid("ch"),
      key: c.key,
      title: c.title,
      order: i,
    }),
  );
  const questions: JourneyQuestion[] = journey.map((q, i) => ({
    id: uid("jq"),
    libraryId: q.id,
    text: q.text,
    help: q.help,
    chapter: q.chapter,
    index: i,
    status: "verrouillee",
    availableAt: Number.MAX_SAFE_INTEGER,
    remindersSent: 0,
  }));
  const sendAt = Math.max(now, dayStart(order.deliveryDate));
  return {
    id: uid("p"),
    orderId: order.orderId,
    kind: order.orderId ? "purchased" : "personal",
    narrator: {
      firstName: order.recipient.firstName,
      lastName: order.recipient.lastName,
      email: order.recipient.email,
    },
    buyerName: order.buyerName,
    relation: order.recipient.relation,
    packageCode: order.packageCode,
    theme: order.theme,
    length: order.length,
    invitation: {
      token: token(12),
      status: sendAt <= now ? "envoyee" : "programmee",
      sendAt,
      sentAt: sendAt <= now ? now : undefined,
      expiresAt: sendAt + INVITATION_VALIDITY_DAYS * DAY,
    },
    onboarded: false,
    privacy: {
      defaultVisibility: "moi",
      buyerSeesProgress: true,
      reminders: "douces",
      marketing: false,
    },
    cadenceDays: 7,
    questions,
    memories: [],
    audios: [],
    photos: [],
    chapters,
    editors: [],
    suggestions: [],
    book: {
      status: "brouillon",
      cover: {
        template: "prune",
        title: `Le livre de ${order.recipient.firstName}`,
        subtitle: "Souvenirs à transmettre",
      },
      dedication: "",
    },
    print: { copies: 1 + order.extraCopies, events: [] },
    createdAt: now,
  };
}

/** Démarre le calendrier des questions (à l'acceptation de l'invitation). */
export function startJourney(p: Project, now: number) {
  p.startedAt = now;
  p.questions.forEach((q, i) => {
    q.availableAt = now + i * p.cadenceDays * DAY;
    q.status = i === 0 ? "disponible" : "verrouillee";
  });
}

export function baseState(): DemoState {
  return {
    version: STATE_VERSION,
    scenario: "complet",
    persona: { role: "visiteur" },
    clockOffsetDays: 0,
    orders: [],
    projects: [],
    externalProjects: [],
    library: buildLibrary(),
    notifications: [],
    emails: [],
    support: [],
    guideOpen: false,
  };
}
