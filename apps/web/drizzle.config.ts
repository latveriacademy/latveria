import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/lib/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  // Pembuatan SQL bersifat luring; penerapan migrasi wajib memakai URL khusus.
  ...(process.argv.includes("generate") ? {} : {
    dbCredentials: { url: getDatabaseUrl("DATABASE_MIGRATION_URL") },
  }),
});
