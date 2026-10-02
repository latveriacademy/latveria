import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { z } from "zod";

export function loadLocalEnv() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
}

const databaseUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ["postgres:", "postgresql:"].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
});

export function getDatabaseUrl(name: "DATABASE_URL" | "DATABASE_MIGRATION_URL") {
  const result = databaseUrl.safeParse(process.env[name]);
  if (!result.success) {
    // Pesan sengaja tidak menyertakan nilai masukan yang mengandung kredensial.
    throw new Error(`${name} harus berisi URL PostgreSQL dengan host dan nama database. Periksa .env.local.`);
  }
  return result.data;
}
