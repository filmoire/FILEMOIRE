import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.env.NEXT_BUILD_DIR || ".next";
const route = path.join(root, "server/app/api/v1/[...path]/route.js");
const trace = JSON.parse(await readFile(`${route}.nft.json`, "utf8"));
const backendPackages = trace.files.filter((file) =>
  /node_modules\/(pg|@aws-sdk|stripe|nodemailer)\//.test(file),
);
if (backendPackages.length)
  throw new Error(
    "Frontend artifact unexpectedly includes backend dependencies",
  );
const source = await readFile(route, "utf8");
if (!source.includes("503") || source.includes("Invalid server configuration"))
  throw new Error("Frontend API isolation check failed");
const manifest = JSON.parse(
  await readFile(path.join(root, "routes-manifest.json"), "utf8"),
);
const rewrite = manifest.rewrites.beforeFiles.find(
  (r) => r.source === "/api/v1/:path*",
);
if (
  rewrite?.destination !==
  `${new URL(process.env.BACKEND_ORIGIN).origin}/api/v1/:path*`
)
  throw new Error("Frontend backend rewrite is missing or incorrect");
console.log(
  "Frontend verified: API rewrite configured; no database, storage, email or payment backend dependencies in API artifact.",
);
