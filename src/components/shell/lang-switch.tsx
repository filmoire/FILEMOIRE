"use client";

import { useLang } from "@/i18n/lang";
import { cn } from "@/lib/utils";

/** Sélecteur de langue de l'interface (FR / EN). Le libellé reste dans la langue cible. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  return (
    <div role="group" aria-label={lang === "en" ? "Language" : "Langue"} className={cn("inline-flex overflow-hidden rounded-md border border-line bg-white text-sm", className)}>
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          aria-label={l === "fr" ? "Français" : "English"}
          onClick={() => setLang(l)}
          className={cn("min-w-11 px-2.5 py-1.5 font-semibold uppercase transition-colors", lang === l ? "bg-prune text-creme" : "text-ink-muted hover:bg-creme-200")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
