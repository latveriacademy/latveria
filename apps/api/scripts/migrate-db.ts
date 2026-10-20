import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import { ensureBucketExists } from "../src/services/storage/storage.service";

const client = postgres(getDatabaseUrl("DATABASE_MIGRATION_URL"), {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.info("Migrasi database selesai.");
  await ensureBucketExists();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migrasi database gagal.");
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
