import { Hono } from "hono";
import { and, count, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  affirmationSchema,
  assignQuestionToPackageSchema,
  bankQuerySchema,
  bulkDeleteSchema,
  calculateLatveriaScore,
  createPackageSchema,
  credentialsSchema,
  idSchema,
  leaderboardQuerySchema,
  moveQuestionPackageSchema,
  profileSchema,
  questionImportSchema,
  questionReportSchema,
  questionSchema,
  signupSchema,
  submissionSchema,
  updatePackageSchema,
  utbkSubtests,
  type Affirmation,
  type Bank,
  type HistoryItem,
  type LearnerPackage,
  type PackageDetail,
  type Profile,
  type QuestionDetail,
  type QuestionPackage,
  type QuestionReportItem,
  type Result,
  type Topic,
  type User,
} from "@latveria/shared";
import { ACCURACY_MIN_ANSWERS, getPeriodRange, SUBTEST_TO_SLUG, type Metric, type Period, type Subtest } from "./lib/leaderboard-utils";
import { getAuth } from "./lib/auth";
import { getDb } from "./lib/db";
import { allowedOrigins } from "./lib/origins";
import {
  affirmations,
  practiceAnswers,
  practiceAttempts,
  questionPackages,
  questionReports,
  questions,
  systemConfig,
  topics,
  tryoutPackageQuestions,
  tryoutSessions,
} from "./lib/db/schema";
import { user as accounts } from "./lib/db/auth-schema";
import { learnerSummary, practiceXP } from "@latveria/shared";

export const app = new Hono<{ Variables: { user: User } }>();
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const schema = c.req.path === "/api/auth/sign-up/email" ? signupSchema : c.req.path === "/api/auth/sign-in/email" ? credentialsSchema : null;
  if (c.req.method === "POST" && schema) {
    const parsed = schema.safeParse(await c.req.raw.clone().json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Data akun tidak valid." });
  }
  return getAuth().handler(c.req.raw);
});
app.use("/api/*", async (c, next) => {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "Silakan masuk terlebih dahulu." });
  c.set("user", { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role });
  if (!["GET", "HEAD"].includes(c.req.method)) {
    if (!allowedOrigins().includes(c.req.header("origin") ?? "")) throw new HTTPException(403, { message: "Origin tidak diizinkan." });
  }
  await next();
});
app.get("/api/me", (c) => c.json(c.get("user")));
app.use("/api/admin/*", async (c, next) => {
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Akses khusus admin." });
  await next();
});
app.use("/api/learner/*", async (c, next) => {
  if (c.get("user").role === "admin") throw new HTTPException(403, { message: "Gunakan panel admin." });
  await next();
});

const cachedCatalog: Map<boolean, { data: Topic[]; expiresAt: number }> = new Map();

export function invalidateCatalogCache() {
  cachedCatalog.clear();
}

async function resolveTopic(idOrSlug: string) {
  const isUuid = idSchema.safeParse(idOrSlug).success;
  const [topic] = await getDb().select().from(topics).where(isUuid ? eq(topics.id, idOrSlug) : eq(topics.slug, idOrSlug));
  return topic ?? null;
}

async function catalog(activeOnly = false): Promise<Topic[]> {
  const now = Date.now();
  const cached = cachedCatalog.get(activeOnly);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }
  const [rows, pkgRows] = await Promise.all([
    getDb().select({
      id: topics.id,
      slug: topics.slug,
      name: topics.name,
      description: topics.description,
      category: topics.category,
      section: topics.section,
      order: topics.order,
      questionCount: count(questions.id),
    })
      .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id),
    getDb().select({ topicId: questionPackages.topicId, packageCount: count(questionPackages.id) })
      .from(questionPackages)
      .where(activeOnly ? eq(questionPackages.isActive, true) : undefined)
      .groupBy(questionPackages.topicId),
  ]);
  const pkgMap = new Map(pkgRows.map((p) => [p.topicId, Number(p.packageCount ?? 0)]));
  const utbkMap = new Map<string, (typeof utbkSubtests)[number]>(utbkSubtests.map((s) => [s.slug, s]));

  const result: Topic[] = rows.map((row) => {
    const utbk = utbkMap.get(row.slug);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      short: utbk ? utbk.short : row.slug.slice(0, 4).toUpperCase(),
      section: utbk ? utbk.section : row.section || "mandiri",
      category: row.category || "utbk",
      questionCount: Number(row.questionCount ?? 0),
      packageCount: pkgMap.get(row.id) ?? 0,
    };
  });

  result.sort((a, b) => {
    const idxA = utbkSubtests.findIndex((s) => (s.slug as string) === a.slug);
    const idxB = utbkSubtests.findIndex((s) => (s.slug as string) === b.slug);
    if (idxA >= 0 && idxB >= 0) return idxA - idxB;
    if (idxA >= 0) return -1;
    if (idxB >= 0) return 1;
    return a.name.localeCompare(b.name);
  });

  cachedCatalog.set(activeOnly, { data: result, expiresAt: now + 30_000 });
  return result;
}
app.get("/api/learner/topics", async (c) => {
  const all = c.req.query("all") === "true";
  const cat = await catalog(true);
  if (!all) {
    return c.json(cat.filter((t) => utbkSubtests.some((u) => u.slug === t.slug)));
  }
  return c.json(cat);
});
const profileFields = { name: accounts.name, codename: accounts.codename, targetUniversity: accounts.targetUniversity, bio: accounts.bio, motto: accounts.motto };
app.get("/api/learner/profile", async (c) => {
  const [profile] = await getDb().select(profileFields).from(accounts).where(eq(accounts.id, c.get("user").id));
  if (!profile) throw new HTTPException(404, { message: "Profil tidak ditemukan." });
  return c.json(profile satisfies Profile);
});
app.put("/api/learner/profile", async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0].message });
  const [profile] = await getDb().update(accounts).set(parsed.data).where(eq(accounts.id, c.get("user").id)).returning(profileFields);
  if (!profile) throw new HTTPException(404, { message: "Profil tidak ditemukan." });
  return c.json(profile satisfies Profile);
});
app.get("/api/admin/topics", async (c) => c.json(await catalog(false)));

// --- Admin Question Packages ---
async function getSubtestPackages(c: { req: { param: (key: string) => string }; json: (data: unknown) => Response }) {
  const topic = await resolveTopic(c.req.param("subtestId"));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const rows = await getDb()
    .select({
      id: questionPackages.id,
      topicId: questionPackages.topicId,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      isActive: questionPackages.isActive,
      packageType: questionPackages.packageType,
      category: questionPackages.category,
      duration: questionPackages.duration,
      isFullTryout: questionPackages.isFullTryout,
      targetQuestions: questionPackages.targetQuestions,
      published: questionPackages.published,
      questionCount: count(questions.id),
      createdAt: questionPackages.createdAt,
      updatedAt: questionPackages.updatedAt,
    })
    .from(questionPackages)
    .leftJoin(questions, eq(questions.packageId, questionPackages.id))
    .where(eq(questionPackages.topicId, topic.id))
    .groupBy(questionPackages.id)
    .orderBy(questionPackages.order, questionPackages.createdAt);

  return c.json(rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })) satisfies QuestionPackage[]);
}
app.get("/api/admin/subtests/:subtestId/packages", getSubtestPackages as never);
app.get("/api/admin/topics/:subtestId/packages", getSubtestPackages as never);

async function createSubtestPackage(c: { req: { param: (key: string) => string; json: () => Promise<unknown> }; json: (data: unknown, status?: number) => Response }) {
  const topic = await resolveTopic(c.req.param("subtestId"));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const parsed = createPackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data paket tidak valid." });

  const [existing] = await getDb().select({ id: questionPackages.id }).from(questionPackages)
    .where(and(eq(questionPackages.topicId, topic.id), eq(questionPackages.name, parsed.data.name)));
  if (existing) throw new HTTPException(409, { message: `Paket '${parsed.data.name}' sudah ada pada subtes ini.` });

  const [created] = await getDb().insert(questionPackages).values({
    topicId: topic.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    order: parsed.data.order,
    isActive: parsed.data.isActive,
    packageType: parsed.data.packageType,
    category: parsed.data.category,
    duration: parsed.data.duration,
    isFullTryout: parsed.data.isFullTryout,
    targetQuestions: parsed.data.targetQuestions,
    published: parsed.data.published,
  }).returning();

  return c.json({
    ...created,
    questionCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  } satisfies QuestionPackage, 201);
}
app.post("/api/admin/subtests/:subtestId/packages", createSubtestPackage as never);
app.post("/api/admin/topics/:subtestId/packages", createSubtestPackage as never);

