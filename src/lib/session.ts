"use client";

import { FAMILY } from "./seed";
import { useDemo } from "./store";
import type { Persona, Project } from "./types";

export const homeOf = (p: Persona) =>
  ({ visiteur: "/", acheteur: "/acheteur", narrateur: "/narrateur", editeur: "/editeur", ops: "/admin" })[p.role];

export function personaLabel(p: Persona, projects: Project[]) {
  if (p.role === "visiteur") return "Visiteur";
  if (p.role === "acheteur") return `${FAMILY.buyer.name} — acheteuse`;
  if (p.role === "editeur") return `${p.name ?? FAMILY.editor.name} — éditeur familial`;
  if (p.role === "ops") return "Équipe Filémoire — Opérations";
  const pr = projects.find((x) => x.id === p.projectId);
  return pr ? `${pr.narrator.firstName} ${pr.narrator.lastName} — narrateur·rice` : "Narrateur";
}

export const personaKey = (p: Persona) => (p.role === "narrateur" ? `narrateur:${p.projectId}` : p.role === "editeur" && p.email ? `editeur:${encodeURIComponent(p.email)}:${encodeURIComponent(p.name ?? p.email)}` : p.role);

export function personaFromKey(k: string): Persona {
  if (k.startsWith("editeur:")) { const [, email, name] = k.split(":"); return { role: "editeur", email: decodeURIComponent(email), name: decodeURIComponent(name) }; }
  if (k.startsWith("narrateur:")) return { role: "narrateur", projectId: k.split(":")[1] };
  return { role: k as "visiteur" | "acheteur" | "editeur" | "ops" };
}

/** Projet du narrateur actuellement incarné. */
export function useNarratorProject() {
  return useDemo((s) => (s.persona.role === "narrateur" ? s.projects.find((p) => p.id === (s.persona as { projectId: string }).projectId) : undefined));
}

/** Projets visibles par l'éditeur familial de démonstration (invitation acceptée). */
export function useEditorProjects() {
  const projects = useDemo((s) => s.projects);
  const persona = useDemo((s) => s.persona);
  const email = persona.role === "editeur" ? persona.email ?? FAMILY.editor.email : "";
  return projects.filter((p) => p.editors.some((e) => e.email === email && e.status === "active"));
}
