import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getDatabaseUrl, loadLocalEnv } from "../src/lib/env";

loadLocalEnv();
const client = postgres(getDatabaseUrl("DATABASE_MIGRATION_URL"), { max: 1, prepare: false, connect_timeout: 10 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.info("Migrasi database selesai.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migrasi database gagal.");
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