app.get("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const [pkg] = await getDb().select({
    id: questionPackages.id,
    topicId: questionPackages.topicId,
    name: questionPackages.name,
    description: questionPackages.description,
    order: questionPackages.order,
    isActive: questionPackages.isActive,
    packageType: questionPackages.packageType,
    category: questionPackages.category,
    duration: questionPackages.duration,
    isFullTryout: questionPackages.isFullTryout,
    targetQuestions: questionPackages.targetQuestions,
    published: questionPackages.published,
    createdAt: questionPackages.createdAt,
    updatedAt: questionPackages.updatedAt,
    topicName: topics.name,
    topicSlug: topics.slug,
  }).from(questionPackages).innerJoin(topics, eq(questionPackages.topicId, topics.id)).where(eq(questionPackages.id, id.data));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const qRows = await getDb().select({
    id: questions.id,
    prompt: questions.prompt,
    category: questions.category,
    source: questions.source,
    usage: count(practiceAnswers.id),
  }).from(questions)
    .leftJoin(practiceAnswers, eq(practiceAnswers.questionId, questions.id))
    .where(eq(questions.packageId, id.data))
    .groupBy(questions.id)
    .orderBy(questions.id);

  return c.json({
    ...pkg,
    questionCount: qRows.length,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    questions: qRows.map((q) => ({ ...q, usage: Number(q.usage ?? 0) })),
  } satisfies PackageDetail);
});

app.put("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const parsed = updatePackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data paket tidak valid." });

  const [existing] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, id.data));
  if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const [conflict] = await getDb().select({ id: questionPackages.id }).from(questionPackages)
      .where(and(eq(questionPackages.topicId, existing.topicId), eq(questionPackages.name, parsed.data.name)));
    if (conflict) throw new HTTPException(409, { message: `Paket '${parsed.data.name}' sudah ada pada subtes ini.` });
  }

  const [updated] = await getDb().update(questionPackages).set({
    ...parsed.data,
    updatedAt: new Date(),
  }).where(eq(questionPackages.id, id.data)).returning();

  const [qCount] = await getDb().select({ value: count() }).from(questions).where(eq(questions.packageId, id.data));

  return c.json({
    ...updated,
    questionCount: Number(qCount.value ?? 0),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } satisfies QuestionPackage);
});

app.delete("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const [existing] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, id.data));
  if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [qCount] = await getDb().select({ value: count() }).from(questions).where(eq(questions.packageId, id.data));
  if (qCount.value > 0) {
    throw new HTTPException(409, { message: `Paket masih berisi ${qCount.value} soal. Pindahkan atau keluarkan soal sebelum menghapus paket.` });
  }

  await getDb().delete(questionPackages).where(eq(questionPackages.id, id.data));
  return c.json({ success: true });
});

app.post("/api/admin/packages/:packageId/questions", async (c) => {
  const pId = idSchema.safeParse(c.req.param("packageId"));
  if (!pId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const parsed = assignQuestionToPackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data soal tidak valid." });

  const [pkg] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, pId.data));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [q] = await getDb().select().from(questions).where(eq(questions.id, parsed.data.questionId));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });

  if (q.topicId !== pkg.topicId) {
    throw new HTTPException(400, { message: "Soal tidak dapat dimasukkan ke paket dari subtes yang berbeda." });
  }

  await getDb().update(questions).set({ packageId: pkg.id }).where(eq(questions.id, q.id));
  return c.json({ success: true, packageId: pkg.id, questionId: q.id });
});

async function handleMoveQuestionPackage(c: { req: { param: (key: string) => string; json: () => Promise<unknown> }; json: (data: unknown) => Response }) {
  const qId = idSchema.safeParse(c.req.param("questionId"));
  if (!qId.success) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
  const parsed = moveQuestionPackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data paket tujuan tidak valid." });

  const [q] = await getDb().select().from(questions).where(eq(questions.id, qId.data));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });

  if (parsed.data.packageId) {
    const [pkg] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, parsed.data.packageId));
    if (!pkg) throw new HTTPException(404, { message: "Paket tujuan tidak ditemukan." });
    if (pkg.topicId !== q.topicId) {
      throw new HTTPException(400, { message: "Soal tidak dapat dipindahkan ke paket dari subtes yang berbeda." });
    }
    await getDb().update(questions).set({ packageId: pkg.id }).where(eq(questions.id, q.id));
  } else {
    await getDb().update(questions).set({ packageId: null }).where(eq(questions.id, q.id));
  }

  return c.json({ success: true, questionId: q.id, packageId: parsed.data.packageId });
}
app.put("/api/admin/questions/:questionId/package", handleMoveQuestionPackage as never);
app.post("/api/admin/questions/:questionId/package", handleMoveQuestionPackage as never);

app.delete("/api/admin/packages/:packageId/questions/:questionId", async (c) => {
  const pId = idSchema.safeParse(c.req.param("packageId"));
  const qId = idSchema.safeParse(c.req.param("questionId"));
  if (!pId.success || !qId.success) throw new HTTPException(404, { message: "Paket atau soal tidak ditemukan." });

  const [q] = await getDb().select().from(questions).where(and(eq(questions.id, qId.data), eq(questions.packageId, pId.data)));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan dalam paket ini." });

  await getDb().update(questions).set({ packageId: null }).where(eq(questions.id, q.id));
  return c.json({ success: true });
});

// --- Learner Package & Practice ---
async function getLearnerPackages(c: { req: { param: (key: string) => string }; json: (data: unknown) => Response }) {
  const idOrSlug = c.req.param("subtestId") ?? c.req.param("slug");
  const topic = await resolveTopic(idOrSlug);
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const rows = await getDb()
    .select({
      id: questionPackages.id,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      questionCount: count(questions.id),
    })
    .from(questionPackages)
    .leftJoin(questions, eq(questions.packageId, questionPackages.id))
    .where(and(eq(questionPackages.topicId, topic.id), eq(questionPackages.isActive, true)))
    .groupBy(questionPackages.id)
    .orderBy(questionPackages.order, questionPackages.createdAt);

  return c.json(rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount ?? 0),
  })) satisfies LearnerPackage[]);
}
app.get("/api/learner/subtests/:subtestId/packages", getLearnerPackages as never);
app.get("/api/learner/topics/:slug/packages", getLearnerPackages as never);
app.get("/api/learner/packages", async (c) => {
  const db = getDb();
  const [rows, pinned] = await Promise.all([db
    .select({
      id: questionPackages.id,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      topicId: questionPackages.topicId,
      topicName: topics.name,
      topicSlug: topics.slug,
      packageType: questionPackages.packageType,
      category: questionPackages.category,
      duration: questionPackages.duration,
      isFullTryout: questionPackages.isFullTryout,
      published: questionPackages.published,
      questionCount: count(questions.id),
    })
    .from(questionPackages)
    .innerJoin(topics, eq(questionPackages.topicId, topics.id))
    .leftJoin(questions, eq(questions.packageId, questionPackages.id))
    .where(and(eq(questionPackages.isActive, true), eq(questionPackages.published, true)))
    .groupBy(questionPackages.id, topics.id)
    .orderBy(questionPackages.order, questionPackages.createdAt),
    db.select({ packageId: tryoutPackageQuestions.packageId, questionCount: count() }).from(tryoutPackageQuestions).groupBy(tryoutPackageQuestions.packageId),
  ]);
  const pinnedCounts = new Map(pinned.map((item) => [item.packageId, Number(item.questionCount)]));

  return c.json(rows.map((row) => ({
    ...row,
    questionCount: row.isFullTryout ? (pinnedCounts.get(row.id) ?? 0) : Number(row.questionCount ?? 0),
  })));
});

app.get("/api/learner/summary", async (c) => {
  const attempts = await getDb().select({ topicId: practiceAttempts.topicId, correctCount: practiceAttempts.correctCount, totalCount: practiceAttempts.totalCount, submittedAt: practiceAttempts.submittedAt }).from(practiceAttempts).where(eq(practiceAttempts.userId, c.get("user").id));
  return c.json(learnerSummary(attempts));
});

// --- Leaderboard ---
// Simple in-memory cache: Map of query hash to { data, expiresAt }
const leaderboardCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

function getCacheKey(userId: string, metric: Metric, subtest: Subtest, period: Period, limit: number): string {
  return `${userId}:${metric}:${subtest}:${period}:${limit}`;
}

