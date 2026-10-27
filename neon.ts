import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres is supplied by the linked project. Login stays in the app.
  buckets: {
    "filemoire-private": { access: "private" },
  },
});
