import { describe, expect, it } from "vitest";
import { buildLibrary, selectJourney, THEMES } from "./catalog";
import { projectFromOrder, startJourney } from "./factory";
import {
  applySuggestion,
  canRead,
  composeBook,
  paginate,
  printChecklist,
  progress,
  refreshQuestions,
} from "./rules";
import { seedState } from "./seed";
import type { Order } from "./types";
import { DAY } from "./utils";

const NOW = new Date(2026, 9, 13, 10).getTime();
const madeleine = () => seedState("avance", NOW).projects[0];

describe("bibliothèque et parcours", () => {
  const lib = buildLibrary();
  it("contient 52 questions de base dont les 10 exemples du dossier", () => {
    const core = lib.filter((q) => !q.theme);
    expect(core).toHaveLength(52);
    expect(core.filter((q) => q.official)).toHaveLength(10);
    expect(core.filter((q) => q.short)).toHaveLength(26);
  });
  it.each(THEMES.map((t) => t.code))(
    "parcours %s : 26 et 52 questions sans doublon",
    (t) => {
      for (const len of [26, 52] as const) {
        const j = selectJourney(lib, len, t);
        expect(j).toHaveLength(len);
        expect(new Set(j.map((q) => q.id)).size).toBe(len);
        if (t !== "vie") expect(j.filter((q) => q.theme === t).length).toBe(4);
      }
    },
  );
});

describe("progression", () => {
  it("une question passée n'est jamais comptée comme répondue", () => {
    const p = madeleine();
    const pr = progress(p);
    expect(pr.answered).toBe(4);
    expect(pr.skipped).toBe(1);
    expect(pr.percent).toBe(Math.round((4 / 52) * 100));
  });
  it("la cadence hebdomadaire débloque une question par semaine, et les reports reviennent", () => {
    const p = madeleine();
    const opened = refreshQuestions(p, NOW + 7 * DAY);
    expect(opened).toHaveLength(2); // question de la semaine 9 + question reportée de 3 jours
  });
});

describe("confidentialité", () => {
  const p = madeleine();
  const byId = (id: string) => p.memories.find((m) => m.id === id)!;
  it("l'acheteur ne lit que les souvenirs partagés avec la famille", () => {
    expect(canRead(p, byId("m_0"), { kind: "acheteur" })).toBe(true);
    expect(canRead(p, byId("m_1"), { kind: "acheteur" })).toBe(false);
    expect(canRead(p, byId("m_4"), { kind: "acheteur" })).toBe(false);
  });
  it("l'éditeur lit le partagé mais jamais le masqué ni les brouillons", () => {
    const v = {
      kind: "editeur" as const,
      email: "thomas.martin@demo.filemoire.test",
    };
    expect(canRead(p, byId("m_1"), v)).toBe(true);
    expect(canRead(p, byId("m_4"), v)).toBe(false);
    expect(canRead(p, byId("m_5"), v)).toBe(false);
  });
  it("un éditeur révoqué perd l'accès immédiatement", () => {
    const q = madeleine();
    q.editors[0].status = "revoquee";
    expect(
      canRead(q, q.memories[1], {
        kind: "editeur",
        email: "thomas.martin@demo.filemoire.test",
      }),
    ).toBe(false);
  });
  it("les Opérations ne lisent rien sans autorisation temporaire", () => {
    const q = madeleine();
    expect(canRead(q, q.memories[0], { kind: "ops", now: NOW })).toBe(false);
    q.privacy.supportAccessUntil = NOW + DAY;
    expect(canRead(q, q.memories[0], { kind: "ops", now: NOW })).toBe(true);
    expect(canRead(q, q.memories[0], { kind: "ops", now: NOW + 2 * DAY })).toBe(
      false,
    );
  });
  it("le contenu masqué est exclu du livre, même pour le narrateur", () => {
    const book = composeBook(p, { kind: "narrateur" });
    const ids = book.flatMap((c) => c.memories.map((m) => m.memory.id));
    expect(ids).toContain("m_0");
    expect(ids).not.toContain("m_4");
    expect(ids).not.toContain("m_5");
  });
  it("retirer un souvenir du livre retire aussi sa photo du PDF", () => {
    const q = madeleine();
    const photo = q.photos.find((ph) => ph.memoryId)!;
    q.memories.find((m) => m.id === photo.memoryId)!.inBook = false;
    expect(
      composeBook(q, { kind: "narrateur" })
        .flatMap((c) => c.photos)
        .map((ph) => ph.id),
    ).not.toContain(photo.id);
  });
  it("un éditeur arbitraire utilise son adresse plutôt qu’une identité fixe", () => {
    const q = madeleine();
    q.editors[0].email = "alice@example.test";
    expect(
      canRead(q, q.memories[1], {
        kind: "editeur",
        email: "alice@example.test",
      }),
    ).toBe(true);
    expect(
      canRead(q, q.memories[1], {
        kind: "editeur",
        email: "thomas.martin@demo.filemoire.test",
      }),
    ).toBe(false);
  });
  it("les photos suivent la visibilité de leur souvenir", () => {
    const book = composeBook(p, { kind: "acheteur" });
    const photos = book.flatMap((c) => c.photos.map((x) => x.id));
    expect(photos).toEqual(["ph_1"]);
  });
});