app.get("/api/leaderboard", async (c) => {
  const parsed = leaderboardQuerySchema.safeParse({
    metric: c.req.query("metric"),
    subtest: c.req.query("subtest"),
    period: c.req.query("period"),
    limit: c.req.query("limit"),
  });
  if (!parsed.success) {
    throw new HTTPException(400, { message: `Parameter tidak valid: ${parsed.error.issues[0]?.message}` });
  }

  const { metric, subtest, period, limit } = parsed.data;
  const cacheKey = getCacheKey(c.get("user").id, metric, subtest, period, limit);
  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return c.json(cached.data);
  }

  const periodRange = getPeriodRange(period as Period);
  const currentUserId = c.get("user").id;
  const isStreakMetric = metric === 'streak';

  // Get topic slug for subtest filter
  const topicSlug = SUBTEST_TO_SLUG[subtest as Subtest] || '';
  const minAnswers = ACCURACY_MIN_ANSWERS[subtest as Subtest] || 50;

  // Query for leaderboard data
  const db = getDb();

  // Get all non-demo users
  const allUsers = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      codename: accounts.codename,
      isDemo: accounts.isDemo,
    })
    .from(accounts)
    .where(eq(accounts.isDemo, false));

  // Calculate metrics for each user
  const userMetrics: Map<string, {
    id: string;
    name: string;
    codename: string;
    metricValue: number;
    answered: number;
    correct: number;
    accuracy: number;
    streak: number;
    lastAnswerAt: Date;
    level: number;
    totalXP: number;
  }> = new Map();

  // Initialize all users
  for (const user of allUsers) {
    userMetrics.set(user.id, {
      id: user.id,
      name: user.codename || user.name,
      codename: user.codename,
      metricValue: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
      streak: 0,
      lastAnswerAt: new Date(0),
      level: 1,
      totalXP: 0,
    });
  }

  if (isStreakMetric) {
    // Calculate streak for each user (ignores period and subtest)
    for (const [userId, data] of userMetrics) {
      const userAttempts = await db
        .select({ submittedAt: practiceAttempts.submittedAt })
        .from(practiceAttempts)
        .where(eq(practiceAttempts.userId, userId))
        .orderBy(practiceAttempts.submittedAt);

      const days = new Set(
        userAttempts.map((a) => {
          const wibDate = new Date(a.submittedAt.getTime() + 7 * 60 * 60 * 1000);
          return `${wibDate.getUTCFullYear()}-${String(wibDate.getUTCMonth() + 1).padStart(2, '0')}-${String(wibDate.getUTCDate()).padStart(2, '0')}`;
        })
      );

      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const today = `${wibNow.getUTCFullYear()}-${String(wibNow.getUTCMonth() + 1).padStart(2, '0')}-${String(wibNow.getUTCDate()).padStart(2, '0')}`;
      const practicedToday = days.has(today);
      let day = practicedToday ? today : new Date(wibNow.getTime() - 86_400_000).toISOString().slice(0, 10);
      let streakDays = 0;

      while (days.has(day)) {
        streakDays++;
        day = new Date(Date.parse(day + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);
      }

      data.streak = streakDays;
      data.metricValue = streakDays;
    }
  } else {
    const periodConditions = [
      ...(topicSlug ? [eq(topics.slug, topicSlug)] : []),
      ...(period === 'all' ? [] : [gte(practiceAttempts.submittedAt, periodRange.start), lte(practiceAttempts.submittedAt, periodRange.end)]),
    ];
    const periodAttempts = await db.select({ userId: practiceAttempts.userId, id: practiceAttempts.id, correctCount: practiceAttempts.correctCount, totalCount: practiceAttempts.totalCount, score: practiceAttempts.score, submittedAt: practiceAttempts.submittedAt })
      .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(periodConditions.length ? and(...periodConditions) : undefined);
    const answerConditions = [eq(practiceAnswers.isFirstAttempt, true), ...(topicSlug ? [eq(topics.slug, topicSlug)] : []), ...(period === 'all' ? [] : [gte(practiceAnswers.submittedAt, periodRange.start), lte(practiceAnswers.submittedAt, periodRange.end)])];
    const answers = await db.select({ userId: practiceAttempts.userId, questionId: practiceAnswers.questionId, isCorrect: practiceAnswers.isCorrect, submittedAt: practiceAnswers.submittedAt })
      .from(practiceAnswers).innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id)).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(and(...answerConditions));
    const statsByUser = new Map<string, { answerIds: Set<string>; correctIds: Set<string>; firstAnswerCorrect: number; attempts: number; periodCorrect: number; scoreTotal: number; scoreCount: number; lastAt: Date }>();
    for (const userId of userMetrics.keys()) statsByUser.set(userId, { answerIds: new Set(), correctIds: new Set(), firstAnswerCorrect: 0, attempts: 0, periodCorrect: 0, scoreTotal: 0, scoreCount: 0, lastAt: new Date(0) });
    for (const attempt of periodAttempts) {
      const stats = statsByUser.get(attempt.userId);
      if (!stats) continue;
      stats.attempts++;
      stats.periodCorrect += attempt.correctCount;
      stats.lastAt = attempt.submittedAt > stats.lastAt ? attempt.submittedAt : stats.lastAt;
      stats.scoreTotal += attempt.score ?? Math.round(attempt.correctCount / Math.max(1, attempt.totalCount) * 1000);
      stats.scoreCount++;
    }
    for (const answer of answers) {
      const stats = statsByUser.get(answer.userId);
      if (!stats) continue;
      stats.answerIds.add(answer.questionId);
      if (answer.isCorrect) { stats.correctIds.add(answer.questionId); stats.firstAnswerCorrect++; }
      stats.lastAt = answer.submittedAt > stats.lastAt ? answer.submittedAt : stats.lastAt;
    }
    const lifetimeAttempts = await db.select({ userId: practiceAttempts.userId, topicId: practiceAttempts.topicId, correctCount: practiceAttempts.correctCount, totalCount: practiceAttempts.totalCount, submittedAt: practiceAttempts.submittedAt }).from(practiceAttempts);
    const lifetimeByUser = new Map<string, { attempts: number; correct: number }>();
    for (const attempt of lifetimeAttempts) {
      const stats = lifetimeByUser.get(attempt.userId) ?? { attempts: 0, correct: 0 };
      stats.attempts++;
      stats.correct += attempt.correctCount;
      lifetimeByUser.set(attempt.userId, stats);
    }
    for (const [userId, data] of userMetrics) {
      const stats = statsByUser.get(userId)!;
      const lifetime = lifetimeByUser.get(userId) ?? { attempts: 0, correct: 0 };
      data.answered = stats.answerIds.size;
      data.correct = stats.correctIds.size;
      data.accuracy = data.answered ? Math.round(data.correct / data.answered * 10000) / 100 : 0;
      data.lastAnswerAt = stats.lastAt;
      data.totalXP = lifetime.attempts * 30 + lifetime.correct * 15;
      data.level = learnerSummary(lifetimeAttempts.filter((attempt) => attempt.userId === userId)).level;
      data.metricValue = metric === 'xp' ? stats.attempts * 30 + stats.periodCorrect * 15
        : metric === 'answered' ? data.answered
        : metric === 'correct' ? data.correct
        : metric === 'accuracy' ? data.accuracy
        : stats.scoreCount ? Math.round(stats.scoreTotal / stats.scoreCount) : 0;
    }
  }

  // Sort and rank
  const sortedUsers = Array.from(userMetrics.values()).filter((u) => {
    if (isStreakMetric) return u.metricValue > 0;
    if (metric === 'accuracy') return u.answered >= minAnswers && u.metricValue > 0;
    return u.metricValue > 0;
  });

  // Sort by metric value, then by last answer timestamp (earlier = higher), then by userId
  sortedUsers.sort((a, b) => {
    if (a.metricValue !== b.metricValue) return b.metricValue - a.metricValue;
    if (a.lastAnswerAt.getTime() !== b.lastAnswerAt.getTime()) return a.lastAnswerAt.getTime() - b.lastAnswerAt.getTime();
    return a.id.localeCompare(b.id);
  });

  // Build entries
  const entries = sortedUsers.slice(0, limit).map((u, idx) => {
    const rank = idx + 1;
    const isCurrentUser = u.id === currentUserId;
    return {
      rank,
      id: `LTV-${u.id.slice(0, 4).toUpperCase()}`,
      userId: u.id,
      name: u.name,
      metricValue: u.metricValue,
      level: u.level,
      totalXP: u.totalXP,
      answered: u.answered,
      correct: u.correct,
      accuracy: u.accuracy,
      streak: u.streak,
      isCurrentUser,
    };
  });

  // Find current user's position (including outside top N)
  let me = null;
  const userRankIdx = sortedUsers.findIndex((u) => u.id === currentUserId);
  const userData = userMetrics.get(currentUserId);

  if (userData) {
    const needsMore = metric === 'accuracy' && userData.answered < minAnswers
      ? minAnswers - userData.answered
      : null;

    me = {
      rank: userRankIdx >= 0 ? userRankIdx + 1 : null,
      metricValue: userData.metricValue,
      answered: userData.answered,
      correct: userData.correct,
      accuracy: userData.accuracy,
      streak: userData.streak,
      needsMore,
    };
  }

  const response = {
    entries,
    me,
    meta: {
      metric,
      subtest,
      period,
      periodStart: periodRange.startWIB,
      periodEnd: periodRange.endWIB,
      generatedAt: new Date().toISOString(),
    },
  };

  // Cache the response
  leaderboardCache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL_MS });

  return c.json(response);
});

