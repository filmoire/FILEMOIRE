import { defineConfig } from "vitest/config";
import path from "node:path";

// Include all server modules, even when no test imports them. Coverage measures
// the production domain and shared book rules; browser code is assessed by E2E.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/production/**/*.integration.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      include: [
        "src/server/**/*.ts",
        "src/lib/rules.ts",
        "src/lib/factory.ts",
        "src/lib/catalog.ts",
      ],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "json-summary", "json", "html"],
      reportsDirectory: "artifacts/production/audit-2026-10-14/coverage",
    },
  },
});
