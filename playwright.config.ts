import { defineConfig, devices } from "@playwright/test";

// Keep the demo regression server separate from the working local website (3100).
const PORT = Number(process.env.PORT ?? 3400);
const HTML_PORT = PORT + 100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "bureau",
      testIgnore: /mobile\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 900 },
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
    { name: "mobile", testMatch: /mobile\.spec/, use: { ...devices["Pixel 7"] } },
    // Version HTML autonome (dist/filemoire-prototype.html), mêmes scénarios
    {
      name: "html",
      testIgnore: /mobile\.spec|mic\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${HTML_PORT}`,
        viewport: { width: 1366, height: 900 },
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
    { name: "html-mobile", testMatch: /mobile\.spec/, use: { ...devices["Pixel 7"], baseURL: `http://localhost:${HTML_PORT}` } },
  ],
  webServer: [
    { command: `pnpm exec next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 120_000 },
    { command: `node scripts/serve-dist.mjs ${HTML_PORT}`, url: `http://localhost:${HTML_PORT}/filemoire-prototype.html`, reuseExistingServer: true, timeout: 30_000 },
  ],
});
