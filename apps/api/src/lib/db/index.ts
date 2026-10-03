import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../env";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

function createDatabase() {
  const client = postgres(getDatabaseUrl("DATABASE_URL"), {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return drizzle(client, { schema: { ...schema, ...authSchema } });
}

const cache = globalThis as typeof globalThis & {
  latveriaDatabase?: ReturnType<typeof createDatabase>;
};

export function getDb() {
  // Koneksi dibuat saat diperlukan; build dan halaman awal tidak memerlukan rahasia.
  return (cache.latveriaDatabase ??= createDatabase());
}
