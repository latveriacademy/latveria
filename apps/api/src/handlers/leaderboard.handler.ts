import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { leaderboardQuerySchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import { getLeaderboard } from "../services/leaderboard.service";

export const leaderboardHandler = new Hono<AppEnv>();

leaderboardHandler.get("/api/leaderboard", async (c) => {
  const parsed = leaderboardQuerySchema.safeParse({
    metric: c.req.query("metric"),
    subtest: c.req.query("subtest"),
    period: c.req.query("period"),
    limit: c.req.query("limit"),
  });
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: `Parameter tidak valid: ${parsed.error.issues[0]?.message}`,
    });
  }

  const result = await getLeaderboard(c.get("user").id, parsed.data);
  return c.json(result);
});

leaderboardHandler.get("/api/learner/leaderboard", (c) => {
  const period = c.req.query("period") ?? "weekly";
  return c.redirect(
    `/api/leaderboard?metric=xp&subtest=all&period=${encodeURIComponent(period === "all-time" ? "all" : period)}`,
  );
});
