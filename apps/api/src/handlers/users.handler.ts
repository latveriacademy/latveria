import { Hono } from "hono";
import { getDb } from "../lib/db";
import { user as userTable, session } from "../lib/db/auth-schema";
import {
  practiceAnswers,
  practiceAttempts,
  topics,
  questionReports,
  tryoutSessions,
} from "../lib/db/schema";
import { eq, sql, desc, asc, ilike, or, and, count, inArray } from "drizzle-orm";
import { pagination } from "../lib/admin-query";
import { getUserProgress } from "../services/admin-user-progress";
import { toCsv } from "../lib/csv";
import { invalidateLeaderboardCache } from "../services/leaderboard.service";
import type { AppEnv } from "../types";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";

export const usersHandler = new Hono<AppEnv>();
usersHandler.use("/api/admin/users/*", async (c, next) => {
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const body = await c.req.raw
      .clone()
      .json()
      .catch(() => null);
    const suffix = c.req.path.split("/").at(-1)!;
    const schemas: Record<string, z.ZodType> = {
      flags: z
        .object({ isDemo: z.boolean().optional(), hideFromLeaderboard: z.boolean().optional() })
        .strict(),
      role: z.object({ role: z.enum(["user", "admin"]) }).strict(),
      notes: z.object({ notes: z.string().max(5000) }).strict(),
      deactivate: z.object({ deactivate: z.boolean() }).strict(),
      "bulk-action": z
        .object({
          userIds: z.array(z.string().min(1).max(128)).min(1).max(100),
          action: z.enum([
            "setDemo",
            "setHideFromLeaderboard",
            "activate",
            "deactivate",
            "delete",
            "resetProgress",
          ]),
          isDemo: z.boolean().optional(),
          hide: z.boolean().optional(),
        })
        .strict(),
    };
    if (schemas[suffix] && !schemas[suffix].safeParse(body).success)
      throw new HTTPException(400, { message: "Data perubahan user tidak valid." });
    const target = c.req.path.split("/")[4];
    if (target !== "bulk-action") {
      const [found] = await getDb()
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, target));
      if (!found) throw new HTTPException(404, { message: "User tidak ditemukan." });
    }
    const actor = c.get("user").id;
    if (
      (target === actor &&
        (c.req.method === "DELETE" ||
          (suffix === "deactivate" && body?.deactivate) ||
          (suffix === "role" && body?.role === "user"))) ||
      (suffix === "bulk-action" &&
        body?.userIds.includes(actor) &&
        ["delete", "deactivate"].includes(body.action))
    )
      throw new HTTPException(409, {
        message:
          "Akun admin yang sedang digunakan tidak dapat dinonaktifkan, diturunkan, atau dihapus.",
      });
  }
  await next();
  if (c.res.ok && !["GET", "HEAD"].includes(c.req.method)) invalidateLeaderboardCache();
});

