"use client";

/**
 * Store du prototype (Zustand + persistance localStorage).
 * localStorage ne sert QU'À conserver l'état de la démonstration dans ce navigateur :
 * ce n'est pas une base de données et ne convient pas à des données familiales réelles.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EXTRA_COPY_PRICE, GIFT_BOX_PRICE, VOICE_UPGRADE_PRICE, pkg } from "./catalog";
import { STATE_VERSION, projectFromOrder, startJourney } from "./factory";
import { deleteBlob } from "./media";
import { localizeData } from "@/i18n/core";
import { BOOK_FLOW, applySuggestion, isLocked, progress, refreshQuestions } from "./rules";
import { FAMILY, seedState } from "./seed";
import type {
  Address,
  BookStatus,
  ChapterKey,
  DemoState,
  Memory,
  Order,
  PackageCode,
  Persona,
  Photo,
  PrivacyPrefs,
  Project,
  Scenario,
  SupportCase,
  ThemeCode,
  Visibility,
} from "./types";
import { DAY, fmtEur, orderRef, token, uid } from "./utils";

export interface OrderInput {
  packageCode: PackageCode;
  theme: ThemeCode;
  recipient: { firstName: string; lastName: string; email: string; relation: string };
  message: string;
  deliveryDate: string;
  giftBox: boolean;
  extraCopies: number;
}

type Result = { ok: true; id?: string } | { ok: false; error: string };

interface Actions {
  hydrated: boolean;
  setHydrated: () => void;
  now: () => number;
  // démo
  setPersona: (p: Persona) => void;
  resetScenario: (s: Scenario) => void;
  advanceDays: (n: number) => void;
  toggleGuide: (open?: boolean) => void;
  setSimFail: (v: boolean) => void;
  markRead: (to: DemoState["notifications"][number]["to"]) => void;
  tick: () => void;
  // acheteur
  createOrder: (i: OrderInput) => string;
  payOrder: (orderId: string, outcome: "acceptee" | "refusee") => Result;
  cancelOrder: (orderId: string) => void;
  sendInvitationNow: (projectId: string) => void;
  resendInvitation: (projectId: string) => void;
  revokeInvitation: (projectId: string) => void;
  expireInvitation: (projectId: string) => void;
  buyExtraCopies: (orderId: string, n: number) => void;
  upgradeToVoice: (projectId: string) => void;
  addSupport: (c: Omit<SupportCase, "id" | "ref" | "createdAt" | "status">) => string;
  // narrateur
  acceptInvitation: (tok: string) => Result;
  completeOnboarding: (projectId: string, prefs: Pick<PrivacyPrefs, "defaultVisibility" | "buyerSeesProgress" | "reminders" | "marketing">) => void;
  saveDraft: (projectId: string, qid: string, text: string) => void;
  saveAnswer: (projectId: string, qid: string, text: string) => Result;
  skipQuestion: (projectId: string, qid: string) => void;
  postponeQuestion: (projectId: string, qid: string, days: number) => void;
  reopenQuestion: (projectId: string, qid: string) => void;
  requestNextQuestion: (projectId: string) => string | null;
  setCadence: (projectId: string, days: number) => void;
  setVisibility: (projectId: string, mid: string, v: Visibility) => void;
  setInBook: (projectId: string, mid: string, v: boolean) => void;
  setApproved: (projectId: string, mid: string, v: boolean) => void;
  editMemory: (projectId: string, mid: string, text: string) => void;
  deleteMemory: (projectId: string, mid: string) => void;
  moveMemory: (projectId: string, mid: string, chapterId: string) => void;
  addAudio: (projectId: string, qid: string, a: { blobKey?: string; src?: string; mime: string; durationSec: number; sample?: boolean }) => string;
  completeTranscription: (projectId: string, aid: string) => void;
  retryTranscription: (projectId: string, aid: string) => void;
  saveTranscript: (projectId: string, aid: string, text: string, validate: boolean) => void;
  insertTranscript: (projectId: string, aid: string) => void;
  deleteAudio: (projectId: string, aid: string) => void;
  setQr: (projectId: string, aid: string, enabled: boolean) => void;
  addPhotos: (projectId: string, photos: Pick<Photo, "blobKey" | "width" | "height" | "caption">[], link: { chapterId?: string; memoryId?: string }) => void;
  updatePhoto: (projectId: string, id: string, patch: Partial<Pick<Photo, "caption" | "date" | "people" | "chapterId" | "memoryId" | "inBook">>) => void;
  movePhoto: (projectId: string, id: string, dir: -1 | 1) => void;
  removePhoto: (projectId: string, id: string) => void;
  renameChapter: (projectId: string, id: string, title: string) => void;
  moveChapter: (projectId: string, id: string, dir: -1 | 1) => void;
  addChapter: (projectId: string, title: string) => void;
  deleteChapter: (projectId: string, id: string) => Result;
  decideSuggestion: (projectId: string, sid: string, accept: boolean) => void;
  inviteEditor: (projectId: string, name: string, email: string, canSuggest: boolean) => Result;
  revokeEditor: (projectId: string, id: string) => void;
  setEditorCanSuggest: (projectId: string, id: string, v: boolean) => void;
  setCover: (projectId: string, patch: Partial<Project["book"]["cover"]>) => void;
  setDedication: (projectId: string, text: string) => void;
  markPreviewed: (projectId: string) => void;
  requestEditorialReview: (projectId: string) => Result;
  startNarratorReview: (projectId: string) => void;
  approveBook: (projectId: string, address: Address) => Result;
  reopenBook: (projectId: string) => void;
  placePrintOrder: (projectId: string) => Result;
  setPrivacy: (projectId: string, patch: Partial<PrivacyPrefs>) => void;
  renewListenCode: (projectId: string) => void;
  grantSupport: (projectId: string, hours: number, reason: string) => void;
  revokeSupport: (projectId: string) => void;
  requestDeletion: (projectId: string) => void;
  cancelDeletion: (projectId: string) => void;
  // éditeur
  acceptEditorInvite: (tok: string) => Result;
  suggest: (projectId: string, s: { kind: Project["suggestions"][number]["kind"]; targetId: string; before: string; after: string; note: string }) => Result;
  finishEditorialReview: (projectId: string) => void;
  // opérations
  runPreflight: (projectId: string) => void;
  advancePrint: (projectId: string) => void;
  flagIncident: (projectId: string, note: string) => void;
  resolveIncident: (projectId: string) => void;
  advanceExternal: (id: string) => void;
  updateLibrary: (id: string, patch: Partial<DemoState["library"][number]>) => void;
  addLibraryQuestion: (chapter: ChapterKey, text: string, help: string) => void;
  setSupportStatus: (id: string, status: SupportCase["status"]) => void;
}

export type Store = DemoState & { simFail?: boolean } & Actions;

/** localStorage protégé (navigation privée, stockage bloqué…). */
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memoryStore.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memoryStore.set(k, v);
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memoryStore.delete(k);
    }
  },
};

