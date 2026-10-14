import { FAMILY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import type { Project } from "@/lib/types";

export function useEditorViewer() {
  const persona = useDemo((s) => s.persona);
  return { kind: "editeur" as const, email: persona.role === "editeur" ? persona.email ?? FAMILY.editor.email : "" };
}
export const myAccess = (p: Project, email: string) => p.editors.slice().reverse().find((e) => e.email.toLowerCase() === email.toLowerCase());