// Global stats overview
usersHandler.get("/api/admin/users/stats/overview", async (c) => {
  const db = getDb();

  // Total users
  const [totalResult] = await db
    .select({ count: count() })
    .from(userTable)
    .where(eq(userTable.role, "user"));
  const totalUsers = Number(totalResult?.count ?? 0);

  // Active today (practiced today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  const [activeTodayResult] = await db
    .select({ count: count(sql`DISTINCT ${practiceAttempts.userId}`) })
    .from(practiceAttempts)
    .where(sql`${practiceAttempts.submittedAt} >= ${todayStr}::timestamp`);
  const activeToday = Number(activeTodayResult?.count ?? 0);

  // New this week
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();
  const [newThisWeekResult] = await db
    .select({ count: count() })
    .from(userTable)
    .where(
      and(eq(userTable.role, "user"), sql`${userTable.createdAt} >= ${weekAgoStr}::timestamp`),
    );
  const newThisWeek = Number(newThisWeekResult?.count ?? 0);

  // Deactivated count
  const [deactivatedResult] = await db
    .select({ count: count() })
    .from(userTable)
    .where(eq(userTable.isDeactivated, true));
  const deactivatedCount = Number(deactivatedResult?.count ?? 0);

  // Demo users count
  const [demoResult] = await db
    .select({ count: count() })
    .from(userTable)
    .where(eq(userTable.isDemo, true));
  const demoCount = Number(demoResult?.count ?? 0);

  // Total practice time (sum of all time spent)
  const [totalTimeResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${practiceAttempts.timeSpentSeconds}), 0)` })
    .from(practiceAttempts);
  const totalPracticeTime = Number(totalTimeResult?.total ?? 0);

  // Total questions answered
  const [totalAnswersResult] = await db.select({ count: count() }).from(practiceAnswers);
  const totalQuestionsAnswered = Number(totalAnswersResult?.count ?? 0);

  // Average accuracy
  const [accuracyResult] = await db
    .select({
      avg: sql<number>`COALESCE(
        ROUND(
          CAST(SUM(CASE WHEN ${practiceAnswers.isCorrect} = 1 THEN 1 ELSE 0 END) AS DECIMAL) /
          NULLIF(COUNT(*), 0) * 100,
          1
        ),
        0
      )`,
    })
    .from(practiceAnswers);
  const avgAccuracy = Number(accuracyResult?.avg ?? 0);

  // User growth (last 30 days)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const growthData = await db
    .select({
      date: sql<string>`DATE(${userTable.createdAt})`,
      count: count(),
    })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "user"),
        sql`${userTable.createdAt} >= ${thirtyDaysAgo.toISOString()}::timestamp`,
      ),
    )
    .groupBy(sql`DATE(${userTable.createdAt})`)
    .orderBy(sql`DATE(${userTable.createdAt})`);

  return c.json({
    totalUsers,
    activeToday,
    newThisWeek,
    deactivatedCount,
    demoCount,
    totalPracticeTime,
    totalQuestionsAnswered,
    avgAccuracy: Math.round(avgAccuracy),
    growthData: growthData.map((g) => ({
      date: g.date,
      count: Number(g.count),
    })),
  });
});

// List users with enhanced filters
usersHandler.get("/api/admin/users", async (c) => {
  const db = getDb();
  const { page, limit } = pagination(c.req.query(), 20);
  const search = c.req.query("search") ?? "";
  const demoFilter = c.req.query("demo") ?? "";
  const sortBy = c.req.query("sort") ?? "created_at";
  const sortOrder = c.req.query("order") ?? "desc";
  const status = c.req.query("status") ?? "";

  const conditions = [eq(userTable.role, "user")];

  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(userTable.name, pattern), ilike(userTable.email, pattern))!);
  }
  if (demoFilter === "true") {
    conditions.push(eq(userTable.isDemo, true));
  } else if (demoFilter === "false") {
    conditions.push(eq(userTable.isDemo, false));
  }
  if (status === "deactivated") {
    conditions.push(eq(userTable.isDeactivated, true));
  } else if (status === "active") {
    conditions.push(eq(userTable.isDeactivated, false));
  }

  const orderColumn =
    sortBy === "name"
      ? userTable.name
      : sortBy === "lastLoginAt"
        ? userTable.lastLoginAt
        : userTable.createdAt;
  const orderDirection = sortOrder === "asc" ? asc : desc;

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
      isDeactivated: userTable.isDeactivated,
      lastLoginAt: userTable.lastLoginAt,
      deactivatedAt: userTable.deactivatedAt,
    })
    .from(userTable)
    .where(and(...conditions))
    .orderBy(orderDirection(orderColumn))
    .limit(limit)
    .offset(offset);

  // Get stats for each user
  const userIds = users.map((u) => u.id);

  // Get stats in batch
  const userStatsRaw = userIds.length
    ? await db
        .select({
          userId: practiceAttempts.userId,
          answered: count(),
          correct: sql<number>`SUM(CASE WHEN ${practiceAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
          timeSpent: sql<number>`COALESCE(SUM(${practiceAttempts.timeSpentSeconds}), 0)`,
          lastActivity: sql<string>`MAX(${practiceAttempts.submittedAt})::text`,
        })
        .from(practiceAttempts)
        .leftJoin(practiceAnswers, eq(practiceAttempts.id, practiceAnswers.attemptId))
        .where(inArray(practiceAttempts.userId, userIds))
        .groupBy(practiceAttempts.userId)
    : [];

  const statsMap = new Map(
    userStatsRaw.map((s) => [
      s.userId,
      {
        answered: Number(s.answered ?? 0),
        correct: Number(s.correct ?? 0),
        timeSpent: Number(s.timeSpent ?? 0),
        lastActivity: s.lastActivity,
      },
    ]),
  );
  const progress = await getUserProgress(userIds);

  const rows = users.map((u) => {
    const stats = statsMap.get(u.id) ?? {
      answered: 0,
      correct: 0,
      timeSpent: 0,
      lastActivity: null,
    };
    const summary = progress.get(u.id)!;
    const answered = summary.answered;
    const correct = summary.correct;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const { totalXP, level } = summary;

    return {
      ...u,
      answered,
      correct,
      accuracy,
      totalXP,
      level,
      timeSpent: summary.timeSpent,
      lastActivity: stats.lastActivity,
    };
  });

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(userTable)
    .where(and(...conditions));
  const total = Number(countResult?.count ?? 0);

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

// Get user detail with enhanced stats
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
      role: userTable.role,
      isDeactivated: userTable.isDeactivated,
      deactivatedAt: userTable.deactivatedAt,
      accountNotes: userTable.accountNotes,
      lastLoginAt: userTable.lastLoginAt,
      failedLoginAttempts: userTable.failedLoginAttempts,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!u) {
    return c.json({ error: "User tidak ditemukan." }, 404);
  }

  // Get all stats
  const stats = await db
    .select({
      answered: count(),
      correct: sql<number>`SUM(CASE WHEN ${practiceAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      timeSpent: sql<number>`COALESCE(SUM(${practiceAttempts.timeSpentSeconds}), 0)`,
      firstAttempt: sql<number>`SUM(CASE WHEN ${practiceAnswers.isFirstAttempt} = true THEN 1 ELSE 0 END)`,
    })
    .from(practiceAnswers)
    .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .where(eq(practiceAttempts.userId, userId));

  const progress = (await getUserProgress([userId])).get(userId)!;
  const { answered, correct } = progress;
  const timeSpent = progress.timeSpent;
  const firstAttemptCount = Number(stats[0]?.firstAttempt ?? 0);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const { totalXP, level, currentXP, nextLevelXP } = progress;
  const avgTimePerQuestion = answered > 0 ? Math.round(timeSpent / answered) : 0;
  const firstAttemptRate = answered > 0 ? Math.round((firstAttemptCount / answered) * 100) : 0;

  const weeklyActivity = progress.weeklyChartData.map((day) => ({
    date: day.fullDay,
    dayName: day.day,
    count: day.questions,
  }));
  const currentStreak = progress.streakDays;
  const longestStreak = progress.longestStreak;

  // Get subtest stats
  const subtestStatsResult = await db
    .select({
      slug: topics.slug,
      name: topics.name,
      answered: count(),
      correct: sql<number>`SUM(CASE WHEN ${practiceAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(practiceAnswers)
    .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .where(eq(practiceAttempts.userId, userId))
    .groupBy(topics.slug, topics.name);

  const subtestStats = subtestStatsResult.map((s) => {
    const answered = Number(s.answered);
    const correct = Number(s.correct);
    return {
      slug: s.slug ?? "",
      name: s.name ?? "",
      answered,
      correct,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  });

  // Sort by accuracy to get weak and favorite areas
  const sortedByAccuracy = [...subtestStats].sort((a, b) => a.accuracy - b.accuracy);
  const weakAreas = sortedByAccuracy.slice(0, 3).filter((s) => s.answered > 0);
  const favoriteTopics = sortedByAccuracy
    .slice(-3)
    .reverse()
    .filter((s) => s.answered > 0);

  // Get improvement rate (compare last 10% vs first 10%)
  const allAttempts = await db
    .select({
      id: practiceAttempts.id,
      correctCount: practiceAttempts.correctCount,
      totalCount: practiceAttempts.totalCount,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId))
    .orderBy(asc(practiceAttempts.submittedAt));

  let improvementRate = 0;
  if (allAttempts.length >= 10) {
    const chunkSize = Math.max(1, Math.floor(allAttempts.length * 0.1));
    const firstChunk = allAttempts.slice(0, chunkSize);
    const lastChunk = allAttempts.slice(-chunkSize);

    const firstCorrect = firstChunk.reduce((sum, a) => sum + Number(a.correctCount ?? 0), 0);
    const firstTotal = firstChunk.reduce((sum, a) => sum + Number(a.totalCount ?? 0), 0);
    const lastCorrect = lastChunk.reduce((sum, a) => sum + Number(a.correctCount ?? 0), 0);
    const lastTotal = lastChunk.reduce((sum, a) => sum + Number(a.totalCount ?? 0), 0);

    const firstAccuracy = firstTotal > 0 ? firstCorrect / firstTotal : 0;
    const lastAccuracy = lastTotal > 0 ? lastCorrect / lastTotal : 0;

    improvementRate = Math.round((lastAccuracy - firstAccuracy) * 100);
  }

  // Get recent activity
  const recentAttempts = await db
    .select({
      id: practiceAttempts.id,
      topicId: practiceAttempts.topicId,
      correctCount: practiceAttempts.correctCount,
      totalCount: practiceAttempts.totalCount,
      timeSpentSeconds: practiceAttempts.timeSpentSeconds,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId))
    .orderBy(desc(practiceAttempts.submittedAt))
    .limit(20);

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

  // Get session count
  const [sessionCountResult] = await db
    .select({ count: count() })
    .from(sql<{ count: number }>`session`)
    .where(sql`user_id = ${userId}`);
  const sessionCount = Number(sessionCountResult?.count ?? 0);

  // Get reported questions count
  const [reportsCountResult] = await db
    .select({ count: count() })
    .from(questionReports)
    .where(eq(questionReports.userId, userId));
  const reportsCount = Number(reportsCountResult?.count ?? 0);

  return c.json({
    ...u,
    answered,
    correct,
    accuracy,
    totalXP,
    level,
    currentXP,
    nextLevelXP,
    timeSpent,
    avgTimePerQuestion,
    currentStreak,
    longestStreak,
    firstAttemptRate,
    improvementRate,
    weeklyActivity,
    subtestStats,
    weakAreas,
    favoriteTopics,
    sessionCount,
    reportsCount,
    recentActivity: recentAttempts.map((a) => {
      const t = topicMap.get(a.topicId);
      return {
        id: a.id,
        topicSlug: t?.slug ?? "",
        topicName: t?.name ?? "",
        correct: Number(a.correctCount ?? 0),
        total: Number(a.totalCount ?? 0),
        timeSpent: Number(a.timeSpentSeconds ?? 0),
        submittedAt: a.submittedAt?.toISOString() ?? "",
      };
    }),
  });
});

// Get user activity timeline
usersHandler.get("/api/admin/users/:id/activity", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const { page, limit } = pagination(c.req.query(), 20);
  const offset = (page - 1) * limit;

  const [userExists] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!userExists) {
    return c.json({ error: "User tidak ditemukan." }, 404);
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId));

  const activities = await db
    .select({
      id: practiceAttempts.id,
      topicId: practiceAttempts.topicId,
      correctCount: practiceAttempts.correctCount,
      totalCount: practiceAttempts.totalCount,
      timeSpentSeconds: practiceAttempts.timeSpentSeconds,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId))
    .orderBy(desc(practiceAttempts.submittedAt))
    .limit(limit)
    .offset(offset);

  // Get topic names
  const topicIds = [...new Set(activities.map((a) => a.topicId).filter(Boolean))];
  let topicsResult: { id: string; name: string; slug: string }[] = [];
  if (topicIds.length > 0) {
    const idList = topicIds.map((id) => `'${id}'`).join(",");
    topicsResult = await db
      .select({ id: topics.id, name: topics.name, slug: topics.slug })
      .from(topics)
      .where(sql`${topics.id} IN (${sql.raw(idList)})`);
  }
  const topicMap = new Map(topicsResult.map((t) => [t.id, t]));

  return c.json({
    rows: activities.map((a) => {
      const t = topicMap.get(a.topicId);
      return {
        id: a.id,
        type: "practice",
        topicSlug: t?.slug ?? "",
        topicName: t?.name ?? "",
        correct: Number(a.correctCount ?? 0),
        total: Number(a.totalCount ?? 0),
        timeSpent: Number(a.timeSpentSeconds ?? 0),
        submittedAt: a.submittedAt?.toISOString() ?? "",
      };
    }),
    pagination: {
      page,
      limit,
      total: Number(totalResult?.count ?? 0),
      pageCount: Math.ceil(Number(totalResult?.count ?? 0) / limit),
    },
  });
});

