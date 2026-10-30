import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { credentialsSchema, signupSchema } from "@latveria/shared";
import type { AppEnv } from "./types";
import { discordAuthEnabled, getAuth, registrationEnabled } from "./lib/auth";
import { allowedOrigins } from "./lib/origins";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./lib/db";
import { user as accounts } from "./lib/db/auth-schema";
import { topicHandler } from "./handlers/topic.handler";
import { packageHandler } from "./handlers/package.handler";
import { practiceHandler } from "./handlers/practice.handler";
import { leaderboardHandler } from "./handlers/leaderboard.handler";
import { tryoutHandler } from "./handlers/tryout.handler";
import { questionHandler } from "./handlers/question.handler";
import { systemHandler } from "./handlers/system.handler";
import { vocabularyHandler } from "./handlers/vocabulary.handler";
import { usersHandler } from "./handlers/users.handler";
import { analyticsHandler } from "./handlers/analytics.handler";
import { auditHandler } from "./handlers/audit.handler";
import { adminAudit } from "./handlers/admin-audit.middleware";
import { exportHandler } from "./handlers/export.handler";
import { irtHandler } from "./handlers/irt.handler";
import { learnerAvatarHandler, publicAvatarHandler } from "./handlers/avatar.handler";
import { warriorHandler } from "./handlers/warrior.handler";
import { latexHandler } from "./handlers/latex.handler";
import { questionIntelligenceHandler } from "./handlers/question-intelligence.handler";
import { passageHandler } from "./handlers/passage.handler";
import { libraryHandler } from "./handlers/library.handler";
import { friendshipHandler } from "./handlers/friendship.handler";
import { httpLogger, logger } from "./lib/logger";

export { invalidateCatalogCache } from "./services/topic.service";

export const app = new Hono<AppEnv>();

app.use("*", httpLogger());

// Public endpoints
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/auth/registration", (c) =>
  c.json({
    enabled: registrationEnabled(),
    discord: discordAuthEnabled(),
    discordInviteUrl: process.env.DISCORD_INVITE_URL || "",
  }),
);
app.route("/", publicAvatarHandler);
app.route("/", latexHandler);

function getAuthRedirectBase(c: { req: { header: (name: string) => string | undefined } }): string {
  const host = c.req.header("host");
  if (host) {
    for (const origin of allowedOrigins()) {
      try {
        if (new URL(origin).host === host) return origin;
      } catch {}
    }
  }
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

// CORS headers for Better Auth
function setCorsHeaders(c: { header: (name: string, value: string) => void }, origin: string) {
  if (!allowedOrigins().includes(origin)) return;
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

app.on(["POST", "GET", "OPTIONS"], "/api/auth/*", async (c) => {
  const origin = c.req.header("origin") ?? "";
  if (c.req.method === "OPTIONS") {
    setCorsHeaders(c, origin);
    return c.body(null, 204);
  }
  const schema =
    c.req.path === "/api/auth/sign-up/email"
      ? signupSchema
      : c.req.path === "/api/auth/sign-in/email"
        ? credentialsSchema
        : null;
  if (c.req.method === "POST" && schema) {
    const parsed = schema.safeParse(
      await c.req.raw
        .clone()
        .json()
        .catch(() => null),
    );
    if (!parsed.success) {
      // Return 400 with CORS headers instead of throwing
      setCorsHeaders(c, origin);
      return c.json({ error: "Data akun tidak valid." }, 400);
    }
  }
  const response = await getAuth().handler(c.req.raw);
  if (c.req.path.startsWith("/api/auth/callback/") && response.status >= 400) {
    const cloned = response.clone();
    const data = (await cloned.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    const errorCode = data?.code || (response.status === 403 ? "not_in_guild" : "oauth_error");
    logger.warn({
      event: "auth.oauth_callback_failed",
      path: c.req.path,
      errorCode,
      errorMessage: data?.message,
      ip: c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
    });
    const baseUrl = getAuthRedirectBase(c);
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", errorCode);
    return c.redirect(loginUrl.toString(), 302);
  }
  if (c.req.path === "/api/auth/sign-in/email" && response.status === 401) {
    const body = await c.req.raw
      .clone()
      .json()
      .catch(() => null);
    if (typeof body?.email === "string") {
      await getDb()
        .update(accounts)
        .set({ failedLoginAttempts: sql`${accounts.failedLoginAttempts} + 1` })
        .where(eq(accounts.email, body.email.toLowerCase()));
    }
  }
  setCorsHeaders(c, origin);
  return c.newResponse(response.body, response);
});

// Authentication and Origin verification middleware
app.use("/api/*", async (c, next) => {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "Silakan masuk terlebih dahulu." });
  const rawUser = session.user as typeof session.user & {
    role: "user" | "admin";
    isDeactivated?: boolean;
  };
  if (rawUser.isDeactivated) throw new HTTPException(403, { message: "Akun dinonaktifkan." });
  c.set("user", {
    id: rawUser.id,
    email: rawUser.email,
    name: rawUser.name,
    role: rawUser.role,
    image: rawUser.image,
  });
  if (!["GET", "HEAD"].includes(c.req.method)) {
    if (!allowedOrigins().includes(c.req.header("origin") ?? "")) {
      throw new HTTPException(403, { message: "Origin tidak diizinkan." });
    }
  }
  await next();
});

app.get("/api/me", (c) => c.json(c.get("user")));

// Role guards
app.use("/api/admin/*", async (c, next) => {
  if (c.get("user").role !== "admin")
    throw new HTTPException(403, { message: "Akses khusus admin." });
  await next();
});
app.use("/api/admin/*", adminAudit);

app.use("/api/learner/*", async (c, next) => {
  if (c.get("user").role === "admin")
    throw new HTTPException(403, { message: "Gunakan panel admin." });
  await next();
});

// Domain route handlers
app.route("/", topicHandler);
app.route("/", packageHandler);
app.route("/", practiceHandler);
app.route("/", leaderboardHandler);
app.route("/", tryoutHandler);
app.route("/", questionHandler);
app.route("/", systemHandler);
app.route("/", vocabularyHandler);
app.route("/", learnerAvatarHandler);
app.route("/", usersHandler);
app.route("/", analyticsHandler);
app.route("/", auditHandler);
app.route("/", exportHandler);
app.route("/", irtHandler);
app.route("/", warriorHandler);
app.route("/", questionIntelligenceHandler);
app.route("/", passageHandler);
app.route("/", libraryHandler);
app.route("/", friendshipHandler);

app.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  logger.error({ err: error, path: c.req.path, method: c.req.method }, "API request failed");
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
