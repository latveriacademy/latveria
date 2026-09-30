import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDb } from "./db";
import * as schema from "./db/auth-schema";

function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32 || !process.env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_SECRET (minimal 32 karakter) dan BETTER_AUTH_URL wajib diisi.");
  }
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true, disableSignUp: process.env.NODE_ENV !== "development" },
    user: { additionalFields: { role: { type: "string", defaultValue: "user", input: false } } },
  });
}

const cache = globalThis as typeof globalThis & { latveriaAuth?: ReturnType<typeof createAuth> };

export function getAuth() {
  return (cache.latveriaAuth ??= createAuth());
}