app.get("/api/learner/history", async (c) => {
  const rows = await getDb().select({
    id: practiceAttempts.id,
    topic: topics.name,
    slug: topics.slug,
    packageId: practiceAttempts.packageId,
    packageName: questionPackages.name,
    correct: practiceAttempts.correctCount,
    total: practiceAttempts.totalCount,
    score: practiceAttempts.score,
    rawScore: practiceAttempts.rawScore,
    timeSpentSeconds: practiceAttempts.timeSpentSeconds,
    scoreBreakdown: practiceAttempts.scoreBreakdown,
    submittedAt: practiceAttempts.submittedAt,
  })
    .from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .leftJoin(questionPackages, eq(practiceAttempts.packageId, questionPackages.id))
    .where(eq(practiceAttempts.userId, c.get("user").id))
    .orderBy(desc(practiceAttempts.submittedAt));

  return c.json(rows.map((row) => ({
    ...row,
    submittedAt: row.submittedAt.toISOString(),
    earnedXP: practiceXP(row.correct),
    scoreBreakdown: row.scoreBreakdown ? JSON.parse(row.scoreBreakdown) : null,
  })) satisfies HistoryItem[]);
});

app.get("/api/learner/practice/:slug/:packageId", async (c) => {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, c.req.param("slug")));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const pkgId = idSchema.safeParse(c.req.param("packageId"));
  if (!pkgId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [pkg] = await getDb().select().from(questionPackages)
    .where(and(eq(questionPackages.id, pkgId.data), eq(questionPackages.topicId, topic.id), eq(questionPackages.isActive, true)));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const items = await getDb().select({
    id: questions.id,
    prompt: questions.prompt,
    options: questions.options,
    itemWeight: questions.itemWeight,
    calculatorAllowed: questions.calculatorAllowed,
  })
    .from(questions)
    .where(and(eq(questions.topicId, topic.id), eq(questions.packageId, pkg.id)))
    .orderBy(questions.order, questions.id);

  return c.json({ topic, packageId: pkg.id, packageName: pkg.name, package: { id: pkg.id, name: pkg.name, description: pkg.description }, items });
});

app.get("/api/learner/practice/:slug", async (c) => {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, c.req.param("slug")));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const items = await getDb().select({
    id: questions.id,
    prompt: questions.prompt,
    options: questions.options,
    itemWeight: questions.itemWeight,
    calculatorAllowed: questions.calculatorAllowed,
  })
    .from(questions)
    .where(eq(questions.topicId, topic.id))
    .orderBy(questions.order, questions.id);
  return c.json({ topic, items });
});

async function handlePracticeSubmit(c: { req: { param: (key: string) => string; json: () => Promise<unknown> }; get: (key: "user") => User; json: (data: unknown, status?: number) => Response }) {
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Jawaban tidak valid." });
  const submission = parsed.data;
  const slug = c.req.param("slug");
  const rawPackageParam = c.req.param("packageId");
  const targetPackageId = rawPackageParam && idSchema.safeParse(rawPackageParam).success
    ? rawPackageParam
    : parsed.data.packageId ?? undefined;

  const result = await getDb().transaction(async (tx) => {
    const [topic] = await tx.select().from(topics).where(eq(topics.slug, slug));
    if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

    async function replay() {
      const [saved] = await tx.select().from(practiceAttempts).where(and(eq(practiceAttempts.id, submission.submissionId!), eq(practiceAttempts.userId, c.get("user").id)));
      if (!saved) return null;
      const answers = await tx.select().from(practiceAnswers).where(eq(practiceAnswers.attemptId, saved.id));
      if (saved.topicId !== topic.id || saved.packageId !== (targetPackageId ?? null) || answers.length !== Object.keys(submission.answers).length || !answers.every((answer) => submission.answers[answer.questionId] === answer.selectedAnswer)) {
        throw new HTTPException(409, { message: "Jawaban berbeda dari pengumpulan yang sudah tersimpan. Mulai latihan baru." });
      }
      return {
        id: saved.id,
        packageId: saved.packageId,
        earnedXP: practiceXP(saved.correctCount),
        score: saved.score,
        rawScore: saved.rawScore,
        scoreBreakdown: saved.scoreBreakdown ? JSON.parse(saved.scoreBreakdown) : null,
      };
    }
    if (parsed.data.submissionId) {
      const saved = await replay();
      if (saved) return saved;
    }

    let validatedPackageId: string | null = null;
    if (targetPackageId) {
      const [pkg] = await tx.select().from(questionPackages)
        .where(and(eq(questionPackages.id, targetPackageId), eq(questionPackages.topicId, topic.id)));
      if (!pkg) throw new HTTPException(400, { message: "Paket tidak valid untuk subtes ini." });
      validatedPackageId = pkg.id;
    }

    const ids = Object.keys(parsed.data.answers);
    if (!ids.length) throw new HTTPException(400, { message: "Jawab soal sebelum dikumpulkan." });

    const whereClause = validatedPackageId
      ? and(eq(questions.topicId, topic.id), eq(questions.packageId, validatedPackageId), inArray(questions.id, ids))
      : and(eq(questions.topicId, topic.id), inArray(questions.id, ids));

    const rows = await tx.select({
      id: questions.id,
      answer: questions.correctAnswer,
      itemWeight: questions.itemWeight,
    }).from(questions).where(whereClause);
    if (rows.length !== ids.length) throw new HTTPException(400, { message: "Soal tidak valid untuk subtes/paket ini. Muat ulang latihan." });

    // Calculate Latveria Score
    const scoreResult = calculateLatveriaScore(
      rows.map((row) => ({
        questionId: row.id,
        isCorrect: row.answer === parsed.data.answers[row.id],
        timeSpentSeconds: parsed.data.questionTimes?.[row.id] ?? (parsed.data.timeSpentSeconds ? Math.round(parsed.data.timeSpentSeconds / rows.length) : 60),
        itemWeight: row.itemWeight ?? 100,
      }))
    );

    const correctCount = rows.filter((row) => row.answer === parsed.data.answers[row.id]).length;

    const [attempt] = await tx.insert(practiceAttempts).values({
      id: parsed.data.submissionId,
      userId: c.get("user").id,
      topicId: topic.id,
      packageId: validatedPackageId,
      totalCount: rows.length,
      correctCount,
      score: scoreResult.score,
      rawScore: scoreResult.rawScore,
      timeSpentSeconds: parsed.data.timeSpentSeconds ?? Math.round(scoreResult.averageTime * rows.length),
      scoreBreakdown: JSON.stringify(scoreResult),
    }).onConflictDoNothing({ target: practiceAttempts.id }).returning({ id: practiceAttempts.id });

    if (!attempt) {
      const saved = parsed.data.submissionId ? await replay() : null;
      if (saved) return saved;
      throw new HTTPException(409, { message: "ID pengumpulan sudah digunakan. Mulai latihan baru." });
    }

    const breakdownMap = new Map(scoreResult.itemBreakdowns.map((b) => [b.questionId, b]));
    await tx.insert(practiceAnswers).values(rows.map((row) => {
      const b = breakdownMap.get(row.id);
      return {
        attemptId: attempt.id,
        questionId: row.id,
        selectedAnswer: parsed.data.answers[row.id],
        isCorrect: row.answer === parsed.data.answers[row.id] ? 1 : 0,
        timeSpentSeconds: b?.timeSpentSeconds ?? null,
        itemWeight: b?.itemWeight ?? null,
        timeFactor: b ? Math.round(b.timeFactor * 100) : null,
        itemScore: b?.itemScore ?? null,
        isFirstAttempt: true,
        submittedAt: new Date(),
      };
    }));

    return {
      id: attempt.id,
      packageId: validatedPackageId ?? null,
      earnedXP: practiceXP(correctCount),
      score: scoreResult.score,
      rawScore: scoreResult.rawScore,
      scoreBreakdown: scoreResult,
    };
  });
  return c.json(result, 201);
}
app.post("/api/learner/practice/:slug", handlePracticeSubmit as never);
app.post("/api/learner/practice/:slug/:packageId", handlePracticeSubmit as never);

app.get("/api/learner/results/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404);
  const [attempt] = await getDb().select({
    id: practiceAttempts.id,
    topic: topics.name,
    slug: topics.slug,
    packageId: practiceAttempts.packageId,
    packageName: questionPackages.name,
    correct: practiceAttempts.correctCount,
    total: practiceAttempts.totalCount,
    score: practiceAttempts.score,
    rawScore: practiceAttempts.rawScore,
    timeSpentSeconds: practiceAttempts.timeSpentSeconds,
    scoreBreakdown: practiceAttempts.scoreBreakdown,
    submittedAt: practiceAttempts.submittedAt,
  }).from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .leftJoin(questionPackages, eq(practiceAttempts.packageId, questionPackages.id))
    .where(and(eq(practiceAttempts.id, id.data), eq(practiceAttempts.userId, c.get("user").id)));
  if (!attempt) throw new HTTPException(404, { message: "Hasil tidak ditemukan." });

  const answers = await getDb().select({
    id: questions.id,
    prompt: questions.prompt,
    options: questions.options,
    correctAnswer: questions.correctAnswer,
    explanation: questions.explanation,
    selectedAnswer: practiceAnswers.selectedAnswer,
    isCorrect: practiceAnswers.isCorrect,
  })
    .from(practiceAnswers).innerJoin(questions, eq(practiceAnswers.questionId, questions.id)).where(eq(practiceAnswers.attemptId, attempt.id)).orderBy(questions.id);

  return c.json({
    attempt: {
      ...attempt,
      submittedAt: attempt.submittedAt.toISOString(),
      earnedXP: practiceXP(attempt.correct),
      scoreBreakdown: attempt.scoreBreakdown ? JSON.parse(attempt.scoreBreakdown) : null,
    },
    answers,
  } satisfies Result);
});

