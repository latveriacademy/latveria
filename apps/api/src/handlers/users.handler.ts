import { Hono } from "hono";
import { getDb } from "../lib/db";
import { user as userTable } from "../lib/db/auth-schema";
import { practiceAnswers, practiceAttempts, topics } from "../lib/db/schema";
import { eq, sql, desc, asc, like, and } from "drizzle-orm";

export const usersHandler = new Hono();

usersHandler.get("/api/admin/users", async (c) => {
  const db = getDb();
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const search = c.req.query("search") ?? "";
  const demoFilter = c.req.query("demo") ?? "";
  const sortBy = c.req.query("sort") ?? "created_at";
  const sortOrder = c.req.query("order") ?? "desc";

  const conditions = [];
  if (search) {
    conditions.push(like(userTable.name, `%${search}%`));
  }
  if (demoFilter === "true") {
    conditions.push(eq(userTable.isDemo, true));
  } else if (demoFilter === "false") {
    conditions.push(eq(userTable.isDemo, false));
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(userTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = countResult[0]?.count ?? 0;

  // Sorting
  const orderColumn = sortBy === "name" ? userTable.name : userTable.createdAt;
  const orderDirection = sortOrder === "asc" ? asc : desc;

  // Get users with stats
  const offset = (page - 1) * limit;
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      isDemo: userTable.isDemo,
      hideFromLeaderboard: userTable.hideFromLeaderboard,
      createdAt: userTable.createdAt,
      codename: userTable.codename,
    })
    .from(userTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderDirection(orderColumn))
    .limit(limit)
    .offset(offset);

  // Get stats for each user
  const rows = await Promise.all(
    users.map(async (u) => {
      const stats = await db
        .select({
          answered: sql<number>`count(${practiceAnswers.id})`,
          correct: sql<number>`sum(case when ${practiceAnswers.isCorrect} = 1 then 1 else 0 end)`,
        })
        .from(practiceAnswers)
        .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
        .where(eq(practiceAttempts.userId, u.id));

      const answered = Number(stats[0]?.answered ?? 0);
      const correct = Number(stats[0]?.correct ?? 0);
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

      // Calculate XP and level (placeholder)
      const totalXP = correct * 10;
      const level = Math.floor(totalXP / 100) + 1;

      return {
        ...u,
        answered,
        correct,
        accuracy,
        totalXP,
        level,
        streak: 0, // Placeholder
      };
    }),
  );

  return c.json({
    rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    },
  });
});

usersHandler.get("/api/admin/users/:id", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");

  const [u] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      isDemo: userTable.isDemo,
      hideFromLeaderboard: userTable.hideFromLeaderboard,
      createdAt: userTable.createdAt,
      codename: userTable.codename,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!u) {
    return c.json({ error: "User tidak ditemukan." }, 404);
  }

  // Get stats
  const stats = await db
    .select({
      answered: sql<number>`count(${practiceAnswers.id})`,
      correct: sql<number>`sum(case when ${practiceAnswers.isCorrect} = 1 then 1 else 0 end)`,
    })
    .from(practiceAnswers)
    .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .where(eq(practiceAttempts.userId, userId));

  const answered = Number(stats[0]?.answered ?? 0);
  const correct = Number(stats[0]?.correct ?? 0);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  const totalXP = correct * 10;
  const level = Math.floor(totalXP / 100) + 1;
  const currentXP = totalXP % 100;
  const nextLevelXP = 100;

  // Get recent activity
  const recentAttempts = await db
    .select({
      id: practiceAttempts.id,
      topicId: practiceAttempts.topicId,
      correctCount: practiceAttempts.correctCount,
      totalCount: practiceAttempts.totalCount,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId))
    .orderBy(desc(practiceAttempts.submittedAt))
    .limit(10);

  // Get topic names
  const topicIds = [...new Set(recentAttempts.map((a) => a.topicId).filter(Boolean))];
  let topicsResult: { id: string; name: string; slug: string }[] = [];
  if (topicIds.length > 0) {
    const idList = topicIds.map((id) => `'${id}'`).join(",");
    topicsResult = await db
      .select({ id: topics.id, name: topics.name, slug: topics.slug })
      .from(topics)
      .where(sql`${topics.id} IN (${sql.raw(idList)})`);
  }
  const topicMap = new Map(topicsResult.map((t) => [t.id, t]));

  // Get today's practice
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();
  const todayAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(practiceAttempts)
    .where(
      and(eq(practiceAttempts.userId, userId), sql`${practiceAttempts.submittedAt} >= ${todayStartStr}::timestamp`),
    );

  // Get subtest stats
  const subtestStatsResult = await db
    .select({
      slug: topics.slug,
      answered: sql<number>`count(${practiceAnswers.id})`,
      correct: sql<number>`sum(case when ${practiceAnswers.isCorrect} = 1 then 1 else 0 end)`,
    })
    .from(practiceAnswers)
    .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .where(eq(practiceAttempts.userId, userId))
    .groupBy(topics.slug);

  const subtestStats = subtestStatsResult.map((s) => {
    const answered = Number(s.answered);
    const correct = Number(s.correct);
    return {
      slug: s.slug ?? "",
      answered,
      correct,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  });

  return c.json({
    ...u,
    answered,
    correct,
    accuracy,
    totalXP,
    level,
    streak: 0,
    currentXP,
    nextLevelXP,
    practicedToday: Number(todayAttempts[0]?.count ?? 0) > 0,
    subtestStats,
    recentActivity: recentAttempts.map((a) => {
      const t = topicMap.get(a.topicId);
      return {
        id: a.id,
        topicSlug: t?.slug ?? "",
        topicName: t?.name ?? "",
        correct: Number(a.correctCount),
        total: Number(a.totalCount),
        submittedAt: a.submittedAt?.toISOString() ?? "",
      };
    }),
  });
});

usersHandler.put("/api/admin/users/:id/flags", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return c.json({ error: "Body tidak valid." }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.isDemo === "boolean") {
    updates.isDemo = body.isDemo;
  }
  if (typeof body.hideFromLeaderboard === "boolean") {
    updates.hideFromLeaderboard = body.hideFromLeaderboard;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "Tidak ada flag yang diupdate." }, 400);
  }

  await db.update(userTable).set(updates).where(eq(userTable.id, userId));

  return c.json({ success: true });
});
