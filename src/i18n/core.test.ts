import { afterEach, describe, expect, it } from "vitest";
import { localizeData, MISSING, resetTranslationCache, setLangCore, tr } from "./core";

afterEach(() => {
  setLangCore("fr");
  resetTranslationCache();
});

describe("traduction FR → EN", () => {
  it("le français est la langue source (identité)", () => {
    expect(tr("Offrir Filémoire")).toBe("Offrir Filémoire");
  });
  it("textes exacts, espaces conservés", () => {
    setLangCore("en");
    expect(tr("Offrir Filémoire")).toBe("Give Filémoire");
    expect(tr("  Offrir Filémoire ")).toBe("  Give Filémoire ");
  });
  it("textes composés : modèle à trous et valeur capturée traduite", () => {
    setLangCore("en");
    expect(tr("Chapitre 2 — Enfance")).toBe("Chapter 2 — Childhood");
    expect(tr("Guide de démo · 3/19")).toBe("Demo guide · 3/19");
  });
  it("un texte déjà traduit n'est pas retraduit ni signalé", () => {
    setLangCore("en");
    const once = tr("Chapitre 2 — Enfance");
    expect(tr(once)).toBe(once);
    expect(MISSING.has(once)).toBe(false);
  });
  it("les données de démonstration sont créées dans la langue active, sans toucher aux identifiants", () => {
    setLangCore("en");
    const d = localizeData({ id: "ch_1", key: "origines", title: "Origines", lines: ["Une question à la fois, à votre rythme, par écrit ou à voix haute."] });
    expect(d).toEqual({ id: "ch_1", key: "origines", title: "Origins", lines: ["One question at a time, at your own pace, in writing or aloud."] });
  });
});
