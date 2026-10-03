import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/auth-schema.ts"],
  out: "./drizzle",
  // Pembuatan SQL bersifat luring; penerapan migrasi wajib memakai URL khusus.
  ...(process.argv.includes("generate")
    ? {}
    : {
        dbCredentials: { url: getDatabaseUrl("DATABASE_MIGRATION_URL") },
      }),
});