// Update user flags
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

// Update user role
usersHandler.put("/api/admin/users/:id/role", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.role !== "string" || !["user", "admin"].includes(body.role)) {
    return c.json({ error: "Role tidak valid. Gunakan 'user' atau 'admin'." }, 400);
  }

  await db.update(userTable).set({ role: body.role }).where(eq(userTable.id, userId));

  return c.json({ success: true, role: body.role });
});

// Update user notes
usersHandler.put("/api/admin/users/:id/notes", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.notes !== "string") {
    return c.json({ error: "Notes tidak valid." }, 400);
  }

  await db.update(userTable).set({ accountNotes: body.notes }).where(eq(userTable.id, userId));

  return c.json({ success: true });
});

// Deactivate/activate user
usersHandler.post("/api/admin/users/:id/deactivate", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const deactivate = body?.deactivate !== false;

  if (deactivate) {
    await db.transaction(async (tx) => {
      await tx
        .update(userTable)
        .set({ isDeactivated: true, deactivatedAt: new Date() })
        .where(eq(userTable.id, userId));
      await tx.delete(session).where(eq(session.userId, userId));
    });
  } else {
    await db
      .update(userTable)
      .set({ isDeactivated: false, deactivatedAt: null })
      .where(eq(userTable.id, userId));
  }

  return c.json({ success: true, isDeactivated: deactivate });
});