const persistKeys: (keyof DemoState | "simFail")[] = [
  "version",
  "scenario",
  "persona",
  "clockOffsetDays",
  "orders",
  "projects",
  "externalProjects",
  "library",
  "notifications",
  "emails",
  "support",
  "guideOpen",
  "simFail",
];

const narratorName = (p: Project) => `${p.narrator.firstName} ${p.narrator.lastName}`;

export const useDemo = create<Store>()(
  persist(
    (set, get) => {
      /** Applique une mutation sur une copie profonde de l'état (simple et sûr pour un prototype). */
      const mutate = (fn: (d: DemoState & { simFail?: boolean }, now: number) => void) => {
        const s = get();
        const draft = structuredClone(pick(s)) as DemoState & { simFail?: boolean };
        fn(draft, s.now());
        set(draft);
      };
      const withProject = (projectId: string, fn: (p: Project, d: DemoState, now: number) => void) =>
        mutate((d, now) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (p) fn(p, d, now);
        });
      const notify = (d: DemoState, n: Omit<DemoState["notifications"][number], "id" | "read">) =>
        d.notifications.unshift({ ...n, id: uid("n"), read: false });
      const email = (d: DemoState, e: Omit<DemoState["emails"][number], "id">) => d.emails.unshift({ ...e, id: uid("e") });

      const scheduler = (d: DemoState, now: number) => {
        for (const p of d.projects) {
          const inv = p.invitation;
          if (inv.status === "programmee" && inv.sendAt <= now) {
            inv.status = "envoyee";
            inv.sentAt = now;
            sendInvitationEmail(d, p, now);
            notify(d, { to: "acheteur", projectId: p.id, title: "Invitation envoyée", body: `${narratorName(p)} a reçu votre cadeau aujourd'hui.`, href: "/acheteur/cadeaux", at: now });
          }
          if (inv.status === "envoyee" && inv.expiresAt < now) {
            inv.status = "expiree";
            notify(d, { to: "acheteur", projectId: p.id, title: "Invitation expirée", body: `L'invitation de ${p.narrator.firstName} n'a pas été ouverte. Vous pouvez la renvoyer.`, href: "/acheteur/cadeaux", at: now });
          }
          if (!p.startedAt || p.deletionRequestedAt) continue;
          const opened = refreshQuestions(p, now);
          for (const qid of opened) {
            const q = p.questions.find((x) => x.id === qid)!;
            notify(d, { to: "narrateur", projectId: p.id, title: "Une nouvelle question vous attend", body: `« ${q.text} »`, href: `/narrateur/questions/${q.id}`, at: now });
            if (p.privacy.reminders === "douces")
              email(d, { to: p.narrator.email, subject: "Votre question de la semaine", lines: [`« ${q.text} »`, "Répondez quand vous le souhaitez, par écrit ou à voix haute."], cta: { label: "Répondre", href: `/narrateur/questions/${q.id}` }, at: now });
          }
          if (p.privacy.reminders === "douces") {
            for (const q of p.questions) {
              const waiting = (q.status === "disponible" || q.status === "brouillon") && now - q.availableAt > 7 * DAY * (q.remindersSent + 1);
              if (waiting && q.remindersSent < 2) {
                q.remindersSent++;
                notify(d, { to: "narrateur", projectId: p.id, title: "Petit rappel, sans pression", body: `Une question vous attend depuis quelques jours. Vous pouvez aussi la passer ou la reporter.`, href: `/narrateur/questions/${q.id}`, at: now });
                email(d, { to: p.narrator.email, subject: "Une question vous attend (rappel doux)", lines: [`« ${q.text} »`, `Rappel ${q.remindersSent} sur 2 maximum. Vous pouvez désactiver les rappels dans vos réglages.`], cta: { label: "Voir la question", href: `/narrateur/questions/${q.id}` }, at: now });
              }
            }
          }
        }
      };

      const sendInvitationEmail = (d: DemoState, p: Project, now: number) => {
        const o = d.orders.find((x) => x.id === p.orderId);
        email(d, {
          to: p.narrator.email,
          subject: `${p.buyerName} vous offre Filémoire`,
          lines: [
            ...(o?.message ? [`Son message : « ${o.message} »`] : []),
            "Une question à la fois, à votre rythme, par écrit ou à voix haute.",
            "Vous décidez de ce qui est partagé, de ce qui va dans le livre, et vous validez le livre final.",
            `Ce lien est valable jusqu'au ${new Date(p.invitation.expiresAt).toLocaleDateString("fr-FR")}.`,
          ],
          cta: { label: "Ouvrir mon invitation", href: `/invitation/${p.invitation.token}` },
          at: now,
        });
      };

      const setBook = (d: DemoState, p: Project, status: BookStatus, note: string, by: string, now: number) => {
        p.book.status = status;
        p.print.events.push({ at: now, status, note, by });
      };

      return {
        ...seedState("complet"),
        simFail: false,
        hydrated: false,
        setHydrated: () => set({ hydrated: true }),
        now: () => Date.now() + get().clockOffsetDays * DAY,

        setPersona: (persona) => {
          set({ persona });
          get().tick();
        },
        resetScenario: (scenario) => {
          set({ ...localizeData(seedState(scenario)), simFail: false, persona: scenario === "avance" ? { role: "narrateur", projectId: "p_madeleine" } : { role: "visiteur" } });
        },
        advanceDays: (n) => {
          set({ clockOffsetDays: get().clockOffsetDays + n });
          get().tick();
        },
        toggleGuide: (open) => set({ guideOpen: open ?? !get().guideOpen }),
        setSimFail: (v) => set({ simFail: v }),
        markRead: (to) => mutate((d) => d.notifications.forEach((n) => n.to === to && (n.read = true))),
        tick: () => mutate((d, now) => scheduler(d, now)),

        createOrder: (i) => {
          const id = uid("o");
          mutate((d, now) => {
            const base = pkg(i.packageCode).price ?? 0;
            const total = base + (i.giftBox ? GIFT_BOX_PRICE : 0) + i.extraCopies * EXTRA_COPY_PRICE;
            d.orders.unshift({
              id,
              ref: orderRef(),
              buyerName: FAMILY.buyer.name,
              buyerEmail: FAMILY.buyer.email,
              packageCode: i.packageCode,
              theme: i.theme,
              length: pkg(i.packageCode).questions ?? 52,
              recipient: i.recipient,
              message: i.message,
              deliveryDate: i.deliveryDate,
              giftBox: i.giftBox,
              extraCopies: i.extraCopies,
              total,
              status: "en_attente",
              payments: [],
              createdAt: now,
            });
          });
          return id;
        },
        payOrder: (orderId, outcome) => {
          const o = get().orders.find((x) => x.id === orderId);
          if (!o || o.status !== "en_attente") return { ok: false, error: "Cette commande ne peut plus être payée." };
          mutate((d, now) => {
            const ord = d.orders.find((x) => x.id === orderId)!;
            ord.payments.push({ status: outcome, at: now, amount: ord.total, label: outcome === "acceptee" ? "Paiement test accepté (simulation)" : "Paiement test refusé (simulation)" });
            if (outcome === "refusee") return;
            ord.status = "payee";
            const p = localizeData(projectFromOrder(ord, d.library, now));
            ord.projectId = p.id;
            d.projects.push(p);
            email(d, {
              to: ord.buyerEmail,
              subject: `Filémoire — confirmation de votre commande ${ord.ref}`,
              lines: [
                `${pkg(ord.packageCode).name} pour ${ord.recipient.firstName} ${ord.recipient.lastName} — ${fmtEur(ord.total)} (paiement test, aucune somme débitée).`,
                p.invitation.status === "envoyee" ? "L'invitation vient d'être envoyée." : `L'invitation partira le ${new Date(p.invitation.sendAt).toLocaleDateString("fr-FR")}.`,
                "Vous suivrez l'avancement sans lire les réponses : elles appartiennent au narrateur.",
              ],
              cta: { label: "Suivre mon cadeau", href: "/acheteur/cadeaux" },
              at: now,
            });
            if (p.invitation.status === "envoyee") sendInvitationEmail(d, p, now);
            notify(d, { to: "acheteur", projectId: p.id, title: "Commande confirmée", body: `${ord.ref} — ${pkg(ord.packageCode).name}`, href: `/acheteur/commandes#${ord.id}`, at: now });
            notify(d, { to: "ops", title: "Nouvelle commande", body: `${ord.ref} — ${pkg(ord.packageCode).name}`, href: "/admin/commandes", at: now });
          });
          return outcome === "acceptee" ? { ok: true, id: orderId } : { ok: false, error: "Le paiement de test a été refusé. Aucune somme n'a été débitée ; vous pouvez réessayer." };
        },
        cancelOrder: (orderId) => mutate((d) => {
          const o = d.orders.find((x) => x.id === orderId);
          if (o && o.status === "en_attente") o.status = "annulee";
        }),
        sendInvitationNow: (projectId) => withProject(projectId, (p, d, now) => {
          if (p.invitation.status !== "programmee") return;
          p.invitation = { ...p.invitation, status: "envoyee", sendAt: now, sentAt: now, expiresAt: now + 30 * DAY };
          sendInvitationEmail(d, p, now);
        }),
        resendInvitation: (projectId) => withProject(projectId, (p, d, now) => {
          if (p.invitation.status === "acceptee") return;
          p.invitation = { token: token(12), status: "envoyee", sendAt: now, sentAt: now, expiresAt: now + 30 * DAY };
          sendInvitationEmail(d, p, now);
        }),
        revokeInvitation: (projectId) => withProject(projectId, (p) => {
          if (p.invitation.status !== "acceptee") p.invitation.status = "revoquee";
        }),
        expireInvitation: (projectId) => withProject(projectId, (p, _d, now) => {
          if (p.invitation.status === "envoyee") {
            p.invitation.status = "expiree";
            p.invitation.expiresAt = now - 1;
          }
        }),
        buyExtraCopies: (orderId, n) => mutate((d, now) => {
          const o = d.orders.find((x) => x.id === orderId);
          if (!o) return;
          o.extraCopies += n;
          o.total += n * EXTRA_COPY_PRICE;
          o.payments.push({ status: "acceptee", at: now, amount: n * EXTRA_COPY_PRICE, label: `${n} exemplaire(s) supplémentaire(s) — paiement test (simulation)` });
          const p = d.projects.find((x) => x.id === o.projectId);
          if (p) p.print.copies += n;
          email(d, { to: o.buyerEmail, subject: `Filémoire — ${n} exemplaire(s) supplémentaire(s)`, lines: [`Ajouté à la commande ${o.ref} (paiement test).`, "Ils seront imprimés avec le livre, après validation par le narrateur."], at: now });
        }),
        upgradeToVoice: (projectId) => withProject(projectId, (p, d, now) => {
          if (p.packageCode !== "heritage") return;
          p.packageCode = "voix";
          const o = d.orders.find((x) => x.id === p.orderId);
          if (o) {
            o.packageCode = "voix";
            o.total += VOICE_UPGRADE_PRICE;
            o.payments.push({ status: "acceptee", at: now, amount: VOICE_UPGRADE_PRICE, label: "Passage à Filémoire Voix — paiement test (simulation)" });
          }
          notify(d, { to: "narrateur", projectId: p.id, title: "Filémoire Voix activé", body: "Vos enregistrements peuvent désormais être écoutés grâce à un QR code privé dans le livre, si vous l'autorisez.", href: "/narrateur/souvenirs", at: now });
        }),
        addSupport: (c) => {
          const id = uid("sup");
          mutate((d, now) => {
            d.support.unshift({ ...c, id, ref: `SUP-${String(420 + d.support.length).padStart(4, "0")}`, status: "ouverte", createdAt: now });
            notify(d, { to: "ops", title: "Nouvelle demande", body: c.subject, href: "/admin/support", at: now });
          });
          return id;
        },

        acceptInvitation: (tok) => {
          const p = get().projects.find((x) => x.invitation.token === tok);
          if (!p) return { ok: false, error: "inconnue" };
          if (p.invitation.status === "acceptee") {
            set({ persona: { role: "narrateur", projectId: p.id } });
            return { ok: true, id: p.id };
          }
          if (p.invitation.status !== "envoyee") return { ok: false, error: p.invitation.status };
          withProject(p.id, (pp, d, now) => {
            pp.invitation.status = "acceptee";
            pp.invitation.acceptedAt = now;
            notify(d, { to: "acheteur", projectId: pp.id, title: `${pp.narrator.firstName} a accepté votre cadeau`, body: "Son parcours peut commencer.", href: "/acheteur/suivi", at: now });
          });
          set({ persona: { role: "narrateur", projectId: p.id } });
          return { ok: true, id: p.id };
        },
        completeOnboarding: (projectId, prefs) => withProject(projectId, (p, d, now) => {
          p.privacy = { ...p.privacy, ...prefs };
          p.onboarded = true;
          p.consentAt = now;
          if (!p.startedAt) startJourney(p, now);
          email(d, { to: d.orders.find((o) => o.id === p.orderId)?.buyerEmail ?? FAMILY.buyer.email, subject: `${p.narrator.firstName} a commencé son livre Filémoire`, lines: ["Son parcours de questions a démarré.", "Vous verrez sa progression, pas le contenu de ses réponses."], cta: { label: "Voir la progression", href: "/acheteur/suivi" }, at: now });
        }),
        saveDraft: (projectId, qid, text) => withProject(projectId, (p, _d, now) => {
          const q = p.questions.find((x) => x.id === qid);
          if (!q || isLocked(p)) return;
          let m = p.memories.find((x) => x.questionId === qid);
          if (!m) {
            m = newMemory(p, qid, now);
            p.memories.push(m);
          }
          m.draft = text;
          m.updatedAt = now;
          if (q.status === "disponible" || q.status === "reportee") q.status = "brouillon";
        }),
        saveAnswer: (projectId, qid, text) => {
          const t = text.trim();
          if (!t) return { ok: false, error: "Écrivez au moins quelques mots avant d'enregistrer, ou utilisez « Passer »." };
          const p0 = get().projects.find((x) => x.id === projectId);
          if (p0 && isLocked(p0)) return { ok: false, error: "Le livre est validé : les réponses ne peuvent plus être modifiées." };
          withProject(projectId, (p, d, now) => {
            const q = p.questions.find((x) => x.id === qid)!;
            let m = p.memories.find((x) => x.questionId === qid);
            if (!m) {
              m = newMemory(p, qid, now);
              p.memories.push(m);
            }
            if (m.status === "terminee" && m.text && m.text !== t) m.revisions.push({ at: now, by: p.narrator.firstName, text: m.text });
            const first = q.status !== "repondue";
            m.text = t;
            m.draft = undefined;
            m.status = "terminee";
            m.updatedAt = now;
            q.status = "repondue";
            if (first && p.privacy.buyerSeesProgress) {
              const pr = progress(p);
              notify(d, { to: "acheteur", projectId: p.id, title: `${p.narrator.firstName} avance dans son livre`, body: `${pr.answered} question(s) répondue(s) sur ${pr.total}.`, href: "/acheteur/suivi", at: now });
            }
          });
          return { ok: true };
        },
        skipQuestion: (projectId, qid) => withProject(projectId, (p) => {
          const q = p.questions.find((x) => x.id === qid);
          if (q && q.status !== "repondue") q.status = "passee";
        }),
        postponeQuestion: (projectId, qid, days) => withProject(projectId, (p, _d, now) => {
          const q = p.questions.find((x) => x.id === qid);
          if (q && q.status !== "repondue") {
            q.status = "reportee";
            q.postponedUntil = now + days * DAY;
          }
        }),
        reopenQuestion: (projectId, qid) => withProject(projectId, (p) => {
          const q = p.questions.find((x) => x.id === qid);
          if (!q) return;
          const hasDraft = p.memories.some((m) => m.questionId === qid && m.draft);
          q.status = hasDraft ? "brouillon" : "disponible";
          q.postponedUntil = undefined;
        }),
        requestNextQuestion: (projectId) => {
          const p = get().projects.find((x) => x.id === projectId);
          const next = p?.questions.find((q) => q.status === "verrouillee");
          if (!next) return null;
          withProject(projectId, (pp, _d, now) => {
            const q = pp.questions.find((x) => x.id === next.id)!;
            q.status = "disponible";
            q.availableAt = now;
          });
          return next.id;
        },
        setCadence: (projectId, days) => withProject(projectId, (p, _d, now) => {
          p.cadenceDays = days;
          let k = 1;
          for (const q of p.questions) if (q.status === "verrouillee") q.availableAt = days === 0 ? Number.MAX_SAFE_INTEGER : now + k++ * days * DAY;
        }),
        setVisibility: (projectId, mid, v) => withProject(projectId, (p, d, now) => {
          const m = p.memories.find((x) => x.id === mid);
          if (!m) return;
          const was = m.visibility;
          m.visibility = v;
          if (v !== "moi" && was === "moi" && p.editors.some((e) => e.status === "active"))
            notify(d, { to: "editeur", projectId: p.id, title: `${p.narrator.firstName} a partagé un souvenir avec vous`, body: "Vous pouvez le relire et proposer des corrections.", href: `/editeur/livres/${p.id}`, at: now });
          if (v === "famille" && was !== "famille")
            notify(d, { to: "acheteur", projectId: p.id, title: `${p.narrator.firstName} a partagé un souvenir avec la famille`, body: "Il est maintenant lisible dans votre suivi.", href: "/acheteur/suivi", at: now });
        }),
        setInBook: (projectId, mid, v) => withProject(projectId, (p) => {
          const m = p.memories.find((x) => x.id === mid);
          if (m && !isLocked(p)) m.inBook = v;
        }),
        setApproved: (projectId, mid, v) => withProject(projectId, (p) => {
          const m = p.memories.find((x) => x.id === mid);
          if (m) m.approvedByNarrator = v;
        }),
        editMemory: (projectId, mid, text) => withProject(projectId, (p, _d, now) => {
          const m = p.memories.find((x) => x.id === mid);
          if (!m || isLocked(p) || !text.trim()) return;
          if (m.text !== text) m.revisions.push({ at: now, by: p.narrator.firstName, text: m.text });
          m.text = text.trim();
          m.updatedAt = now;
          // Une suggestion fondée sur l'ancien texte devient obsolète.
          p.suggestions.forEach((s) => {
            if (s.kind === "texte" && s.targetId === mid && s.status === "en_attente" && s.before !== m!.text) s.status = "refusee";
          });
        }),
        deleteMemory: (projectId, mid) => {
          const p = get().projects.find((x) => x.id === projectId);
          p?.audios.filter((a) => a.memoryId === mid && a.blobKey).forEach((a) => void deleteBlob(a.blobKey!));
          withProject(projectId, (pp) => {
            const m = pp.memories.find((x) => x.id === mid);
            if (!m) return;
            pp.memories = pp.memories.filter((x) => x.id !== mid);
            pp.audios = pp.audios.filter((a) => a.memoryId !== mid);
            pp.photos.forEach((ph) => ph.memoryId === mid && (ph.memoryId = undefined));
            pp.suggestions = pp.suggestions.filter((s) => s.targetId !== mid);
            const q = pp.questions.find((x) => x.id === m.questionId);
            if (q) q.status = "disponible";
          });
        },
        moveMemory: (projectId, mid, chapterId) => withProject(projectId, (p) => {
          const m = p.memories.find((x) => x.id === mid);
          if (m && !isLocked(p)) {
            m.chapterId = chapterId;
            p.photos.forEach((ph) => ph.memoryId === mid && (ph.chapterId = chapterId));
          }
        }),
        addAudio: (projectId, qid, a) => {
          const id = uid("a");
          withProject(projectId, (p, d, now) => {
            let m = p.memories.find((x) => x.questionId === qid);
            if (!m) {
              m = newMemory(p, qid, now);
              p.memories.push(m);
            }
            const q = p.questions.find((x) => x.id === qid)!;
            if (q.status === "disponible" || q.status === "reportee") q.status = "brouillon";
            p.audios.push({ id, memoryId: m.id, ...a, createdAt: now, transcript: { status: "en_cours", text: "", simulated: true }, qr: { enabled: false, token: token(14) } });
            void d;
          });
          setTimeout(() => get().completeTranscription(projectId, id), 2500);
          return id;
        },
        completeTranscription: (projectId, aid) => {
          const fail = !!get().simFail;
          withProject(projectId, (p) => {
            const a = p.audios.find((x) => x.id === aid);
            if (!a || a.transcript.status !== "en_cours") return;
            if (fail) {
              a.transcript.status = "echec";
              return;
            }
            a.transcript.status = "a_relire";
            a.transcript.text = simulatedTranscript(a.durationSec);
          });
        },
        retryTranscription: (projectId, aid) => {
          withProject(projectId, (p) => {
            const a = p.audios.find((x) => x.id === aid);
            if (a) a.transcript.status = "en_cours";
          });
          setTimeout(() => get().completeTranscription(projectId, aid), 2500);
        },
        saveTranscript: (projectId, aid, text, validate) => withProject(projectId, (p, _d, now) => {
          const a = p.audios.find((x) => x.id === aid);
          if (!a) return;
          a.transcript.text = text;
          if (validate) {
            a.transcript.status = "validee";
            a.transcript.validatedAt = now;
          }
        }),
        insertTranscript: (projectId, aid) => withProject(projectId, (p, _d, now) => {
          const a = p.audios.find((x) => x.id === aid);
          const m = a && p.memories.find((x) => x.id === a.memoryId);
          if (!a || !m || a.transcript.status !== "validee") return;
          const base = m.draft ?? m.text;
          m.draft = base.trim() ? `${base.trim()}\n\n${a.transcript.text.trim()}` : a.transcript.text.trim();
          m.updatedAt = now;
          const q = p.questions.find((x) => x.id === m.questionId);
          if (q && q.status !== "repondue") q.status = "brouillon";
        }),
        deleteAudio: (projectId, aid) => {
          const a = get().projects.find((x) => x.id === projectId)?.audios.find((x) => x.id === aid);
          if (a?.blobKey) void deleteBlob(a.blobKey);
          withProject(projectId, (p) => {
            p.audios = p.audios.filter((x) => x.id !== aid);
          });
        },
        setQr: (projectId, aid, enabled) => withProject(projectId, (p) => {
          const a = p.audios.find((x) => x.id === aid);
          if (!a || !pkg(p.packageCode).qr) return;
          a.qr.enabled = enabled;
          if (enabled && !p.privacy.listenCode) p.privacy.listenCode = String(Math.floor(100000 + Math.random() * 900000));
        }),
        addPhotos: (projectId, photos, link) => withProject(projectId, (p, _d, now) => {
          let order = p.photos.length;
          for (const ph of photos)
            p.photos.push({ id: uid("ph"), ...ph, date: "", people: "", chapterId: link.chapterId, memoryId: link.memoryId, order: order++, inBook: true, createdAt: now });
        }),
        updatePhoto: (projectId, id, patch) => withProject(projectId, (p) => {
          const ph = p.photos.find((x) => x.id === id);
          if (!ph) return;
          Object.assign(ph, patch);
          if (patch.memoryId) {
            const m = p.memories.find((x) => x.id === patch.memoryId);
            if (m) ph.chapterId = m.chapterId;
          }
        }),
        movePhoto: (projectId, id, dir) => withProject(projectId, (p) => {
          const list = p.photos.slice().sort((a, b) => a.order - b.order);
          const i = list.findIndex((x) => x.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          list.forEach((ph, k) => (p.photos.find((x) => x.id === ph.id)!.order = k));
        }),
        removePhoto: (projectId, id) => {
          const ph = get().projects.find((x) => x.id === projectId)?.photos.find((x) => x.id === id);
          if (ph?.blobKey) void deleteBlob(ph.blobKey);
          withProject(projectId, (p) => {
            p.photos = p.photos.filter((x) => x.id !== id);
            p.suggestions = p.suggestions.filter((s) => s.targetId !== id);
          });
        },
        renameChapter: (projectId, id, title) => withProject(projectId, (p) => {
          const c = p.chapters.find((x) => x.id === id);
          if (c && title.trim() && !isLocked(p)) c.title = title.trim();
        }),
        moveChapter: (projectId, id, dir) => withProject(projectId, (p) => {
          if (isLocked(p)) return;
          const list = p.chapters.slice().sort((a, b) => a.order - b.order);
          const i = list.findIndex((x) => x.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          list.forEach((c, k) => (p.chapters.find((x) => x.id === c.id)!.order = k));
        }),
        addChapter: (projectId, title) => withProject(projectId, (p) => {
          if (!title.trim() || isLocked(p)) return;
          p.chapters.push({ id: uid("ch"), key: "libre", title: title.trim(), order: p.chapters.length });
        }),
        deleteChapter: (projectId, id) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return { ok: false, error: "Projet introuvable." };
          if (p.memories.some((m) => m.chapterId === id) || p.photos.some((ph) => ph.chapterId === id) || p.questions.some((q) => q.chapter === p.chapters.find((c) => c.id === id)?.key))
            return { ok: false, error: "Seuls les chapitres libres et vides peuvent être supprimés." };
          withProject(projectId, (pp) => {
            pp.chapters = pp.chapters.filter((c) => c.id !== id);
          });
          return { ok: true };
        },
        decideSuggestion: (projectId, sid, accept) => withProject(projectId, (p, d, now) => {
          const s = p.suggestions.find((x) => x.id === sid);
          if (!s || s.status !== "en_attente") return;
          s.status = accept ? "acceptee" : "refusee";
          s.decidedAt = now;
          if (accept) applySuggestion(p, s, now);
          notify(d, { to: "editeur", projectId: p.id, title: accept ? "Suggestion acceptée" : "Suggestion refusée", body: `${p.narrator.firstName} a ${accept ? "accepté" : "refusé"} votre proposition.`, href: "/editeur/relecture", at: now });
        }),
        inviteEditor: (projectId, name, email, canSuggest) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return { ok: false, error: "Projet introuvable." };
          if (p.editors.some((e) => e.status !== "revoquee")) return { ok: false, error: "Un éditeur familial est déjà invité. Retirez son accès avant d'en inviter un autre." };
          if (email.trim().toLowerCase() === p.narrator.email.toLowerCase()) return { ok: false, error: "Indiquez l'adresse d'une autre personne." };
          withProject(projectId, (pp, d, now) => {
            const tok = token(12);
            pp.editors.push({ id: uid("ed"), name: name.trim(), email: email.trim().toLowerCase(), token: tok, status: "invitee", canSuggest, invitedAt: now });
            d.emails.unshift({
              id: uid("e"),
              to: email.trim().toLowerCase(),
              subject: `${narratorName(pp)} vous invite à l'aider pour son livre`,
              lines: ["Vous lirez uniquement les souvenirs qu'elle ou il choisit de partager avec vous.", "Vos corrections seront des suggestions : le narrateur garde le dernier mot."],
              cta: { label: "Accepter l'invitation", href: `/invitation/${tok}` },
              at: now,
            });
          });
          return { ok: true };
        },
        revokeEditor: (projectId, id) => withProject(projectId, (p, d, now) => {
          const e = p.editors.find((x) => x.id === id);
          if (!e) return;
          e.status = "revoquee";
          p.suggestions.forEach((s) => s.status === "en_attente" && s.author === e.name && (s.status = "refusee"));
          notify(d, { to: "editeur", projectId: p.id, title: "Accès retiré", body: `${p.narrator.firstName} a retiré votre accès à son livre.`, at: now });
        }),
        setEditorCanSuggest: (projectId, id, v) => withProject(projectId, (p) => {
          const e = p.editors.find((x) => x.id === id);
          if (e) e.canSuggest = v;
        }),
        setCover: (projectId, patch) => withProject(projectId, (p) => {
          if (!isLocked(p)) Object.assign(p.book.cover, patch);
        }),
        setDedication: (projectId, text) => withProject(projectId, (p) => {
          if (!isLocked(p)) p.book.dedication = text;
        }),
        markPreviewed: (projectId) => withProject(projectId, (p, _d, now) => {
          p.book.previewedAt = now;
        }),
        requestEditorialReview: (projectId) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p?.editors.some((e) => e.status === "active")) return { ok: false, error: "Invitez d'abord un éditeur familial (et attendez qu'il accepte)." };
          withProject(projectId, (pp, d, now) => {
            setBook(d, pp, "relecture_editoriale", "Relecture demandée à l'éditeur familial", pp.narrator.firstName, now);
            notify(d, { to: "editeur", projectId: pp.id, title: "Relecture demandée", body: `${pp.narrator.firstName} vous demande de relire les souvenirs partagés.`, href: `/editeur/livres/${pp.id}`, at: now });
          });
          return { ok: true };
        },
        startNarratorReview: (projectId) => withProject(projectId, (p, d, now) => {
          if (BOOK_FLOW.indexOf(p.book.status) < BOOK_FLOW.indexOf("relecture_narrateur")) setBook(d, p, "relecture_narrateur", "Relecture finale par le narrateur", p.narrator.firstName, now);
        }),
        approveBook: (projectId, address) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return { ok: false, error: "Projet introuvable." };
          if (isLocked(p)) return { ok: false, error: "Le livre est déjà validé." };
          if (p.suggestions.some((s) => s.status === "en_attente")) return { ok: false, error: "Des suggestions attendent votre décision. Acceptez-les ou refusez-les avant de valider." };
          if (!p.memories.some((m) => m.status === "terminee" && m.inBook)) return { ok: false, error: "Le livre ne contient encore aucun souvenir terminé." };
          withProject(projectId, (pp, d, now) => {
            pp.print.address = address;
            pp.book.approvedAt = now;
            pp.memories.forEach((m) => m.status === "terminee" && m.inBook && (m.approvedByNarrator = true));
            setBook(d, pp, "approuve", "Contenu validé par le narrateur — livre verrouillé", pp.narrator.firstName, now);
            notify(d, { to: "acheteur", projectId: pp.id, title: `${pp.narrator.firstName} a validé son livre`, body: "L'impression peut être lancée.", href: "/acheteur/suivi", at: now });
          });
          return { ok: true };
        },
        reopenBook: (projectId) => withProject(projectId, (p, d, now) => {
          if (p.book.status === "approuve") {
            setBook(d, p, "relecture_narrateur", "Validation retirée par le narrateur avant impression", p.narrator.firstName, now);
            p.book.approvedAt = undefined;
          }
        }),
        placePrintOrder: (projectId) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p || p.book.status !== "approuve") return { ok: false, error: "Le narrateur doit d'abord valider le livre." };
          if (!p.print.address) return { ok: false, error: "Adresse de livraison manquante." };
          withProject(projectId, (pp, d, now) => {
            setBook(d, pp, "preparation", "Commande d'impression SIMULÉE transmise à l'équipe Filémoire (aucun imprimeur réel)", pp.narrator.firstName, now);
            notify(d, { to: "ops", title: "Livre à préparer", body: `${narratorName(pp)} — ${pp.print.copies} exemplaire(s)`, href: "/admin/impression", at: now });
            notify(d, { to: "acheteur", projectId: pp.id, title: "Impression demandée", body: "Le livre entre en préparation (simulation).", href: "/acheteur/suivi", at: now });
          });
          return { ok: true };
        },
        setPrivacy: (projectId, patch) => withProject(projectId, (p) => Object.assign(p.privacy, patch)),
        renewListenCode: (projectId) => withProject(projectId, (p) => {
          p.privacy.listenCode = String(Math.floor(100000 + Math.random() * 900000));
        }),
        grantSupport: (projectId, hours, reason) => withProject(projectId, (p, d, now) => {
          p.privacy.supportAccessUntil = now + hours * 3_600_000;
          p.privacy.supportAccessReason = reason;
          notify(d, { to: "ops", title: "Accès temporaire accordé", body: `${narratorName(p)} — ${hours} h : ${reason}`, href: "/admin/projets", at: now });
        }),
        revokeSupport: (projectId) => withProject(projectId, (p) => {
          p.privacy.supportAccessUntil = undefined;
          p.privacy.supportAccessReason = undefined;
        }),
        requestDeletion: (projectId) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return;
          get().addSupport({ from: p.narrator.email, subject: `Demande de suppression des contenus — ${narratorName(p)}`, body: "Le narrateur demande la suppression de ses réponses, enregistrements et photos.", kind: "suppression", projectId });
          withProject(projectId, (pp, d, now) => {
            pp.deletionRequestedAt = now;
            d.emails.unshift({ id: uid("e"), to: pp.narrator.email, subject: "Filémoire — votre demande de suppression", lines: ["Nous avons bien reçu votre demande. Vous pouvez l'annuler pendant 14 jours.", "Prototype : aucune suppression définitive n'est exécutée ; en production, elle serait traitée côté serveur."], at: now });
          });
        },
        cancelDeletion: (projectId) => withProject(projectId, (p) => {
          p.deletionRequestedAt = undefined;
        }),

        acceptEditorInvite: (tok) => {
          const p = get().projects.find((x) => x.editors.some((e) => e.token === tok));
          const e = p?.editors.find((x) => x.token === tok);
          if (!p || !e) return { ok: false, error: "inconnue" };
          if (e.status === "revoquee") return { ok: false, error: "revoquee" };
          withProject(p.id, (pp, d, now) => {
            const ed = pp.editors.find((x) => x.token === tok)!;
            if (ed.status === "invitee") {
              ed.status = "active";
              ed.acceptedAt = now;
              notify(d, { to: "narrateur", projectId: pp.id, title: `${ed.name} a accepté votre invitation`, body: "Il ou elle ne voit que les souvenirs que vous partagez avec votre éditeur.", href: "/narrateur/famille", at: now });
            }
          });
          set({ persona: { role: "editeur", email: e.email, name: e.name } });
          return { ok: true, id: p.id };
        },
        suggest: (projectId, s) => {
          const p = get().projects.find((x) => x.id === projectId);
          const persona = get().persona;
          const email = persona.role === "editeur" ? persona.email ?? FAMILY.editor.email : "";
          const ed = p?.editors.find((e) => e.email === email && e.status === "active");
          if (!p || !ed) return { ok: false, error: "Vous n'avez pas (ou plus) accès à ce livre." };
          if (!ed.canSuggest) return { ok: false, error: "Le narrateur ne vous a pas autorisé à proposer des modifications." };
          if (isLocked(p)) return { ok: false, error: "Le livre est validé : plus aucune modification n'est possible." };
          if (!s.after.trim() || s.after.trim() === s.before.trim()) return { ok: false, error: "Votre proposition est identique au texte actuel." };
          withProject(projectId, (pp, d, now) => {
            pp.suggestions.push({ id: uid("s"), ...s, after: s.after.trim(), author: ed.name, status: "en_attente", createdAt: now });
            notify(d, { to: "narrateur", projectId: pp.id, title: `${ed.name} propose une modification`, body: "Vous décidez de l'accepter ou non.", href: "/narrateur/livre", at: now });
          });
          return { ok: true };
        },
        finishEditorialReview: (projectId) => withProject(projectId, (p, d, now) => {
          const persona = get().persona;
          const email = persona.role === "editeur" ? persona.email ?? FAMILY.editor.email : "";
          const editor = p.editors.find((e) => e.email === email && e.status === "active");
          if (!editor || isLocked(p)) return;
          if (p.book.status !== "relecture_editoriale") return;
          setBook(d, p, "relecture_narrateur", "Relecture éditoriale terminée", editor.name, now);
          notify(d, { to: "narrateur", projectId: p.id, title: "Relecture terminée", body: `${editor.name} a terminé sa relecture. À vous de valider.`, href: "/narrateur/livre", at: now });
        }),

        runPreflight: (projectId) => withProject(projectId, (p, _d, now) => {
          p.print.preflightRunAt = now;
        }),
        advancePrint: (projectId) => withProject(projectId, (p, d, now) => {
          const next: Partial<Record<BookStatus, BookStatus>> = { preparation: "impression", impression: "expedie", expedie: "livre" };
          const to = next[p.book.status];
          if (!to || p.print.incident) return;
          if (to === "impression" && !p.print.preflightRunAt) return;
          if (to === "expedie") p.print.tracking = `SIM-COL-${Math.floor(10000 + Math.random() * 89999)}`;
          const label = { impression: "Envoyé à l'impression (simulation)", expedie: "Expédié — suivi fictif", livre: "Livré (simulation)" }[to as "impression" | "expedie" | "livre"];
          setBook(d, p, to, label, "Équipe Filémoire", now);
          const o = d.orders.find((x) => x.id === p.orderId);
          notify(d, { to: "acheteur", projectId: p.id, title: `Livre : ${label}`, body: narratorName(p), href: "/acheteur/suivi", at: now });
          notify(d, { to: "narrateur", projectId: p.id, title: `Votre livre : ${label}`, body: "Merci d'avoir raconté.", href: "/narrateur/apercu", at: now });
          if (o) email(d, { to: o.buyerEmail, subject: `Filémoire — ${label}`, lines: [`Livre de ${narratorName(p)}.`, ...(p.print.tracking && to !== "impression" ? [`Numéro de suivi fictif : ${p.print.tracking} (aucun transporteur réel).`] : [])], at: now });
        }),
        flagIncident: (projectId, note) => withProject(projectId, (p, d, now) => {
          p.print.incident = note || "Incident signalé";
          p.print.events.push({ at: now, status: "incident", note: p.print.incident, by: "Équipe Filémoire" });
          notify(d, { to: "acheteur", projectId: p.id, title: "Petit retard sur votre livre", body: "Notre équipe s'en occupe et vous tiendra informé·e.", href: "/acheteur/suivi", at: now });
        }),
        resolveIncident: (projectId) => withProject(projectId, (p, _d, now) => {
          p.print.events.push({ at: now, status: p.book.status, note: `Incident résolu (${p.print.incident}) — relance`, by: "Équipe Filémoire" });
          p.print.incident = undefined;
        }),
        advanceExternal: (id) => mutate((d) => {
          const e = d.externalProjects.find((x) => x.id === id);
          if (!e) return;
          const next: Partial<Record<BookStatus, BookStatus>> = { approuve: "preparation", preparation: "impression", impression: "expedie", expedie: "livre" };
          const to = next[e.status];
          if (!to) return;
          e.status = to;
          if (to === "expedie") e.tracking = `SIM-COL-${Math.floor(10000 + Math.random() * 89999)}`;
        }),
        updateLibrary: (id, patch) => mutate((d) => {
          const q = d.library.find((x) => x.id === id);
          if (q) Object.assign(q, patch);
        }),
        addLibraryQuestion: (chapter, text, help) => mutate((d) => {
          d.library.push({ id: uid("lq"), chapter, text: text.trim(), help: help.trim(), status: "a_valider", active: true });
        }),
        setSupportStatus: (id, status) => mutate((d) => {
          const c = d.support.find((x) => x.id === id);
          if (c) c.status = status;
        }),
      };
    },
    {
      name: "filemoire-prototype",
      version: STATE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s) => pick(s),
      migrate: () => seedState("complet") as unknown as Store,
    },
  ),
);

