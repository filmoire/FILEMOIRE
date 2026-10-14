/** Shared manuscript model for the private workspace and isolated demo. */

export type PackageCode =
  | "essentiel"
  | "heritage"
  | "voix"
  | "bilingue"
  | "accompagne";
export type ThemeCode =
  | "vie"
  | "migration"
  | "metier"
  | "couple"
  | "parentalite"
  | "recettes"
  | "retraite";
export type ChapterKey =
  | "origines"
  | "enfance"
  | "famille"
  | "ecole"
  | "travail"
  | "migration"
  | "amour"
  | "epreuves"
  | "traditions"
  | "valeurs";

export type Persona =
  | { role: "visiteur" }
  | { role: "acheteur" }
  | { role: "narrateur"; projectId: string }
  | { role: "editeur"; email?: string; name?: string }
  | { role: "ops" };

export type Scenario = "complet" | "avance";

export interface LibraryQuestion {
  id: string;
  chapter: ChapterKey;
  text: string;
  help: string;
  /** Exemple officiel du dossier (diapositive 7). */
  official?: boolean;
  /** Fait partie du parcours court (26 questions). */
  short?: boolean;
  /** Question propre à un parcours thématique. */
  theme?: ThemeCode;
  status: "a_valider" | "validee";
  active: boolean;
}

export type QuestionStatus =
  | "verrouillee"
  | "disponible"
  | "brouillon"
  | "repondue"
  | "passee"
  | "reportee";

export interface JourneyQuestion {
  id: string;
  libraryId: string;
  text: string;
  help: string;
  chapter: ChapterKey;
  index: number;
  status: QuestionStatus;
  /** Date (ms) à laquelle la question devient disponible selon la cadence. */
  availableAt: number;
  postponedUntil?: number;
  remindersSent: number;
}

/** Qui peut lire un souvenir, en plus du narrateur. */
export type Visibility = "moi" | "editeur" | "famille";

export interface Revision {
  at: number;
  by: string;
  text: string;
}

export interface Memory {
  id: string;
  questionId: string;
  chapterId: string;
  /** Texte validé (celui qui va dans le livre). */
  text: string;
  /** Brouillon enregistré automatiquement, non encore validé. */
  draft?: string;
  status: "brouillon" | "terminee";
  visibility: Visibility;
  inBook: boolean;
  approvedByNarrator: boolean;
  createdAt: number;
  updatedAt: number;
  revisions: Revision[];
}

export type TranscriptStatus = "en_cours" | "a_relire" | "validee" | "echec";

export interface AudioRec {
  id: string;
  memoryId: string;
  /** Clé IndexedDB pour un enregistrement réel, ou chemin statique pour la démo. */
  blobKey?: string;
  src?: string;
  mime: string;
  durationSec: number;
  createdAt: number;
  sample?: boolean;
  transcript: {
    status: TranscriptStatus;
    text: string;
    simulated: boolean;
    manual?: boolean;
    validatedAt?: number;
  };
  qr: { enabled: boolean; token: string };
}

export interface Photo {
  id: string;
  blobKey?: string;
  src?: string;
  width: number;
  height: number;
  caption: string;
  date: string;
  people: string;
  chapterId?: string;
  memoryId?: string;
  order: number;
  inBook: boolean;
  illustration?: boolean;
  createdAt: number;
}

export interface Chapter {
  id: string;
  key: ChapterKey | "libre";
  title: string;
  order: number;
}

export interface EditorAccess {
  id: string;
  name: string;
  email: string;
  token: string;
  status: "invitee" | "active" | "revoquee";
  canSuggest: boolean;
  invitedAt: number;
  acceptedAt?: number;
}

export type SuggestionKind =
  | "texte"
  | "titre_chapitre"
  | "ordre_chapitres"
  | "legende_photo";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  targetId: string;
  before: string;
  after: string;
  note: string;
  author: string;
  status: "en_attente" | "acceptee" | "refusee";
  createdAt: number;
  decidedAt?: number;
}

export type BookStatus =
  | "brouillon"
  | "relecture_editoriale"
  | "relecture_narrateur"
  | "approuve"
  | "preparation"
  | "impression"
  | "expedie"
  | "livre";

