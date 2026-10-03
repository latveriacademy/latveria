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

export { invalidateCatalogCache } from "./services/topic.service";

export const app = new Hono<AppEnv>();

// Public endpoints
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const schema =
    c.req.path === "/api/auth/sign-up/email"
      ? signupSchema
      : c.req.path === "/api/auth/sign-in/email"
      ? credentialsSchema
      : null;
  if (c.req.method === "POST" && schema) {
    const parsed = schema.safeParse(await c.req.raw.clone().json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Data akun tidak valid." });
  }
  return getAuth().handler(c.req.raw);
});

// Authentication and Origin verification middleware
app.use("/api/*", async (c, next) => {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "Silakan masuk terlebih dahulu." });
  c.set("user", { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role });
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
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Akses khusus admin." });
  await next();
});

app.use("/api/learner/*", async (c, next) => {
  if (c.get("user").role === "admin") throw new HTTPException(403, { message: "Gunakan panel admin." });
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

app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  console.error("API request failed:", error);
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
