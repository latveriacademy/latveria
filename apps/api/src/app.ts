import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { credentialsSchema, signupSchema } from "@latveria/shared";
import type { AppEnv } from "./types";
import { getAuth } from "./lib/auth";
import { allowedOrigins } from "./lib/origins";
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
import { learnerAvatarHandler, publicAvatarHandler } from "./handlers/avatar.handler";

export { invalidateCatalogCache } from "./services/topic.service";

export const app = new Hono<AppEnv>();

// Public endpoints
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/", publicAvatarHandler);

// CORS headers for Better Auth
function setCorsHeaders(c: { header: (name: string, value: string) => void }, origin: string) {
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
  // Extract body, status, and set-cookie headers from Better Auth response
  const body = await response.text();
  const status = response.status;
  const setCookieHeaders = response.headers.getSetCookie();
  // Return with CORS headers and preserve Set-Cookie
  setCorsHeaders(c, origin);
  for (const cookie of setCookieHeaders) {
    c.header("Set-Cookie", cookie);
  }
  return c.newResponse(body, status as Parameters<typeof c.newResponse>[1]);
});

// Authentication and Origin verification middleware
app.use("/api/*", async (c, next) => {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "Silakan masuk terlebih dahulu." });
  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    image: session.user.image,
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

app.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  console.error("API request failed:", error);
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
