import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { composeBook } from "@/lib/rules";
import type { Project } from "@/lib/types";
import { config } from "./config";
import { pool, type DB } from "./db";
import { getObject } from "./storage";
import { assert } from "./security";
const mm = (n: number) => (n * 72) / 25.4;
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        let chunk = "";
        for (const c of word) {
          if (font.widthOfTextAtSize(chunk + c, size) > width && chunk) {
            lines.push(chunk);
            chunk = "";
          }
          chunk += c;
        }
        line = chunk;
      } else if (
        font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) > width
      ) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}
/** Review PDF. Manufacturing remains disabled until a supplier accepts its specification and a physical proof. */
export async function renderProof(p: Project, db: DB = pool()) {
  assert(
    p.memories.reduce((n, m) => n + m.text.length, 0) <= 500000,
    422,
    "Ce récit nécessite une mise en page accompagnée. Contactez le support.",
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = await readFile(
    path.join(
      process.cwd(),
      "node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff",
    ),
  );
  const font = await doc.embedFont(fontBytes, { subset: true });
  const W = mm(148),
    H = mm(210),
    M = mm(18),
    TW = W - 2 * M;
  let page = doc.addPage([W, H]);
  let y = H - M;
  const color = rgb(52 / 255, 32 / 255, 45 / 255);
  const addPage = () => {
    assert(
      doc.getPageCount() < 400,
      422,
      "Cette épreuve dépasse 400 pages. Contactez le support pour la mise en page.",
    );
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const text = (value: string, size = 11, leading = 15) => {
    const supported = new Set(font.getCharacterSet());
    if (
      [...value].some(
        (c) =>
          !["\n", "\r", "\t"].includes(c) && !supported.has(c.codePointAt(0)!),
      )
    )
      assert(
        false,
        422,
        "Certains caractères ne sont pas pris en charge par la police d’impression. Contactez le support avant validation.",
      );
    for (const line of wrapText(value, font, size, TW)) {
      if (y - leading < M) addPage();
      page.drawText(line, { x: M, y: y - size, size, font, color });
      y -= leading;
    }
    y -= 8;
  };
  const coverColors = {
    prune: rgb(0.94, 0.89, 0.93),
    creme: rgb(0.98, 0.96, 0.9),
    terre: rgb(0.96, 0.88, 0.83),
  };
  page.drawRectangle({
    x: 0,
    y: 0,
    width: W,
    height: H,
    color: coverColors[p.book.cover.template],
  });
  text(p.book.cover.title, 28, 34);
  text(p.book.cover.subtitle, 15, 21);
  text(`${p.narrator.firstName} ${p.narrator.lastName}`, 14, 20);
  text("Filémoire", 12, 18);
  if (p.book.dedication) {
    addPage();
    text(p.book.dedication, 13, 19);
  }
  const toc = doc.addPage([W, H]);
  const entries: { title: string; page: number }[] = [];
  for (const chapter of composeBook(p, { kind: "narrateur" })) {
    addPage();
    entries.push({ title: chapter.chapter.title, page: doc.getPageCount() });
    text(chapter.chapter.title, 24, 30);
    for (const memory of chapter.memories) {
      text(memory.question, 12, 17);
      for (const para of memory.paras) text(para);
      for (const photo of chapter.photos.filter(
        (x) => x.memoryId === memory.memory.id,
      ))
        await drawPhoto(photo.id, photo.caption);
      if (memory.audio?.qr.token) {
        if (y - mm(30) < M) addPage();
        const bytes = await QRCode.toBuffer(
          `${config().APP_ORIGIN}/ecoute#token=${memory.audio.qr.token}`,
          { width: 360, margin: 4, errorCorrectionLevel: "M" },
        );
        const img = await doc.embedPng(bytes);
        page.drawImage(img, {
          x: M,
          y: y - mm(25),
          width: mm(25),
          height: mm(25),
        });
        y -= mm(29);
        text("Écouter ce souvenir avec le code famille.", 10, 14);
      }
    }
    for (const photo of chapter.photos.filter((x) => !x.memoryId))
      await drawPhoto(photo.id, photo.caption);
  }
  async function drawPhoto(mediaId: string, caption: string) {
    const { rows } = await db.query(
      "SELECT object_key FROM media WHERE id=$1 AND project_id=$2",
      [mediaId, p.id],
    );
    if (!rows[0]) throw new Error("Photo source missing");
    const img = await doc.embedJpg(await getObject(rows[0].object_key));
    const scale = Math.min(TW / img.width, mm(100) / img.height);
    const h = img.height * scale,
      w = img.width * scale;
    if (y - h - mm(20) < M) addPage();
    page.drawImage(img, { x: (W - w) / 2, y: y - h, width: w, height: h });
    y -= h + 8;
    text(caption, 10, 14);
  }
  let ty = H - M;
  toc.drawText("Sommaire", { x: M, y: ty - 24, size: 24, font, color });
  ty -= 42;
  for (const entry of entries) {
    for (const line of wrapText(
      `${entry.title}   ${entry.page}`,
      font,
      12,
      TW,
    )) {
      if (ty < M + 15)
        throw new Error("Table of contents exceeds supported layout");
      toc.drawText(line, { x: M, y: ty, size: 12, font, color });
      ty -= 18;
    }
  }
  while (doc.getPageCount() % 4) doc.addPage([W, H]);
  doc.getPages().forEach((page, i) => {
    if (i)
      page.drawText(String(i + 1), {
        x: W / 2,
        y: mm(9),
        size: 9,
        font,
        color,
      });
  });
  doc.setTitle(p.book.cover.title);
  doc.setAuthor(`${p.narrator.firstName} ${p.narrator.lastName}`);
  doc.setProducer("Filémoire");
  return Buffer.from(await doc.save());
}
