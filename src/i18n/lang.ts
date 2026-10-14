"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { resetTranslationCache, setLangCore, type Lang } from "./core";

/** Langue de l'interface (préférence de ce navigateur, indépendante du scénario de démo). */
export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist(
    (set) => ({
      lang: "fr",
      setLang: (lang) => {
        setLangCore(lang);
        resetTranslationCache();
        set({ lang });
      },
    }),
    {
      name: "filemoire-prototype-lang",
      skipHydration: true,
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
      onRehydrateStorage: () => (s) => {
        if (s) setLangCore(s.lang);
      },
    },
  ),
);