describe("livre et impression", () => {
  it("includes approved private audio in personal books without granting paid-package QR access", () => {
    const p = madeleine();
    p.packageCode = "essentiel";
    const audio = p.audios[0];
    audio.qr.enabled = true;
    audio.transcript.status = "validee";
    const memory = p.memories.find((m) => m.id === audio.memoryId)!;
    memory.status = "terminee";
    memory.inBook = true;
    expect(
      composeBook(p, { kind: "narrateur" })
        .flatMap((c) => c.memories)
        .some((m) => m.audio),
    ).toBe(false);
    p.kind = "personal";
    expect(
      composeBook(p, { kind: "narrateur" })
        .flatMap((c) => c.memories)
        .find((m) => m.memory.id === memory.id)?.audio?.id,
    ).toBe(audio.id);
    // Existing encrypted personal payloads predate the view-only kind field.
    delete p.kind;
    p.orderId = null;
    expect(
      composeBook(p, { kind: "narrateur" })
        .flatMap((c) => c.memories)
        .find((m) => m.memory.id === memory.id)?.audio?.id,
    ).toBe(audio.id);
  });
  it("pagination : couverture, titre, dédicace, sommaire, chapitres, fin", () => {
    const p = madeleine();
    const pages = paginate(p, composeBook(p, { kind: "narrateur" }));
    expect(pages[0].kind).toBe("cover");
    expect(pages.map((x) => x.kind)).toContain("dedication");
    expect(pages.at(-1)!.kind).toBe("closing");
    const toc = pages.find((x) => x.kind === "toc");
    expect(
      toc && toc.kind === "toc" && toc.entries.map((e) => e.title),
    ).toEqual(["Origines", "Enfance"]);
  });
  it("une suggestion acceptée modifie le texte et garde l'historique", () => {
    const p = madeleine();
    const s = p.suggestions[0];
    applySuggestion(p, s, NOW);
    const m = p.memories.find((x) => x.id === s.targetId)!;
    expect(m.text).toContain("en 1947");
    expect(m.revisions).toHaveLength(1);
  });
  it("la check-list bloque tant que le livre n'est pas validé et les suggestions traitées", () => {
    const items = printChecklist(madeleine());
    expect(items.find((i) => i.id === "approval")!.state).toBe("todo");
    expect(items.find((i) => i.id === "suggestions")!.state).toBe("todo");
    expect(items.find((i) => i.id === "images")!.state).toBe("warn");
  });
});

describe("création de projet", () => {
  it("invitation programmée à la date choisie, calendrier démarré à l'acceptation", () => {
    const s = seedState("complet", NOW);
    const order: Order = {
      id: "o1",
      ref: "FM-TEST",
      buyerName: "Sophie Martin",
      buyerEmail: "s@demo.test",
      packageCode: "essentiel",
      theme: "recettes",
      length: 26,
      recipient: {
        firstName: "Madeleine",
        lastName: "Martin",
        email: "m@demo.test",
        relation: "Ma mère",
      },
      message: "",
      deliveryDate: "2026-12-24",
      giftBox: false,
      extraCopies: 0,
      total: 9900,
      status: "payee",
      payments: [],
      createdAt: NOW,
    };
    const p = projectFromOrder(order, s.library, NOW);
    expect(p.invitation.status).toBe("programmee");
    expect(p.questions).toHaveLength(26);
    startJourney(p, NOW);
    expect(p.questions.filter((q) => q.status === "disponible")).toHaveLength(
      1,
    );
  });
});