// --- System Config ---
app.get("/api/learner/config", async (c) => {
  const configs = await getDb().select().from(systemConfig);
  const configMap = new Map(configs.map((cfg) => [cfg.key, cfg.value]));
  return c.json({
    utbk_target_date: configMap.get("utbk_target_date") || "2027-04-17",
    utbk_timezone: configMap.get("utbk_timezone") || "Asia/Jakarta",
    break_duration_minutes: Number(configMap.get("break_duration_minutes") || 15),
    score_max: Number(configMap.get("score_max") || 1000),
    today: new Date().toISOString(),
  });
});

app.get("/api/admin/config", async (c) => {
  const rows = await getDb().select().from(systemConfig).orderBy(systemConfig.key);
  return c.json(rows);
});

app.put("/api/admin/config/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.value !== "string") {
    throw new HTTPException(400, { message: "Nilai konfigurasi tidak valid." });
  }
  const [updated] = await getDb().insert(systemConfig).values({
    key,
    value: body.value,
    description: body.description ?? null,
  }).onConflictDoUpdate({
    target: systemConfig.key,
    set: { value: body.value, updatedAt: new Date() },
  }).returning();
  return c.json(updated);
});

// --- Affirmation System ---
app.get("/api/learner/affirmations", async (c) => {
  const rows = await getDb().select().from(affirmations).where(eq(affirmations.active, true)).orderBy(desc(affirmations.createdAt));
  return c.json(rows.map((r) => ({
    id: r.id,
    affirmation: r.affirmation,
    author: r.author,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })) satisfies Affirmation[]);
});

app.get("/api/admin/affirmations", async (c) => {
  const rows = await getDb().select().from(affirmations).orderBy(desc(affirmations.createdAt));
  return c.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

app.post("/api/admin/affirmations", async (c) => {
  const parsed = affirmationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data tidak valid." });
  const [created] = await getDb().insert(affirmations).values(parsed.data).returning();
  return c.json({
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }, 201);
});

app.put("/api/admin/affirmations/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  const body = await c.req.json().catch(() => ({}));
  const [updated] = await getDb().update(affirmations).set({
    ...body,
    updatedAt: new Date(),
  }).where(eq(affirmations.id, id.data)).returning();
  if (!updated) throw new HTTPException(404, { message: "Afirmasi tidak ditemukan." });
  return c.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

app.delete("/api/admin/affirmations/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  await getDb().delete(affirmations).where(eq(affirmations.id, id.data));
  return c.json({ success: true });
});

// --- Question Reports ---
app.post("/api/learner/reports", async (c) => {
  const parsed = questionReportSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Data laporan tidak valid." });
  const [created] = await getDb().insert(questionReports).values({
    questionId: parsed.data.questionId,
    packageId: parsed.data.packageId ?? null,
    userId: c.get("user").id,
    reason: parsed.data.reason,
    description: parsed.data.description,
  }).returning();
  return c.json({ success: true, id: created.id }, 201);
});

app.get("/api/admin/reports", async (c) => {
  const rows = await getDb().select({
    id: questionReports.id,
    questionId: questionReports.questionId,
    packageId: questionReports.packageId,
    packageName: questionPackages.name,
    userId: questionReports.userId,
    userName: accounts.name,
    reason: questionReports.reason,
    description: questionReports.description,
    status: questionReports.status,
    questionPrompt: questions.prompt,
    questionOptions: questions.options,
    correctAnswer: questions.correctAnswer,
    explanation: questions.explanation,
    createdAt: questionReports.createdAt,
    updatedAt: questionReports.updatedAt,
  })
    .from(questionReports)
    .innerJoin(questions, eq(questionReports.questionId, questions.id))
    .innerJoin(accounts, eq(questionReports.userId, accounts.id))
    .leftJoin(questionPackages, eq(questionReports.packageId, questionPackages.id))
    .orderBy(desc(questionReports.createdAt));

  return c.json(rows.map((r) => ({
    ...r,
    status: r.status as QuestionReportItem["status"],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })) satisfies QuestionReportItem[]);
});

app.put("/api/admin/reports/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  const body = await c.req.json().catch(() => ({}));
  const status = body.status;
  if (!["open", "reviewing", "resolved", "rejected"].includes(status)) {
    throw new HTTPException(400, { message: "Status tidak valid." });
  }
  const [updated] = await getDb().update(questionReports).set({
    status,
    updatedAt: new Date(),
  }).where(eq(questionReports.id, id.data)).returning();
  if (!updated) throw new HTTPException(404, { message: "Laporan tidak ditemukan." });
  return c.json(updated);
});

// --- Real Database Leaderboard ---
app.get("/api/learner/leaderboard", async (c) => {
  const period = c.req.query("period") ?? "weekly";
  return c.redirect(`/api/leaderboard?metric=xp&subtest=all&period=${encodeURIComponent(period === "all-time" ? "all" : period)}`);
});

// --- Tryout Sessions Engine (Multi-Subtest & Break & Timer & Persistence) ---
app.post("/api/learner/tryouts/start/:packageId", async (c) => {
  const pkgId = idSchema.safeParse(c.req.param("packageId"));
  if (!pkgId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const db = getDb();
  const officialSubtests = (await catalog(true)).filter((topic) => utbkSubtests.some((subtest) => subtest.slug === topic.slug));
  const result = await db.transaction(async (tx) => {
    const [pkg] = await tx.select().from(questionPackages).where(and(eq(questionPackages.id, pkgId.data), eq(questionPackages.isActive, true), eq(questionPackages.published, true), or(eq(questionPackages.isFullTryout, true), eq(questionPackages.packageType, "Simulasi"), eq(questionPackages.packageType, "Simulasi Akbar"))));
    if (!pkg) throw new HTTPException(404, { message: "Tryout tidak tersedia." });
    const tryoutTopics = pkg.isFullTryout ? officialSubtests : officialSubtests.filter((topic) => topic.id === pkg.topicId);
    if (!tryoutTopics.length) throw new HTTPException(409, { message: "Tryout belum memiliki subtes aktif." });

    const [existingSession] = await tx.select().from(tryoutSessions).where(and(eq(tryoutSessions.userId, c.get("user").id), eq(tryoutSessions.packageId, pkg.id), inArray(tryoutSessions.state, ["active", "break"])));
    if (existingSession && existingSession.questionSets !== "{}") return { session: existingSession, status: 200 as const };

    const questionSets: Record<string, string[]> = {};
    const baseCount = Math.floor(pkg.targetQuestions / tryoutTopics.length);
    const extraCount = pkg.targetQuestions % tryoutTopics.length;
    for (const [topicIndex, topic] of tryoutTopics.entries()) {
      const targetPerSubtest = Math.max(1, baseCount + (topicIndex < extraCount ? 1 : 0));
      const tryoutQuestions = await tx.select({ id: questions.id }).from(tryoutPackageQuestions)
        .innerJoin(questions, eq(tryoutPackageQuestions.questionId, questions.id))
        .where(and(eq(tryoutPackageQuestions.packageId, pkg.id), eq(questions.topicId, topic.id)))
        .orderBy(tryoutPackageQuestions.order, questions.order, questions.id);
      let pool = tryoutQuestions;
      if (!pool.length) pool = await tx.select({ id: questions.id }).from(questions).where(and(eq(questions.topicId, topic.id), eq(questions.category, pkg.category))).orderBy(questions.order, questions.id);
      if (!pool.length) pool = await tx.select({ id: questions.id }).from(questions).where(eq(questions.topicId, topic.id)).orderBy(questions.order, questions.id);
      for (let index = pool.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [pool[index], pool[swap]] = [pool[swap], pool[index]];
      }
      questionSets[topic.id] = pool.slice(0, targetPerSubtest).map((question) => question.id);
    }
    if (existingSession) {
      const [session] = await tx.update(tryoutSessions).set({ questionSets: JSON.stringify(questionSets), currentQuestionIndex: 0, subtestStartedAt: new Date() }).where(eq(tryoutSessions.id, existingSession.id)).returning();
      return { session, status: 200 as const };
    }
    const [session] = await tx.insert(tryoutSessions).values({
      userId: c.get("user").id, packageId: pkg.id, currentSubtestIndex: 0, state: "active",
      answers: "{}", flags: "{}", questionSets: JSON.stringify(questionSets), questionTimes: "{}", scoreBreakdown: "[]",
      currentQuestionIndex: 0, subtestStartedAt: new Date(),
    }).returning();
    return { session, status: 201 as const };
  });
  return c.json({ id: result.session.id }, result.status);
});

app.get("/api/learner/tryouts/:sessionId", async (c) => {
  const sId = idSchema.safeParse(c.req.param("sessionId"));
  if (!sId.success) throw new HTTPException(404, { message: "Sesi tryout tidak ditemukan." });

  const [session] = await getDb().select().from(tryoutSessions)
    .where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, c.get("user").id)));
  if (!session) throw new HTTPException(404, { message: "Sesi tidak ditemukan." });

  const [pkg] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, session.packageId));
  if (!pkg) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });
  const available = (await catalog(true)).filter((topic) => utbkSubtests.some((subtest) => subtest.slug === topic.slug));
  const subtests = pkg.isFullTryout ? available : available.filter((topic) => topic.id === pkg.topicId);
  const questionSets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;

  let state = session.state;
  let currentSubtestIndex = session.currentSubtestIndex;
  if (state === "break" && session.breakEndsAt && new Date() >= session.breakEndsAt) {
    state = "active";
    currentSubtestIndex = Math.min(subtests.length - 1, currentSubtestIndex + 1);
    await getDb().update(tryoutSessions).set({
      state: "active",
      currentSubtestIndex,
      breakEndsAt: null,
      currentQuestionIndex: 0,
      subtestStartedAt: new Date(),
    }).where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.userId, c.get("user").id), eq(tryoutSessions.state, "break")));
  }

  const currentSubtest = subtests[currentSubtestIndex] || subtests[0];
  if (!currentSubtest) throw new HTTPException(409, { message: "Subtes tryout tidak tersedia." });
  const selectedQuestionIds = questionSets[currentSubtest.id] ?? [];
  const qList = await getDb().select({
    id: questions.id,
    prompt: questions.prompt,
    options: questions.options,
    itemWeight: questions.itemWeight,
    calculatorAllowed: questions.calculatorAllowed,
  }).from(questions).where(selectedQuestionIds.length ? and(eq(questions.topicId, currentSubtest.id), inArray(questions.id, selectedQuestionIds)) : sql`false`).orderBy(questions.order, questions.id);
  const score = session.state === "completed" ? (() => {
    const items = JSON.parse(session.scoreBreakdown || "[]") as ReturnType<typeof calculateLatveriaScore>["itemBreakdowns"];
    return calculateLatveriaScore(items.map((item) => ({ questionId: item.questionId, isCorrect: item.isCorrect, itemWeight: item.itemWeight, timeSpentSeconds: item.timeSpentSeconds })));
  })() : null;
  const currentSubtestDuration = pkg.isFullTryout ? [30, 15, 25, 20, 45, 30, 30][currentSubtestIndex] ?? 30 : pkg.duration;
  const elapsed = Math.max(0, Math.floor((Date.now() - session.subtestStartedAt.getTime()) / 1000));
  const activeTimeRemaining = Math.max(0, currentSubtestDuration * 60 - elapsed);

  return c.json({
    session: {
      ...session,
      state,
      currentSubtestIndex,
      breakEndsAt: session.breakEndsAt?.toISOString() ?? null,
      answers: JSON.parse(session.answers || "{}"),
      flags: JSON.parse(session.flags || "{}"),
      questionTimes: JSON.parse(session.questionTimes || "{}"),
      totalScore: session.totalScore,
      completedAt: session.completedAt?.toISOString() ?? null,
      secondsRemaining: session.state === "break" && session.breakEndsAt ? Math.max(0, Math.ceil((session.breakEndsAt.getTime() - Date.now()) / 1000)) : activeTimeRemaining,
    },
    package: pkg,
    currentSubtest,
    totalSubtests: subtests.length,
    questions: qList,
    score,
  });
});

