import { afterEach, expect, it, vi } from "vitest";
import { leaderboardResponseSchema } from "@latveria/shared";
import { app } from "./app";

const getSession = vi.fn();
vi.mock("./lib/auth", () => ({
  getAuth: () => ({ api: { getSession: (...args: unknown[]) => getSession(...args) } }),
}));
afterEach(() => vi.clearAllMocks());

it("adapts the old learner leaderboard URL to the typed public leaderboard endpoint", async () => {
  getSession.mockResolvedValue({
    user: {
      id: "leaderboard-test-user",
      name: "Test",
      email: "leaderboard@example.test",
      role: "user",
    },
    session: { id: "test-session" },
  });
  const location = await app.request("/api/learner/leaderboard?period=all-time");
  expect(location.status).toBe(302);
  expect(location.headers.get("location")).toContain(
    "/api/leaderboard?metric=xp&subtest=all&period=all",
  );

  const payload = {
    entries: [
      {
        rank: 1,
        id: "LTV-1234",
        userId: "user-1234",
        name: "Peserta",
        metricValue: 180,
        level: 1,
        totalXP: 180,
        attemptsCount: 1,
        answered: 10,
        correct: 10,
        accuracy: 100,
        isCurrentUser: true,
      },
    ],
    me: {
      rank: 1,
      metricValue: 180,
      answered: 10,
      correct: 10,
      accuracy: 100,
      streak: 1,
      needsMore: null,
    },
    meta: {
      metric: "xp",
      subtest: "all",
      period: "weekly",
      periodStart: "Senin WIB",
      periodEnd: "Minggu WIB",
      generatedAt: new Date().toISOString(),
    },
  };
  expect(leaderboardResponseSchema.parse(payload)).toEqual(payload);
});
