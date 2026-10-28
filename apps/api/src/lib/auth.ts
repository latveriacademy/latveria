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

export function discordAuthEnabled() {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export async function verifyDiscordGuildMembership(accessToken: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return true; // Bila tidak diset, tidak ada restriksi server
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const guilds = (await res.json()) as Array<{ id: string }>;
    return Array.isArray(guilds) && guilds.some((g) => g.id === guildId);
  } catch {
    return false;
  }
}

function createAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32 ||
    !process.env.BETTER_AUTH_URL
  ) {
    throw new Error("BETTER_AUTH_SECRET (minimal 32 karakter) dan BETTER_AUTH_URL wajib diisi.");
  }

  const socialProviders = discordAuthEnabled()
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID!,
          clientSecret: process.env.DISCORD_CLIENT_SECRET!,
          scope: ["identify", "email", "guilds"],
          getUserInfo: async (token: { accessToken?: string }) => {
            const accessToken = token.accessToken;
            if (!accessToken) return null;

            const res = await fetch("https://discord.com/api/users/@me", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return null;
            const profile = (await res.json()) as {
              id: string;
              username: string;
              discriminator: string;
              global_name: string | null;
              avatar: string | null;
              email?: string;
              verified?: boolean;
              image_url: string;
              [key: string]: unknown;
            };

            const isMember = await verifyDiscordGuildMembership(accessToken);
            if (!isMember) {
              console.warn(
                JSON.stringify({
                  level: "warn",
                  event: "auth.discord_not_in_guild",
                  message: "Percobaan login Discord ditolak: bukan anggota server Discord",
                  discordId: profile.id,
                  discordUsername: profile.username,
                  discordEmail: profile.email || null,
                  timestamp: new Date().toISOString(),
                }),
              );
              throw new APIError("FORBIDDEN", {
                message: "Bukan anggota server Discord yang diwajibkan.",
                code: "not_in_guild",
              });
            }

            const imageUrl = profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}`
              : `https://cdn.discordapp.com/embed/avatars/${
                  profile.discriminator === "0"
                    ? Number(BigInt(profile.id) >> BigInt(22)) % 6
                    : parseInt(profile.discriminator, 10) % 5
                }.png`;

            profile.image_url = imageUrl;

            return {
              user: {
                name: profile.global_name || profile.username,
                email: profile.email || "",
                emailVerified: Boolean(profile.verified),
                image: imageUrl,
              },
              data: profile as never,
            };
          },
        },
      }
    : undefined;

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: allowedOrigins(),
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true, disableSignUp: !registrationEnabled() },
    socialProviders,
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["discord"],
        allowDifferentEmails: false,
      },
    },
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