app.post("/api/learner/tryouts/:sessionId/autosave", async (c) => {
  const sId = idSchema.safeParse(c.req.param("sessionId"));
  if (!sId.success) throw new HTTPException(404);
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.answers !== "object" || Array.isArray(body.answers) || typeof body.flags !== "object" || Array.isArray(body.flags) || typeof body.questionTimes !== "object" || Array.isArray(body.questionTimes) || !Number.isInteger(body.currentQuestionIndex) || body.currentQuestionIndex < 0) throw new HTTPException(400, { message: "Data simpan tryout tidak valid." });
  const [session] = await getDb().select().from(tryoutSessions).where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, c.get("user").id), eq(tryoutSessions.state, "active")));
  if (!session) throw new HTTPException(404, { message: "Sesi tryout aktif tidak ditemukan." });
  const [packageInfo] = await getDb().select({ topicId: questionPackages.topicId, isFullTryout: questionPackages.isFullTryout }).from(questionPackages).where(eq(questionPackages.id, session.packageId));
  if (!packageInfo) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });
  const questionSets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;
  const availableSubtests = (await catalog(true)).filter((topic) => utbkSubtests.some((subtest) => subtest.slug === topic.slug));
  const activeSubtest = (packageInfo.isFullTryout ? availableSubtests : availableSubtests.filter((topic) => topic.id === packageInfo.topicId))[session.currentSubtestIndex];
  const allowed = new Set(activeSubtest ? questionSets[activeSubtest.id] ?? [] : []);
  const answers = body.answers as Record<string, unknown>;
  const flags = body.flags as Record<string, unknown>;
  const times = body.questionTimes as Record<string, unknown>;
    const previouslyAllowed = new Set(Object.entries(questionSets).slice(0, session.currentSubtestIndex + 1).flatMap(([, ids]) => ids));
    if (Object.entries(answers).some(([id, value]) => !previouslyAllowed.has(id) || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 3)
      || Object.entries(flags).some(([id, value]) => !previouslyAllowed.has(id) || typeof value !== "boolean")
      || Object.entries(times).some(([id, value]) => !previouslyAllowed.has(id) || !Number.isInteger(value) || Number(value) < 0 || Number(value) > 3600)
    || body.currentQuestionIndex >= Math.max(1, allowed.size)) throw new HTTPException(400, { message: "Jawaban atau posisi soal tidak sesuai dengan sesi tryout." });
  const updated = await getDb().update(tryoutSessions).set({
    answers: JSON.stringify(answers),
    flags: JSON.stringify(flags),
    questionTimes: JSON.stringify(times),
    currentQuestionIndex: body.currentQuestionIndex,
  }).where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, c.get("user").id), eq(tryoutSessions.state, "active"))).returning({ id: tryoutSessions.id });
  if (!updated.length) throw new HTTPException(409, { message: "Sesi berubah. Muat ulang tryout." });
  return c.json({ saved: true });
});

app.post("/api/learner/tryouts/:sessionId/subtest-submit", async (c) => {
  const sId = idSchema.safeParse(c.req.param("sessionId"));
  if (!sId.success) throw new HTTPException(404);
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.answers !== "object" || Array.isArray(body.answers) || typeof body.timeSpentByQuestion !== "object" || Array.isArray(body.timeSpentByQuestion)) throw new HTTPException(400, { message: "Jawaban tryout tidak valid." });
  const response = await getDb().transaction(async (tx) => {
    const [session] = await tx.select().from(tryoutSessions).where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, c.get("user").id))).for("update");
    if (!session || session.state !== "active") throw new HTTPException(409, { message: "Subtes ini sudah dikumpulkan atau sesi tidak aktif." });
    const [pkg] = await tx.select().from(questionPackages).where(eq(questionPackages.id, session.packageId));
    if (!pkg) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });
    const all = (await catalog(true)).filter((topic) => utbkSubtests.some((subtest) => subtest.slug === topic.slug));
    const subtests = pkg.isFullTryout ? all : all.filter((topic) => topic.id === pkg.topicId);
    const current = subtests[session.currentSubtestIndex];
    if (!current) throw new HTTPException(409, { message: "Urutan subtes tryout tidak valid." });
    const sets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;
    const ids = sets[current.id] ?? [];
    const bodyAnswers = body.answers as Record<string, unknown>;
    const times = body.timeSpentByQuestion as Record<string, unknown>;
    const savedAnswers = JSON.parse(session.answers || "{}") as Record<string, string>;
    const previouslySubmittedIds = new Set(Object.entries(sets).slice(0, session.currentSubtestIndex + 1).flatMap(([, questionIds]) => questionIds));
    const currentAnswers = Object.fromEntries(ids.filter((id) => Object.hasOwn(bodyAnswers, id)).map((id) => [id, bodyAnswers[id]]));
    const allAnswers = { ...savedAnswers, ...currentAnswers };
    if (Object.keys(currentAnswers).length !== ids.length || ids.some((id) => !Number.isInteger(Number(currentAnswers[id])) || Number(currentAnswers[id]) < 0 || Number(currentAnswers[id]) > 3)
      || Object.keys(bodyAnswers).some((id) => !previouslySubmittedIds.has(id))
      || Object.entries(times).some(([id, value]) => !previouslySubmittedIds.has(id) || !Number.isInteger(value) || Number(value) < 0 || Number(value) > 3600)) throw new HTTPException(400, { message: "Jawab semua soal subtes ini sebelum mengumpulkan." });
    const questionRows = ids.length ? await tx.select({ id: questions.id, correctAnswer: questions.correctAnswer, itemWeight: questions.itemWeight }).from(questions).where(and(eq(questions.topicId, current.id), inArray(questions.id, ids))) : [];
    if (questionRows.length !== ids.length) throw new HTTPException(409, { message: "Soal tryout berubah. Muat ulang sesi." });
    const result = calculateLatveriaScore(questionRows.map((question) => ({
      questionId: question.id,
      isCorrect: Number(currentAnswers[question.id]) === question.correctAnswer,
      itemWeight: question.itemWeight,
      timeSpentSeconds: Number.isInteger(times[question.id]) ? Number(times[question.id]) : 60,
    })));
    const prior = JSON.parse(session.scoreBreakdown || "[]") as ReturnType<typeof calculateLatveriaScore>["itemBreakdowns"];
    const scoreBreakdown = [...prior, ...result.itemBreakdowns];
    const aggregate = calculateLatveriaScore(scoreBreakdown.map((item) => ({ questionId: item.questionId, isCorrect: item.isCorrect, itemWeight: item.itemWeight, timeSpentSeconds: item.timeSpentSeconds })));
    const answers = allAnswers;
    const isLast = session.currentSubtestIndex >= subtests.length - 1;
    if (isLast) {
      await tx.update(tryoutSessions).set({ state: "completed", completedAt: new Date(), answers: JSON.stringify(answers), scoreBreakdown: JSON.stringify(scoreBreakdown), totalScore: aggregate.score }).where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.state, "active")));
      return { status: "completed" as const, score: aggregate };
    }
    const [cfg] = await tx.select().from(systemConfig).where(eq(systemConfig.key, "break_duration_minutes"));
    const breakMinutes = Math.max(0, Number(cfg?.value || 15));
    const breakEndsAt = new Date(Date.now() + breakMinutes * 60 * 1000);
    await tx.update(tryoutSessions).set({ state: "break", breakEndsAt, answers: JSON.stringify(answers), scoreBreakdown: JSON.stringify(scoreBreakdown), totalScore: aggregate.score }).where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.state, "active")));
    return { status: "break" as const, breakEndsAt: breakEndsAt.toISOString(), breakMinutes, nextSubtestIndex: session.currentSubtestIndex + 1 };
  });
  return c.json(response);
});