export type CoverTemplate = "prune" | "creme" | "terre";

export interface PrintEvent {
  at: number;
  status: BookStatus | "incident";
  note: string;
  by: string;
}

export interface Address {
  name: string;
  line1: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface PrivacyPrefs {
  defaultVisibility: Visibility;
  buyerSeesProgress: boolean;
  reminders: "douces" | "aucune";
  marketing: boolean;
  /** Code à communiquer à la famille pour écouter les QR audio. */
  listenCode?: string;
  supportAccessUntil?: number;
  supportAccessReason?: string;
}

export interface Invitation {
  token: string;
  status: "programmee" | "envoyee" | "acceptee" | "expiree" | "revoquee";
  sendAt: number;
  sentAt?: number;
  acceptedAt?: number;
  expiresAt: number;
}

export interface Project {
  id: string;
  orderId: string | null;
  kind?: "purchased" | "personal";
  narrator: { firstName: string; lastName: string; email: string };
  buyerName: string;
  relation: string;
  packageCode: PackageCode;
  theme: ThemeCode;
  length: 26 | 52;
  invitation: Invitation;
  onboarded: boolean;
  consentAt?: number;
  privacy: PrivacyPrefs;
  cadenceDays: number;
  startedAt?: number;
  questions: JourneyQuestion[];
  memories: Memory[];
  audios: AudioRec[];
  photos: Photo[];
  chapters: Chapter[];
  editors: EditorAccess[];
  suggestions: Suggestion[];
  book: {
    status: BookStatus;
    cover: { template: CoverTemplate; title: string; subtitle: string };
    dedication: string;
    approvedAt?: number;
    previewedAt?: number;
  };
  print: {
    address?: Address;
    copies: number;
    events: PrintEvent[];
    tracking?: string;
    preflightRunAt?: number;
    incident?: string;
  };
  deletionRequestedAt?: number;
  createdAt: number;
}

export interface Payment {
  status: "acceptee" | "refusee";
  at: number;
  amount: number;
  label: string;
}

export interface Order {
  id: string;
  ref: string;
  buyerName: string;
  buyerEmail: string;
  packageCode: PackageCode;
  theme: ThemeCode;
  length: 26 | 52;
  recipient: {
    firstName: string;
    lastName: string;
    email: string;
    relation: string;
  };
  message: string;
  deliveryDate: string;
  giftBox: boolean;
  extraCopies: number;
  total: number;
  status: "en_attente" | "payee" | "annulee";
  payments: Payment[];
  projectId?: string;
  createdAt: number;
  /** Commandes d'autres familles fictives visibles uniquement côté Opérations. */
  external?: boolean;
}

export interface Notification {
  id: string;
  to: "acheteur" | "narrateur" | "editeur" | "ops";
  projectId?: string;
  title: string;
  body: string;
  href?: string;
  at: number;
  read: boolean;
}

export interface Email {
  id: string;
  to: string;
  subject: string;
  lines: string[];
  cta?: { label: string; href: string };
  at: number;
}

export interface SupportCase {
  id: string;
  ref: string;
  from: string;
  subject: string;
  body: string;
  status: "ouverte" | "en_cours" | "resolue";
  kind: "question" | "devis" | "suppression" | "incident";
  projectId?: string;
  createdAt: number;
}

/** Projets d'autres familles fictives : métadonnées uniquement (vue Opérations). */
export interface ExternalProject {
  id: string;
  orderRef: string;
  family: string;
  packageCode: PackageCode;
  answered: number;
  total: number;
  status: BookStatus;
  invitation: Invitation["status"];
  updatedAt: number;
  photosLowRes: number;
  tracking?: string;
}

export interface DemoState {
  version: number;
  scenario: Scenario;
  persona: Persona;
  clockOffsetDays: number;
  orders: Order[];
  projects: Project[];
  externalProjects: ExternalProject[];
  library: LibraryQuestion[];
  notifications: Notification[];
  emails: Email[];
  support: SupportCase[];
  guideOpen: boolean;
}
