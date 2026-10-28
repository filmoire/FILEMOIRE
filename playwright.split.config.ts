import { defineConfig } from "@playwright/test";
import live from "./playwright.live.config";

if (!live.webServer || Array.isArray(live.webServer))
  throw new Error("Expected the live test server configuration");
const backend = {
  ...live.webServer,
  command: "node node_modules/next/dist/bin/next dev -p 3301",
  url: "http://127.0.0.1:3301/api/v1/health",
  env: {
    ...live.webServer.env,
    FILEMOIRE_SERVICE: "backend",
    NEXT_BUILD_DIR: ".next-split-backend",
    DATABASE_SSL: "false",
    DEPLOYMENT_STAGE: "production",
    NEXT_PUBLIC_DEPLOYMENT_STAGE: "production",
  },
};

export default defineConfig({
  ...live,
  testDir: "./tests",
  testMatch: ["production/*.e2e.ts", "deployment/*.e2e.ts"],
  webServer: [
    backend,
    {
      ...live.webServer,
      env: {
        ...live.webServer.env,
        FILEMOIRE_SERVICE: "frontend",
        DEPLOYMENT_STAGE: "production",
        NEXT_PUBLIC_DEPLOYMENT_STAGE: "production",
        BACKEND_ORIGIN: "http://127.0.0.1:3301",
        NEXT_BUILD_DIR: ".next-split-frontend",
        // Override any developer .env files. The frontend must work without these.
        DATABASE_URL: "",
        MIGRATION_DATABASE_URL: "",
        DATABASE_URL_UNPOOLED: "",
        DATA_ENCRYPTION_KEY: "",
        AWS_ACCESS_KEY_ID: "",
        AWS_SECRET_ACCESS_KEY: "",
        RESEND_API_KEY: "",
        SMTP_URL: "",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      },
    },
  ],
});