app.get("/api/admin/questions", async (c) => {
  const parsed = bankQuerySchema.safeParse(c.req.query());
  if (!parsed.success) throw new HTTPException(400, { message: "Filter tidak valid." });
  const query = parsed.data;
  if (query.subtes && !utbkSubtests.some((subtest) => subtest.slug === query.subtes)) throw new HTTPException(404);

  const where = and(
    query.subtes ? eq(topics.slug, query.subtes) : undefined,
    query.kategori ? eq(questions.category, query.kategori) : undefined,
    query.paket ? (idSchema.safeParse(query.paket).success ? eq(questions.packageId, query.paket) : eq(questionPackages.name, query.paket)) : undefined,
  );
  const db = getDb();
  const pageParam = query.halaman;
  const [[total], categories, counts, pkgs, initialRows] = await Promise.all([
    db.select({ value: count() }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).leftJoin(questionPackages, eq(questions.packageId, questionPackages.id)).where(where),
    db.selectDistinct({ category: questions.category }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(query.subtes ? eq(topics.slug, query.subtes) : undefined).orderBy(questions.category),
    catalog(),
    db.select({
      id: questionPackages.id,
      name: questionPackages.name,
      topicId: questionPackages.topicId,
      questionCount: count(questions.id),
    }).from(questionPackages)
      .innerJoin(topics, eq(questionPackages.topicId, topics.id))
      .leftJoin(questions, eq(questions.packageId, questionPackages.id))
      .where(query.subtes ? eq(topics.slug, query.subtes) : undefined)
      .groupBy(questionPackages.id)
      .orderBy(questionPackages.order),
    db.select({
      id: questions.id,
      prompt: questions.prompt,
      category: questions.category,
      packageId: questions.packageId,
      packageName: questionPackages.name,
      topic: topics.name,
      source: questions.source,
    }).from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(where)
      .orderBy(topics.name, questions.id)
      .limit(15)
      .offset((pageParam - 1) * 15),
  ]);
  const pageCount = Math.max(1, Math.ceil(total.value / 15));
  const page = Math.min(pageParam, pageCount);
  const rows = page === pageParam ? initialRows : await db.select({
    id: questions.id,
    prompt: questions.prompt,
    category: questions.category,
    packageId: questions.packageId,
    packageName: questionPackages.name,
    topic: topics.name,
    source: questions.source,
  }).from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
    .where(where)
    .orderBy(topics.name, questions.id)
    .limit(15)
    .offset((page - 1) * 15);

  return c.json({
    rows,
    total: total.value,
    page,
    pageCount,
    categories: categories.flatMap((row) => row.category ? [row.category] : []),
    packages: pkgs.map((p) => ({ ...p, questionCount: Number(p.questionCount ?? 0) })),
    tabs: [
      { slug: "semua", name: "Semua", value: counts.reduce((sum, row) => sum + row.questionCount, 0) },
      ...counts.map((row) => ({ slug: row.slug, name: row.name, value: row.questionCount })),
    ],
  } satisfies Bank);
});

app.post("/api/admin/questions", async (c) => {
  const parsed = questionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Periksa isian soal, opsi, dan pembahasan." });
  const [topic] = await getDb().select({ slug: topics.slug }).from(topics).where(eq(topics.id, parsed.data.topicId));
  if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });

  if (parsed.data.packageId) {
    const [pkg] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, parsed.data.packageId));
    if (!pkg) throw new HTTPException(400, { message: "Paket soal tidak ditemukan." });
    if (pkg.topicId !== parsed.data.topicId) {
      throw new HTTPException(400, { message: "Paket soal tidak cocok dengan subtes yang dipilih." });
    }
  }

  const [created] = await getDb().insert(questions).values(parsed.data).returning({ id: questions.id, packageId: questions.packageId });
  invalidateCatalogCache();
  return c.json({ id: created.id, slug: topic.slug, packageId: created.packageId }, 201);
});

app.post("/api/admin/questions/import", async (c) => {
  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > 200_000) throw new HTTPException(413, { message: "File JSON terlalu besar (maksimal 200 KB)." });
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new HTTPException(400, { message: "Format JSON tidak valid." }); }
  const parsed = questionImportSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const group = issue.path[1];
    const number = issue.path[3];
    throw new HTTPException(400, { message: `Data impor tidak valid${typeof group === "number" ? ` pada grup ${group + 1}` : ""}${typeof number === "number" ? ` soal ${number + 1}` : ""}: ${issue.message}` });
  }
  const validSlugs = new Set(utbkSubtests.map((subtest) => subtest.slug));
  const invalid = parsed.data.groups.findIndex((group) => !validSlugs.has(group.subtes as typeof utbkSubtests[number]["slug"]));
  if (invalid >= 0) throw new HTTPException(400, { message: `Subtes grup ${invalid + 1} tidak dikenal.` });
  const result = await getDb().transaction(async (tx) => {
    const slugs = [...new Set(parsed.data.groups.map((group) => group.subtes))];
    const existing = await tx.select({ id: topics.id, slug: topics.slug }).from(topics).where(inArray(topics.slug, slugs));
    if (existing.length !== slugs.length) throw new HTTPException(400, { message: "Subtes belum tersedia di database." });
    const ids = new Map(existing.map((topic) => [topic.slug, topic.id]));

    const destinations = new Map<string, { id: string; name: string; slug: string; count: number }>();
    let count = 0;
    for (const group of parsed.data.groups) {
      const topicId = ids.get(group.subtes)!;
      let pkg;
      if (group.packageId) {
        [pkg] = await tx.select({ id: questionPackages.id, name: questionPackages.name }).from(questionPackages)
          .where(and(eq(questionPackages.id, group.packageId), eq(questionPackages.topicId, topicId))).for("update");
        if (!pkg) throw new HTTPException(400, { message: `Paket tujuan tidak ditemukan pada subtes ${group.subtes}.` });
      } else {
        const name = group.packageName ?? "Paket 1";
        await tx.insert(questionPackages).values({ topicId, name, order: 1 })
          .onConflictDoNothing({ target: [questionPackages.topicId, questionPackages.name] });
        [pkg] = await tx.select({ id: questionPackages.id, name: questionPackages.name }).from(questionPackages)
          .where(and(eq(questionPackages.topicId, topicId), eq(questionPackages.name, name))).for("update");
      }
      if (!pkg) throw new HTTPException(400, { message: "Paket tujuan tidak tersedia. Coba lagi." });
      const values = group.questions.map((question) => ({
        ...question,
        category: group.category,
        topicId,
        packageId: pkg.id,
      }));
      await tx.insert(questions).values(values);
      count += values.length;
      const destination = destinations.get(pkg.id) ?? { ...pkg, slug: group.subtes, count: 0 };
      destination.count += values.length;
      destinations.set(pkg.id, destination);
    }
    return { count, packages: [...destinations.values()] };
  });
  invalidateCatalogCache();
  return c.json(result, 201);
});

