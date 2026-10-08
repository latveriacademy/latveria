import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, eq, ilike, or, asc } from "drizzle-orm";
import { leaderboardQuerySchema, utbkSubtests } from "@latveria/shared";
import type { AppEnv } from "../types";
import { getDb } from "../lib/db";
import { user } from "../lib/db/auth-schema";
import { questions, topics } from "../lib/db/schema";
import { toCsv } from "../lib/csv";
import { getUserProgress } from "../services/admin-user-progress";
import { getLeaderboard } from "../services/leaderboard.service";

export const exportHandler = new Hono<AppEnv>();
exportHandler.get("/api/admin/export/:type", async (c) => {
  const type = c.req.param("type");
  const format = c.req.query("format") ?? "csv";
  if (!["csv", "json"].includes(format))
    throw new HTTPException(400, { message: "Format tidak valid." });
  let rows: Record<string, unknown>[];
  if (type === "users") {
    const search = c.req.query("search") ?? "";
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const users = await getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        isDeactivated: user.isDeactivated,
      })
      .from(user)
      .where(
        and(
          eq(user.role, "user"),
          search ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
        ),
      )
      .orderBy(asc(user.id));
    const progress = await getUserProgress(users.map((u) => u.id));
    rows = users.map((u) => {
      const s = progress.get(u.id)!;
      return {
        ...u,
        createdAt: u.createdAt.toISOString(),
        totalXP: s.totalXP,
        level: s.level,
        answered: s.answered,
        correct: s.correct,
        accuracy: s.answered ? Math.round((s.correct / s.answered) * 100) : 0,
        timeSpent: s.timeSpent,
      };
    });
  } else if (type === "questions") {
    const subtest = c.req.query("subtes");
    if (subtest && !utbkSubtests.some((s) => s.slug === subtest))
      throw new HTTPException(400, { message: "Subtes tidak valid." });
    const data = await getDb()
      .select({ question: questions, subtest: topics.slug })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(subtest ? eq(topics.slug, subtest) : undefined)
      .orderBy(asc(questions.id));
    rows = data.map(({ question, subtest }) => ({ ...question, subtest }));
  } else if (type === "leaderboard") {
    const parsed = leaderboardQuerySchema.safeParse(c.req.query());
    if (!parsed.success)
      throw new HTTPException(400, { message: "Filter leaderboard tidak valid." });
    rows = (
      await getLeaderboard(c.get("user").id, { ...parsed.data, limit: Number.MAX_SAFE_INTEGER })
    ).entries;
  } else throw new HTTPException(404, { message: "Jenis ekspor tidak ditemukan." });
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  if (format === "json") return c.json(rows);
  const keys = rows.length ? Object.keys(rows[0]) : ["id"];
  return c.body(
    toCsv([
      keys,
      ...rows.map((row) =>
        keys.map((key) => {
          const value = row[key];
          return value !== null && typeof value === "object" ? JSON.stringify(value) : value;
        }),
      ),
    ]),
    200,
    { "Content-Type": "text/csv; charset=utf-8" },
  );
});
