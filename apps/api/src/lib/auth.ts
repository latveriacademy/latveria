import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "./db/auth-schema";
import { allowedOrigins } from "./origins";

export function registrationEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ALLOW_SIGN_UP === "true";
}

function createAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32 ||
    !process.env.BETTER_AUTH_URL
  ) {
    throw new Error("BETTER_AUTH_SECRET (minimal 32 karakter) dan BETTER_AUTH_URL wajib diisi.");
  }
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: allowedOrigins(),
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true, disableSignUp: !registrationEnabled() },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [account] = await getDb()
              .select({ inactive: schema.user.isDeactivated })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId));
            if (!account || account.inactive) {
              throw new APIError("FORBIDDEN", { message: "Akun dinonaktifkan." });
            }
            await getDb()
              .update(schema.user)
              .set({ lastLoginAt: new Date(), failedLoginAttempts: 0 })
              .where(eq(schema.user.id, session.userId));
            return { data: session };
          },
        },
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        isDemo: { type: "boolean", defaultValue: false, input: false },
        hideFromLeaderboard: { type: "boolean", defaultValue: false, input: false },
        isDeactivated: { type: "boolean", defaultValue: false, input: false },
        deactivatedAt: { type: "date", defaultValue: null, input: false },
        accountNotes: { type: "string", defaultValue: "", input: false },
        lastLoginAt: { type: "date", defaultValue: null, input: false },
        failedLoginAttempts: { type: "number", defaultValue: 0, input: false },
      },
    },
  });
}

const cache = globalThis as typeof globalThis & { latveriaAuth?: ReturnType<typeof createAuth> };

export function getAuth() {
  return (cache.latveriaAuth ??= createAuth());
}