app.get("/api/admin/questions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404);
  const [item] = await getDb().select({
    id: questions.id,
    topicId: questions.topicId,
    packageId: questions.packageId,
    packageName: questionPackages.name,
    prompt: questions.prompt,
    options: questions.options,
    correctAnswer: questions.correctAnswer,
    explanation: questions.explanation,
    category: questions.category,
    source: questions.source,
    topic: topics.name,
    slug: topics.slug,
  }).from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
    .where(eq(questions.id, id.data));
  if (!item) throw new HTTPException(404);
  const [usage] = await getDb().select({ value: count() }).from(practiceAnswers).where(eq(practiceAnswers.questionId, id.data));
  return c.json({ ...item, category: item.category ?? undefined, usage: usage.value } satisfies QuestionDetail);
});

app.put("/api/admin/questions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  const parsed = questionSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !parsed.success) throw new HTTPException(400, { message: "Data soal tidak valid." });
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    // Lock baris sebelum memeriksa referensi, termasuk submit yang sedang berjalan.
    const [existing] = await tx.select({ id: questions.id }).from(questions).where(eq(questions.id, id.data)).for("update");
    if (!existing) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
    const [usage] = await tx.select({ value: count() }).from(practiceAnswers).where(eq(practiceAnswers.questionId, id.data));
    if (usage.value) throw new HTTPException(409, { message: "Soal sudah digunakan dalam latihan dan tidak dapat diedit." });
    const [topic] = await tx.select({ slug: topics.slug }).from(topics).where(eq(topics.id, parsed.data.topicId));
    if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });

    if (parsed.data.packageId) {
      const [pkg] = await tx.select().from(questionPackages).where(eq(questionPackages.id, parsed.data.packageId));
      if (!pkg) throw new HTTPException(400, { message: "Paket soal tidak ditemukan." });
      if (pkg.topicId !== parsed.data.topicId) {
        throw new HTTPException(400, { message: "Paket soal tidak cocok dengan subtes yang dipilih." });
      }
    }

    await tx.update(questions).set({
      ...parsed.data,
      packageId: parsed.data.packageId ?? null,
      category: parsed.data.category ?? null,
    }).where(eq(questions.id, id.data));
    return topic.slug;
  });
  invalidateCatalogCache();
  return c.json({ id: id.data, slug: result });
});

app.post("/api/admin/questions/bulk-delete", async (c) => {
  const parsed = bulkDeleteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Pilih 1–100 soal dengan ID valid." });
  const ids = parsed.data.ids;
  const deleted = await getDb().transaction(async (tx) => {
    const rows = await tx.select({ id: questions.id }).from(questions).where(inArray(questions.id, ids)).orderBy(questions.id).for("update");
    if (rows.length !== ids.length) throw new HTTPException(404, { message: "Sebagian soal tidak ditemukan. Muat ulang bank soal." });
    const [usage] = await tx.select({ value: count() }).from(practiceAnswers).where(inArray(practiceAnswers.questionId, ids));
    if (usage.value) throw new HTTPException(409, { message: "Penghapusan dibatalkan: ada soal terpilih yang sudah dipakai peserta. Tidak ada soal dihapus." });
    return tx.delete(questions).where(inArray(questions.id, ids)).returning({ id: questions.id });
  });
  invalidateCatalogCache();
  return c.json({ count: deleted.length });
});

app.delete("/api/admin/questions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(400);
  try {
    const deleted = await getDb().delete(questions).where(eq(questions.id, id.data)).returning({ id: questions.id });
    if (!deleted.length) throw new HTTPException(404);
    invalidateCatalogCache();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    // FK database menolak penghapusan soal terpakai, termasuk race dengan submit.
    throw new HTTPException(409, { message: "Soal sudah digunakan atau tidak dapat dihapus." });
  }
  return c.json({ success: true });
});

// --- Admin Package Duplication ---
app.post("/api/admin/packages/:packageId/duplicate", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [existing] = await getDb().select().from(questionPackages).where(eq(questionPackages.id, id.data));
  if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const newName = `${existing.name} (Salinan ${Date.now().toString().slice(-4)})`;
  const [created] = await getDb().insert(questionPackages).values({
    topicId: existing.topicId,
    name: newName,
    description: existing.description,
    packageType: existing.packageType,
    category: existing.category,
    duration: existing.duration,
    isFullTryout: existing.isFullTryout,
    targetQuestions: existing.targetQuestions,
    published: existing.published,
    order: existing.order + 1,
    isActive: true,
  }).returning();

  // Copy questions
  const qRows = await getDb().select().from(questions).where(eq(questions.packageId, existing.id));
  if (qRows.length > 0) {
    await getDb().insert(questions).values(qRows.map((q) => ({
      topicId: q.topicId,
      packageId: created.id,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      source: q.source,
      category: q.category,
      itemWeight: q.itemWeight,
      calculatorAllowed: q.calculatorAllowed,
      order: q.order,
      subtestOrder: q.subtestOrder,
    })));
  }

  invalidateCatalogCache();
  return c.json({
    ...created,
    questionCount: qRows.length,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }, 201);
});

// --- Admin Tryout Creation & Builder ---
app.post("/api/admin/tryouts", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || !body.topicId) {
    throw new HTTPException(400, { message: "Nama tryout dan subtes wajib diisi." });
  }

  const [topic] = await getDb().select().from(topics).where(eq(topics.id, body.topicId));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

  const isFullTryout = Boolean(body.isFullTryout);
  const targetQuestions = Number(body.targetQuestions || (isFullTryout ? 160 : 30));

  // If questions are provided, validate count
  const questionsList = Array.isArray(body.questions) ? body.questions : [];
  if (isFullTryout && questionsList.length > 0 && questionsList.length !== targetQuestions) {
    throw new HTTPException(400, {
      message: `Full Tryout memerlukan tepat ${targetQuestions} soal (saat ini ${questionsList.length} soal).`,
    });
  }

  const [pkg] = await getDb().insert(questionPackages).values({
    topicId: topic.id,
    name: body.name,
    description: body.description ?? "Tryout Standar SNPMB / Ujian Mandiri",
    packageType: "Tryout",
    category: body.category || "utbk",
    duration: Number(body.duration || (isFullTryout ? 195 : 30)),
    isFullTryout,
    targetQuestions,
    published: body.published !== false,
    order: Number(body.order || 1),
    isActive: true,
  }).returning();

  if (questionsList.length > 0) {
    await getDb().insert(questions).values(questionsList.map((q: {
      prompt: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      source?: string;
      category?: string;
      itemWeight?: number;
      calculatorAllowed?: boolean;
      order?: number;
      subtestOrder?: number;
    }, idx: number) => ({
      topicId: topic.id,
      packageId: pkg.id,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "Pembahasan terstandar.",
      source: q.source || "Tryout Latveria",
      category: q.category || topic.name,
      itemWeight: q.itemWeight ?? 100,
      calculatorAllowed: Boolean(q.calculatorAllowed),
      order: q.order ?? idx + 1,
      subtestOrder: q.subtestOrder ?? 1,
    })));
  }

  invalidateCatalogCache();
  return c.json({
    ...pkg,
    questionCount: questionsList.length,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  }, 201);
});

// --- Admin Subjects / Topics Management ---
app.post("/api/admin/topics", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || !body.slug) {
    throw new HTTPException(400, { message: "Nama dan slug topik wajib diisi." });
  }
  const [existing] = await getDb().select().from(topics).where(eq(topics.slug, body.slug));
  if (existing) throw new HTTPException(409, { message: "Slug sudah digunakan." });

  const [created] = await getDb().insert(topics).values({
    slug: body.slug,
    name: body.name,
    description: body.description ?? "",
    category: body.category || "utbk",
    section: body.section || "tps",
    order: Number(body.order || 0),
  }).returning();

  invalidateCatalogCache();
  return c.json(created, 201);
});

app.put("/api/admin/topics/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  const body = await c.req.json().catch(() => ({}));
  const [updated] = await getDb().update(topics).set({
    name: body.name,
    description: body.description,
    category: body.category,
    section: body.section,
    order: body.order,
  }).where(eq(topics.id, id.data)).returning();
  if (!updated) throw new HTTPException(404, { message: "Topik tidak ditemukan." });

  invalidateCatalogCache();
  return c.json(updated);
});

app.delete("/api/admin/topics/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  const [qCount] = await getDb().select({ value: count() }).from(questions).where(eq(questions.topicId, id.data));
  if (qCount.value > 0) {
    throw new HTTPException(409, { message: `Topik masih memiliki ${qCount.value} soal. Hapus soal terlebih dahulu.` });
  }
  await getDb().delete(topics).where(eq(topics.id, id.data));
  invalidateCatalogCache();
  return c.json({ success: true });
});

app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  console.error("API request failed:", error);
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
