"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BOOK_FLOW } from "./rules";
import type { DemoState, Persona, Project } from "./types";

/** Pages visitées pendant la démonstration (pour cocher automatiquement le guide). */
export const useVisited = create<{ paths: string[]; visit: (p: string) => void; clear: () => void }>()(
  persist(
    (set, get) => ({
      paths: [],
      visit: (p) => {
        if (!get().paths.includes(p)) set({ paths: [...get().paths, p] });
      },
      clear: () => set({ paths: [] }),
    }),
    {
      name: "filemoire-prototype-guide",
      storage: createJSONStorage(() => ({
        getItem: (k) => {
          try {
            return localStorage.getItem(k);
          } catch {
            return null;
          }
        },
        setItem: (k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch {
            /* stockage indisponible */
          }
        },
        removeItem: (k) => {
          try {
            localStorage.removeItem(k);
          } catch {
            /* rien */
          }
        },
      })),
    },
  ),
);

export interface GuideStep {
  n: number;
  title: string;
  how: string;
  href: string;
  persona?: Persona | "narrateur";
  done: boolean;
}

/** Projet suivi par le guide : le plus récent (celui créé pendant la démo, sinon celui de Madeleine). */
export function guideProject(s: DemoState): Project | undefined {
  return s.projects.slice().sort((a, b) => b.createdAt - a.createdAt)[0];
}

export function guideSteps(s: DemoState, visited: string[]): GuideStep[] {
  const p = guideProject(s);
  const v = (x: string) => visited.includes(x);
  const st = p ? BOOK_FLOW.indexOf(p.book.status) : -1;
  const own = s.orders.some((o) => !o.external && o.status === "payee");
  return [
    { n: 1, title: "Ouvrir la page d'accueil", how: "Découvrez la promesse et le parcours en 8 étapes.", href: "/", persona: { role: "visiteur" }, done: v("/") },
    { n: 2, title: "Explorer les offres et le livre exemple", how: "Comparez les formules, feuilletez le livre exemple.", href: "/offres", done: v("/offres") && v("/livre-exemple") },
    { n: 3, title: "Offrir Filémoire (paiement simulé)", how: "En tant que Sophie, choisissez une formule et un destinataire, puis simulez le paiement.", href: "/acheteur/offrir", persona: { role: "acheteur" }, done: own },
    { n: 4, title: "Envoyer l'invitation", how: "Sur la confirmation, l'invitation part à la date choisie (ou « Envoyer maintenant »).", href: "/acheteur/cadeaux", persona: { role: "acheteur" }, done: !!p && ["envoyee", "acceptee"].includes(p.invitation.status) },
    { n: 5, title: "Passer au rôle narrateur", how: "Ouvrez l'e-mail d'invitation dans la boîte de démonstration.", href: "/demo/boite-mail", done: s.persona.role === "narrateur" || (!!p && p.invitation.status === "acceptee") },
    { n: 6, title: "Accepter l'invitation", how: "Le lien de l'e-mail ouvre la page d'invitation.", href: p ? `/invitation/${p.invitation.token}` : "/demo/boite-mail", done: !!p && p.invitation.status === "acceptee" },
    { n: 7, title: "Régler la confidentialité", how: "Choisissez qui peut lire vos souvenirs et le rythme des questions.", href: "/narrateur/bienvenue", persona: "narrateur", done: !!p?.onboarded },
    { n: 8, title: "Répondre à une question", how: "Écrivez une réponse et enregistrez-la.", href: "/narrateur", persona: "narrateur", done: !!p?.memories.some((m) => m.status === "terminee") },
    { n: 9, title: "Enregistrer un souvenir vocal", how: "Onglet « À voix haute » : micro ou enregistrement d'exemple.", href: "/narrateur", persona: "narrateur", done: !!p?.audios.length },
    { n: 10, title: "Ajouter une photo de famille", how: "Depuis une question ou la page Photos.", href: "/narrateur/photos", persona: "narrateur", done: !!p?.photos.some((x) => x.blobKey) },
    { n: 11, title: "Voir la progression", how: "Le parcours, question par question.", href: "/narrateur/questions", persona: "narrateur", done: v("/narrateur/questions") },
    { n: 12, title: "Ouvrir l'éditeur de livre", how: "Chapitres, souvenirs, photos et propriétés.", href: "/narrateur/livre", persona: "narrateur", done: v("/narrateur/livre") },
    { n: 13, title: "Inviter un éditeur familial", how: "Invitez Thomas Martin, puis acceptez l'invitation depuis la boîte e-mail.", href: "/narrateur/famille", persona: "narrateur", done: !!p?.editors.some((e) => e.status === "active") },
    { n: 14, title: "Proposer puis accepter une correction", how: "Thomas suggère, la narratrice accepte dans l'éditeur de livre.", href: "/editeur", persona: { role: "editeur" }, done: !!p?.suggestions.some((x) => x.status === "acceptee") },
    { n: 15, title: "Masquer un souvenir privé", how: "Dans l'éditeur de livre : « Masquer du livre ».", href: "/narrateur/livre", persona: "narrateur", done: !!p?.memories.some((m) => !m.inBook) },
    { n: 16, title: "Prévisualiser le livre", how: "Feuilletez l'aperçu, choisissez une couverture.", href: "/narrateur/apercu", persona: "narrateur", done: !!p?.book.previewedAt },
    { n: 17, title: "Valider le livre", how: "Validation explicite + adresse de livraison.", href: "/narrateur/apercu#validation", persona: "narrateur", done: st >= BOOK_FLOW.indexOf("approuve") },
    { n: 18, title: "Commander l'impression (simulée)", how: "Aucun imprimeur réel n'est contacté.", href: "/narrateur/apercu#validation", persona: "narrateur", done: st >= BOOK_FLOW.indexOf("preparation") },
    { n: 19, title: "Suivre la commande", how: "Côté Sophie ou côté Opérations (préflight, impression, expédition).", href: "/acheteur/suivi", persona: { role: "acheteur" }, done: st >= BOOK_FLOW.indexOf("impression") || (st >= BOOK_FLOW.indexOf("preparation") && v("/acheteur/suivi")) },
  ];
}
