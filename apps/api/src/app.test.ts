import { beforeEach, expect, it, vi } from "vitest";

const { getSession, authHandler } = vi.hoisted(() => ({
  getSession: vi.fn(),
  authHandler: vi.fn(),
}));
vi.mock("./lib/auth", () => ({
  getAuth: () => ({ api: { getSession }, handler: authHandler }),
}));
import { app } from "./app";

beforeEach(() => {
  getSession.mockReset();
  authHandler.mockReset();
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
});
it("health does not need database or credentials", async () => {
  expect((await app.request("/api/health")).status).toBe(200);
});
it("rejects unauthenticated learner and admin access", async () => {
  getSession.mockResolvedValue(null);
  for (const path of [
    "/api/learner/topics",
    "/api/admin/questions",
    "/api/learner/results/00000000-0000-4000-8000-000000000001",
  ])
    expect((await app.request(path)).status).toBe(401);
});
it("enforces role separation in backend, not only frontend routing", async () => {
  getSession.mockResolvedValue({
    user: { id: "u", role: "user", name: "User", email: "u@example.test" },
  });
  expect((await app.request("/api/admin/questions")).status).toBe(403);
  getSession.mockResolvedValue({
    user: { id: "a", role: "admin", name: "Admin", email: "a@example.test" },
  });
  expect((await app.request("/api/learner/topics")).status).toBe(403);
});
it("blocks cross-origin writes and invalid question input", async () => {
  getSession.mockResolvedValue({
    user: { id: "a", role: "admin", name: "Admin", email: "a@example.test" },
  });
  expect(
    (
      await app.request("/api/admin/questions", {
        method: "POST",
        headers: { Origin: "https://other.example" },
        body: "{}",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await app.request("/api/admin/questions", {
        method: "POST",
        headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(400);
});

it("accepts only the configured tunnel for development writes", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DEV_TUNNEL_ORIGIN", "https://latveria.dorrit.dev");
  getSession.mockResolvedValue({
    user: { id: "a", role: "admin", name: "Admin", email: "a@example.test" },
  });
  const write = (origin: string) =>
    app.request("/api/admin/questions", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
  expect((await write("https://latveria.dorrit.dev")).status).toBe(400);
  expect((await write("https://other.dorrit.dev")).status).toBe(403);
  vi.unstubAllEnvs();
});

it("redirects OAuth callback errors to login page with error query", async () => {
  authHandler.mockResolvedValue(
    new Response(
      JSON.stringify({
        code: "not_in_guild",
        message: "Bukan anggota server Discord yang diwajibkan.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ),
  );

  const res = await app.request("/api/auth/callback/discord?code=xyz&state=abc", {
    method: "GET",
    headers: { Host: "localhost:3000" },
  });

  expect(res.status).toBe(302);
  expect(res.headers.get("Location")).toBe("http://localhost:3000/login?error=not_in_guild");
});
