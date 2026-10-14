import { defineConfig, devices } from "@playwright/test";
const database = process.env.TEST_DATABASE_URL;
if (!database)
  throw new Error("TEST_DATABASE_URL is required for live workspace tests.");
const key = Buffer.alloc(32, 7).toString("base64");
process.env.DATA_ENCRYPTION_KEY = key;
process.env.APP_ORIGIN = "http://localhost:3300";
export default defineConfig({
  testDir: "./tests/production",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3300",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "live-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "live-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev -p 3300",
    url: "http://localhost:3300/acces",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      APP_MODE: "live",
      PERSONAL_DRAFTS_ENABLED: "true",
      NEXT_PUBLIC_APP_MODE: "live",
      NEXT_BUILD_DIR: ".next-live-test",
      APP_ORIGIN: "http://localhost:3300",
      DATABASE_URL: database,
      DATA_ENCRYPTION_KEY: key,
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: ".production-test/media",
      CHECKOUT_ENABLED: "false",
      STRIPE_SECRET_KEY: "sk_test_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_local_fixture_only",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