// Reset user progress
usersHandler.post("/api/admin/users/:id/reset", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");

  const deletedAttempts = await db.transaction(async (tx) => {
    await tx.delete(tryoutSessions).where(eq(tryoutSessions.userId, userId));
    return tx
      .delete(practiceAttempts)
      .where(eq(practiceAttempts.userId, userId))
      .returning({ id: practiceAttempts.id });
  });
  return c.json({ success: true, deletedAttempts: deletedAttempts.length });
});

// Delete user
usersHandler.delete("/api/admin/users/:id", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");

  // Get all attempts first
  const attempts = await db
    .select({ id: practiceAttempts.id })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId));

  const attemptIds = attempts.map((a) => a.id);

  // Delete in order (answers first, then attempts)
  if (attemptIds.length > 0) {
    await db.delete(practiceAnswers).where(inArray(practiceAnswers.attemptId, attemptIds));
  }
  await db.delete(practiceAttempts).where(eq(practiceAttempts.userId, userId));

  // Delete sessions
  await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);

  // Delete account
  await db.execute(sql`DELETE FROM account WHERE user_id = ${userId}`);

  // Delete user
  await db.delete(userTable).where(eq(userTable.id, userId));

  return c.json({ success: true });
});

// Bulk actions
usersHandler.post("/api/admin/users/bulk-action", async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);

  if (!body || !Array.isArray(body.userIds) || body.userIds.length === 0) {
    return c.json({ error: "userIds array diperlukan." }, 400);
  }

  const { userIds, action, ...params } = body;

  switch (action) {
    case "setDemo": {
      const isDemo = params.isDemo === true;
      await db.update(userTable).set({ isDemo }).where(inArray(userTable.id, userIds));
      return c.json({ success: true, affected: userIds.length, isDemo });
    }

    case "setHideFromLeaderboard": {
      const hide = params.hide === true;
      await db
        .update(userTable)
        .set({ hideFromLeaderboard: hide })
        .where(inArray(userTable.id, userIds));
      return c.json({ success: true, affected: userIds.length, hide });
    }

    case "deactivate": {
      await db.transaction(async (tx) => {
        await tx
          .update(userTable)
          .set({ isDeactivated: true, deactivatedAt: new Date() })
          .where(inArray(userTable.id, userIds));
        await tx.delete(session).where(inArray(session.userId, userIds));
      });
      return c.json({ success: true, affected: userIds.length });
    }

    case "activate": {
      await db
        .update(userTable)
        .set({ isDeactivated: false, deactivatedAt: null })
        .where(inArray(userTable.id, userIds));
      return c.json({ success: true, affected: userIds.length });
    }

    case "delete": {
      // Get all attempts for these users
      for (const userId of userIds) {
        const attempts = await db
          .select({ id: practiceAttempts.id })
          .from(practiceAttempts)
          .where(eq(practiceAttempts.userId, userId));
        const attemptIds = attempts.map((a) => a.id);

        if (attemptIds.length > 0) {
          await db.delete(practiceAnswers).where(inArray(practiceAnswers.attemptId, attemptIds));
        }
        await db.delete(practiceAttempts).where(eq(practiceAttempts.userId, userId));
        await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM account WHERE user_id = ${userId}`);
      }
      await db.delete(userTable).where(inArray(userTable.id, userIds));
      return c.json({ success: true, deleted: userIds.length });
    }

    case "resetProgress": {
      await db.transaction(async (tx) => {
        await tx.delete(tryoutSessions).where(inArray(tryoutSessions.userId, userIds));
        await tx.delete(practiceAttempts).where(inArray(practiceAttempts.userId, userIds));
      });
      return c.json({ success: true, affected: userIds.length });
    }

    default:
      return c.json({ error: "Action tidak valid." }, 400);
  }
});

// Export user data
usersHandler.get("/api/admin/users/:id/export", async (c) => {
  const db = getDb();
  const userId = c.req.param("id");
  const format = c.req.query("format") ?? "json";

  const [u] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

  if (!u) {
    return c.json({ error: "User tidak ditemukan." }, 404);
  }

  // Get all stats
  const stats = await db
    .select({
      answered: count(),
      correct: sql<number>`SUM(CASE WHEN ${practiceAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      timeSpent: sql<number>`COALESCE(SUM(${practiceAttempts.timeSpentSeconds}), 0)`,
    })
    .from(practiceAnswers)
    .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .where(eq(practiceAttempts.userId, userId));

  const answered = Number(stats[0]?.answered ?? 0);
  const correct = Number(stats[0]?.correct ?? 0);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  const exportData = {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt?.toISOString(),
      isDemo: u.isDemo,
      hideFromLeaderboard: u.hideFromLeaderboard,
      isDeactivated: u.isDeactivated,
      lastLoginAt: u.lastLoginAt?.toISOString(),
    },
    stats: {
      ...(await getUserProgress([userId])).get(userId),
      answered,
      correct,
      accuracy,
      timeSpent: (await getUserProgress([userId])).get(userId)!.timeSpent,
    },
    exportedAt: new Date().toISOString(),
  };

  if (format === "csv") {
    const csv = toCsv([
      ["Field", "Value"],
      ...Object.entries(exportData.user),
      ...Object.entries(exportData.stats),
    ]);

    return c.body(csv, 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="user-${userId}.csv"`,
    });
  }

  return c.json(exportData);
});
