import { build } from "esbuild";
await build({
  entryPoints: {
    worker: "scripts/production/worker.ts",
    migrate: "scripts/production/migrate.ts",
    readiness: "scripts/production/readiness.ts",
  },
  outdir: "dist-worker",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  packages: "external",
});
