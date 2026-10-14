// Petit serveur statique pour tester dist/filemoire-prototype.html (Playwright).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.argv[2] ?? 3200);
createServer(async (req, res) => {
  const name = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "") || "filemoire-prototype.html";
  if (name.includes("..")) return res.writeHead(400).end();
  try {
    const body = await readFile(path.join(dist, name));
    res.writeHead(200, { "content-type": name.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("introuvable");
  }
}).listen(port, () => console.log(`dist servi sur http://localhost:${port}`));
