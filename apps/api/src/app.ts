import { Hono } from "hono";
import { and, count, countDistinct, desc, eq, inArray, sum } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  assignQuestionToPackageSchema,
  bankQuerySchema,
  bulkDeleteSchema,
  createPackageSchema,
  credentialsSchema,
  idSchema,
  moveQuestionPackageSchema,
  profileSchema,
  questionImportSchema,
  questionSchema,
  signupSchema,
  submissionSchema,
  updatePackageSchema,
  utbkSubtests,
  type Bank,
  type HistoryItem,
  type LearnerPackage,
  type PackageDetail,
  type Profile,
  type QuestionDetail,
  type QuestionPackage,
  type Result,
  type Topic,
  type User,
} from "@latveria/shared";
import { getAuth } from "./lib/auth";
import { getDb } from "./lib/db";
import { allowedOrigins } from "./lib/origins";
import { practiceAnswers, practiceAttempts, questionPackages, questions, topics } from "./lib/db/schema";
import { user as accounts } from "./lib/db/auth-schema";

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
    getDb().select({ id: topics.id, slug: topics.slug, name: topics.name, description: topics.description, questionCount: count(questions.id) })
      .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id),
    getDb().select({ topicId: questionPackages.topicId, packageCount: count(questionPackages.id) })
      .from(questionPackages)
      .where(activeOnly ? eq(questionPackages.isActive, true) : undefined)
      .groupBy(questionPackages.topicId),
  ]);
  const pkgMap = new Map(pkgRows.map((p) => [p.topicId, Number(p.packageCount ?? 0)]));
  const result = utbkSubtests.flatMap((subtest) => {
    const row = rows.find((topic) => topic.slug === subtest.slug);
    return row ? [{ ...row, section: subtest.section, short: subtest.short, packageCount: pkgMap.get(row.id) ?? 0 }] : [];
  });
  cachedCatalog.set(activeOnly, { data: result, expiresAt: now + 30_000 });
  return result;
}
app.get("/api/learner/topics", async (c) => c.json(await catalog(true)));
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

app.get("/api/learner/summary", async (c) => {
  const [summary] = await getDb().select({ attempts: count(), tried: countDistinct(practiceAttempts.topicId), correct: sum(practiceAttempts.correctCount), answered: sum(practiceAttempts.totalCount) }).from(practiceAttempts).where(eq(practiceAttempts.userId, c.get("user").id));
  return c.json({ ...summary, correct: Number(summary.correct ?? 0), answered: Number(summary.answered ?? 0) });
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
    submittedAt: practiceAttempts.submittedAt,
  })
    .from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .leftJoin(questionPackages, eq(practiceAttempts.packageId, questionPackages.id))
    .where(eq(practiceAttempts.userId, c.get("user").id))
    .orderBy(desc(practiceAttempts.submittedAt));
  return c.json(rows.map((row) => ({ ...row, submittedAt: row.submittedAt.toISOString() })) satisfies HistoryItem[]);
});

app.get("/api/learner/practice/:slug/:packageId", async (c) => {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, c.req.param("slug")));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const pkgId = idSchema.safeParse(c.req.param("packageId"));
  if (!pkgId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [pkg] = await getDb().select().from(questionPackages)
    .where(and(eq(questionPackages.id, pkgId.data), eq(questionPackages.topicId, topic.id), eq(questionPackages.isActive, true)));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options })
    .from(questions)
    .where(and(eq(questions.topicId, topic.id), eq(questions.packageId, pkg.id)))
    .orderBy(questions.id);

  return c.json({ topic, packageId: pkg.id, packageName: pkg.name, package: { id: pkg.id, name: pkg.name, description: pkg.description }, items });
});

app.get("/api/learner/practice/:slug", async (c) => {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, c.req.param("slug")));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  // Backward compatibility: seleksi eksplisit tanpa kunci/pembahasan
  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options })
    .from(questions)
    .where(eq(questions.topicId, topic.id))
    .orderBy(questions.id);
  return c.json({ topic, items });
});

async function handlePracticeSubmit(c: { req: { param: (key: string) => string; json: () => Promise<unknown> }; get: (key: "user") => User; json: (data: unknown, status?: number) => Response }) {
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Jawaban tidak valid." });
  const slug = c.req.param("slug");
  const rawPackageParam = c.req.param("packageId");
  const targetPackageId = rawPackageParam && idSchema.safeParse(rawPackageParam).success
    ? rawPackageParam
    : parsed.data.packageId ?? undefined;

  const result = await getDb().transaction(async (tx) => {
    const [topic] = await tx.select().from(topics).where(eq(topics.slug, slug));
    if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

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

    const rows = await tx.select({ id: questions.id, answer: questions.correctAnswer }).from(questions).where(whereClause);
    if (rows.length !== ids.length) throw new HTTPException(400, { message: "Soal tidak valid untuk subtes/paket ini. Muat ulang latihan." });

    const [attempt] = await tx.insert(practiceAttempts).values({
      userId: c.get("user").id,
      topicId: topic.id,
      packageId: validatedPackageId,
      totalCount: rows.length,
      correctCount: rows.filter((row) => row.answer === parsed.data.answers[row.id]).length,
    }).returning({ id: practiceAttempts.id });

    await tx.insert(practiceAnswers).values(rows.map((row) => ({
      attemptId: attempt.id,
      questionId: row.id,
      selectedAnswer: parsed.data.answers[row.id],
      isCorrect: row.answer === parsed.data.answers[row.id] ? 1 : 0,
    })));

    return { id: attempt.id, packageId: validatedPackageId ?? null };
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
  return c.json({ attempt: { ...attempt, submittedAt: attempt.submittedAt.toISOString() }, answers } satisfies Result);
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
  if (text.length > 200_000) throw new HTTPException(413, { message: "File JSON terlalu besar (maksimal 200 KB)." });
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
  const total = await getDb().transaction(async (tx) => {
    const slugs = [...new Set(parsed.data.groups.map((group) => group.subtes))];
    const existing = await tx.select({ id: topics.id, slug: topics.slug }).from(topics).where(inArray(topics.slug, slugs));
    if (existing.length !== slugs.length) throw new HTTPException(400, { message: "Subtes belum tersedia di database." });
    const ids = new Map(existing.map((topic) => [topic.slug, topic.id]));

    // Find or create default "Paket 1" for each subtest imported
    const pkgs = await tx.select({ id: questionPackages.id, topicId: questionPackages.topicId, name: questionPackages.name })
      .from(questionPackages)
      .where(inArray(questionPackages.topicId, existing.map((t) => t.id)));
    const pkgMap = new Map<string, string>();
    for (const t of existing) {
      const match = pkgs.find((p) => p.topicId === t.id && p.name === "Paket 1") ?? pkgs.find((p) => p.topicId === t.id);
      if (match) {
        pkgMap.set(t.id, match.id);
      } else {
        const [newPkg] = await tx.insert(questionPackages).values({ topicId: t.id, name: "Paket 1", order: 1 }).returning({ id: questionPackages.id });
        pkgMap.set(t.id, newPkg.id);
      }
    }

    const values = parsed.data.groups.flatMap((group) => {
      const topicId = ids.get(group.subtes)!;
      const packageId = pkgMap.get(topicId);
      return group.questions.map((question) => ({
        ...question,
        category: group.category,
        topicId,
        packageId,
      }));
    });
    await tx.insert(questions).values(values);
    return values.length;
  });
  invalidateCatalogCache();
  return c.json({ count: total }, 201);
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

app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  console.error("API request failed:", error);
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
