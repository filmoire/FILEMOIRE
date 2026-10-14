"use client";

import { ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PhotoImg, QrImage } from "@/components/media";
import { absoluteUrl } from "@/lib/nav";
import { isLive } from "@/lib/mode";
import { composeBook, isLowRes, paginate, type Page, type PageBlock, type Viewer } from "@/lib/rules";
import type { Project } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { BookCoverArt } from "./cover";

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export interface BookViewerProps {
  project: Project;
  viewer: Viewer;
  /** Filigrane affiché tant que le livre n'est pas validé. */
  watermark?: string;
  showWarnings?: boolean;
  /** Clé qui, en changeant, ramène à la couverture. */
  resetKey?: string;
}

export function useBookPages(project: Project, viewer: Viewer) {
  return useMemo(() => {
    const book = composeBook(project, viewer);
    return { book, pages: paginate(project, book) };
  }, [project, viewer]);
}

export function BookViewer({ project, viewer, watermark, showWarnings }: BookViewerProps) {
  const { pages } = useBookPages(project, viewer);
  const wide = useWide();
  const spreads = useMemo(() => {
    if (!wide) return pages.map((_, i) => [i]);
    const out: number[][] = [[0]];
    for (let i = 1; i < pages.length; i += 2) out.push(i + 1 < pages.length ? [i, i + 1] : [i]);
    return out;
  }, [pages, wide]);
  const [s, setS] = useState(0);
  const cur = Math.min(s, spreads.length - 1);
  const go = (d: number) => setS(Math.max(0, Math.min(spreads.length - 1, cur + d)));
  const jump = (pageIdx: number) => setS(Math.max(0, spreads.findIndex((sp) => sp.includes(pageIdx))));
  const tocTargets = pages
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.kind === "cover" || p.kind === "toc" || p.kind === "chapter" || p.kind === "closing");
  const label = (p: Page) => (p.kind === "cover" ? "Couverture" : p.kind === "toc" ? "Sommaire" : p.kind === "chapter" ? `Chapitre ${p.index} — ${p.title}` : p.kind === "closing" ? "Dernière page" : "");
  const first = spreads[cur][0];
  const last = spreads[cur].at(-1)!;

  return (
    <div
      className="no-print"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={cur === 0} aria-label="Page précédente">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => go(1)} disabled={cur === spreads.length - 1} aria-label="Page suivante">
            <ChevronRight />
          </Button>
          <span className="text-sm text-ink-muted" aria-live="polite">
            {first === 0 ? "Couverture" : `Page${first !== last ? "s" : ""} ${pageNo(pages[first])}${first !== last ? `–${pageNo(pages[last])}` : ""}`} · {pages.length - 1} pages
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Aller à</span>
          <select className="h-10 rounded-md border border-line bg-white px-2 text-sm" value={tocTargets.find((t) => spreads[cur].includes(t.i))?.i ?? ""} onChange={(e) => jump(Number(e.target.value))}>
            <option value="" disabled>
              …
            </option>
            {tocTargets.map(({ p, i }) => (
              <option key={i} value={i}>
                {label(p)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={cn("mx-auto grid gap-0", spreads[cur].length === 2 ? "max-w-5xl grid-cols-2" : "max-w-md")} tabIndex={0} aria-roledescription="livre" aria-label="Aperçu du livre, utilisez les flèches pour tourner les pages">
        {spreads[cur].map((i, k) => (
          <BookPage key={i} page={pages[i]} project={project} side={spreads[cur].length === 2 ? (k === 0 ? "left" : "right") : "single"} watermark={watermark} showWarnings={showWarnings} onToc={jump} pages={pages} />
        ))}
      </div>
    </div>
  );
}

const pageNo = (p: Page) => ("n" in p ? p.n : 0);

export function BookPage({
  page,
  project,
  side = "single",
  watermark,
  showWarnings,
  onToc,
  pages,
  print,
}: {
  page: Page;
  project: Project;
  side?: "left" | "right" | "single";
  watermark?: string;
  showWarnings?: boolean;
  onToc?: (pageIndex: number) => void;
  pages?: Page[];
  print?: boolean;
}) {
  const author = `${project.narrator.firstName} ${project.narrator.lastName}`;
  if (page.kind === "cover")
    return <BookCoverArt template={project.book.cover.template} title={project.book.cover.title} subtitle={project.book.cover.subtitle} author={author} size="lg" className={cn("w-full", print && "print-page !rounded-none !shadow-none")} />;
  return (
    <div
      className={cn(
        "paper relative aspect-[148/210] w-full overflow-hidden border border-line/80 [container-type:inline-size]",
        side === "left" && "rounded-l-md border-r-0 shadow-[inset_-18px_0_24px_-20px_rgba(52,32,45,.25)]",
        side === "right" && "rounded-r-md shadow-[inset_18px_0_24px_-20px_rgba(52,32,45,.25)]",
        side === "single" && "rounded-md shadow-book",
        print && "print-page !rounded-none !shadow-none",
      )}
    >
      {watermark && page.kind === "content" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[11cqi] font-semibold uppercase tracking-widest text-prune/[0.05] [transform:rotate(-30deg)]">
          {watermark}
        </span>
      )}
      <div className="flex h-full flex-col px-[11cqi] py-[10cqi] font-serif text-ink">
        {page.kind === "title" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[8cqi] font-semibold leading-tight text-prune">{project.book.cover.title || "Sans titre"}</p>
            {project.book.cover.subtitle && <p className="mt-[2cqi] text-[4cqi] italic text-terre-700">{project.book.cover.subtitle}</p>}
            <div className="my-[6cqi] h-px w-[16cqi] bg-or" />
            <p className="text-[3.6cqi]">Les souvenirs de {author}</p>
            <p className="mt-auto font-sans text-[2.4cqi] uppercase tracking-[0.25em] text-ink-muted">Recueillis avec Filémoire</p>
          </div>
        )}
        {page.kind === "dedication" && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-[80%] text-[4.6cqi] italic text-prune">{project.book.dedication}</p>
          </div>
        )}
        {page.kind === "toc" && (
          <div>
            <p className="text-[6.5cqi] font-semibold text-prune">Sommaire</p>
            <div className="mb-[5cqi] mt-[2cqi] h-px w-[14cqi] bg-or" />
            <ol className="space-y-[2.2cqi] text-[3.6cqi]">
              {page.entries.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  {onToc && pages ? (
                    <button className="text-left hover:text-terre hover:underline" onClick={() => onToc(pages.findIndex((p) => "n" in p && p.n === e.page))}>
                      {e.title}
                    </button>
                  ) : (
                    <span>{e.title}</span>
                  )}
                  <span aria-hidden className="flex-1 border-b border-dotted border-ink-soft/60" />
                  <span>{e.page}</span>
                </li>
              ))}
              {page.entries.length === 0 && <li className="italic text-ink-muted">Aucun chapitre pour l'instant : les souvenirs terminés apparaîtront ici.</li>}
            </ol>
          </div>
        )}
        {page.kind === "chapter" && (
          <div className="flex h-full flex-col justify-center">
            <p className="font-sans text-[2.6cqi] font-semibold uppercase tracking-[0.3em] text-terre">Chapitre {page.index}</p>
            <p className="mt-[3cqi] text-[9cqi] font-semibold leading-none text-prune">{page.title}</p>
            <div className="mt-[6cqi] h-px w-[20cqi] bg-or" />
          </div>
        )}
        {page.kind === "content" && (
          <>
            <p className="mb-[4cqi] text-center font-sans text-[2.2cqi] uppercase tracking-[0.25em] text-ink-muted">{page.chapter}</p>
            <div className="flex-1 space-y-[2.6cqi] overflow-hidden">
              {page.blocks.map((b, i) => (
                <Block key={i} b={b} project={project} showWarnings={showWarnings} />
              ))}
            </div>
          </>
        )}
        {page.kind === "closing" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[5cqi] italic text-prune">« Une question à la fois, une vie à transmettre. »</p>
            <div className="my-[6cqi] h-px w-[16cqi] bg-or" />
            <p className="max-w-[85%] text-[3.2cqi] text-ink-muted">
              {project.book.approvedAt
                ? `Ce livre a été raconté par ${author}, qui en a validé le contenu le ${fmtDate(project.book.approvedAt)}.`
                : `Ce livre est raconté par ${author}. Son contenu n'est pas encore validé.`}
            </p>
          </div>
        )}
        {"n" in page && page.kind !== "title" && (
          <p className={cn("mt-[3cqi] font-sans text-[2.4cqi] text-ink-muted", side === "left" ? "text-left" : side === "right" ? "text-right" : "text-center")}>{page.n}</p>
        )}
      </div>
    </div>
  );
}