function pick(s: Store | (DemoState & { simFail?: boolean })) {
  const out: Record<string, unknown> = {};
  for (const k of persistKeys) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as DemoState & { simFail?: boolean };
}

function newMemory(p: Project, qid: string, now: number): Memory {
  const q = p.questions.find((x) => x.id === qid)!;
  const ch = p.chapters.find((c) => c.key === q.chapter) ?? p.chapters[0];
  return {
    id: uid("m"),
    questionId: qid,
    chapterId: ch.id,
    text: "",
    status: "brouillon",
    visibility: p.privacy.defaultVisibility,
    inBook: true,
    approvedByNarrator: false,
    createdAt: now,
    updatedAt: now,
    revisions: [],
  };
}

/** Texte de remplacement : il n'imite JAMAIS les paroles du narrateur. */
export function simulatedTranscript(durationSec: number) {
  return `[TRANSCRIPTION SIMULÉE] Aucun service de reconnaissance vocale n'est branché dans ce prototype : ce texte n'est PAS la transcription de votre enregistrement (${Math.round(durationSec)} s).\n\nÉcoutez votre enregistrement et remplacez ce texte par vos propres mots. Tant qu'il n'est pas corrigé et validé, il n'apparaît nulle part dans le livre.`;
}

export const isSimulatedPlaceholder = (t: string) => t.startsWith("[TRANSCRIPTION SIMULÉE]");

// Sélecteurs pratiques
export function useNow() {
  const off = useDemo((s) => s.clockOffsetDays);
  return Date.now() + off * DAY;
}
export function useProject(id?: string) {
  return useDemo((s) => s.projects.find((p) => p.id === id));
}
export function useBuyerOrders(): Order[] {
  return useDemo((s) => s.orders).filter((o) => !o.external);
}