function Block({ b, project, showWarnings }: { b: PageBlock; project: Project; showWarnings?: boolean }): ReactNode {
  if (b.t === "question") return <p className="pt-[1cqi] text-[3.3cqi] italic leading-snug text-terre-700">{b.text}</p>;
  if (b.t === "para") return <p className="text-justify text-[3.45cqi] leading-[1.55] [hyphens:auto]">{b.text}</p>;
  if (b.t === "photo") {
    const portrait = b.photo.height > b.photo.width;
    return (
      <figure className="mx-auto" style={{ width: portrait ? "52%" : "100%" }}>
        <div className="relative">
          <PhotoImg photo={b.photo} className="w-full rounded-[1px]" />
          {showWarnings && isLowRes(b.photo) && (
            <span className="absolute left-1 top-1 rounded bg-warning-bg px-1.5 py-0.5 font-sans text-[2.2cqi] font-semibold text-warning">Résolution faible</span>
          )}
        </div>
        <figcaption className="mt-[1.2cqi] text-center text-[2.7cqi] italic text-ink-muted">
          {b.photo.caption}
          {b.photo.illustration && <span className="not-italic"> · illustration de démonstration</span>}
        </figcaption>
      </figure>
    );
  }
  return (
    <div className="flex items-center gap-[3cqi] rounded border border-or/60 p-[2.4cqi]">
      {b.audio.qr.token && <QrImage value={absoluteUrl(isLive ? `/ecoute#token=${b.audio.qr.token}` : `/ecouter/${b.audio.qr.token}`)} size={64} className="w-[15cqi]" />}
      <div className="font-sans text-[2.5cqi] leading-snug">
        <p className="flex items-center gap-1 font-semibold text-prune">
          <Headphones className="size-[3cqi]" aria-hidden /> Écoutez ce souvenir raconté par {project.narrator.firstName}
        </p>
        <p className="text-ink-muted">Lien privé : l'écoute demande le code famille choisi par la narratrice.</p>
      </div>
    </div>
  );
}

/** Version imprimable (window.print) : toutes les pages, avec mention d'aperçu illustratif. */
export function PrintableBook({ project, viewer }: { project: Project; viewer: Viewer }) {
  const { pages } = useBookPages(project, viewer);
  return (
    <div className="hidden print:block">
      <p className="mb-4 text-center font-sans text-xs">APERÇU ILLUSTRATIF — généré par le navigateur, ce n'est pas un fichier prêt pour l'imprimeur.</p>
      {pages.map((p, i) => (
        <div key={i} className="mx-auto mb-0 w-[148mm]">
          <BookPage page={p} project={project} print watermark="Aperçu" />
        </div>
      ))}
    </div>
  );
}
