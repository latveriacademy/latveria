import { Hono } from "hono";
import { and, count, countDistinct, desc, eq, inArray, sum } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { bankQuerySchema, credentialsSchema, signupSchema, idSchema, questionSchema, questionImportSchema, submissionSchema, utbkSubtests, type Bank, type HistoryItem, type QuestionDetail, type Result, type Topic, type User } from "@latveria/shared";
import { getAuth } from "./lib/auth";
import { getDb } from "./lib/db";
import { allowedOrigins } from "./lib/origins";
import { bulkDeleteSchema } from "@latveria/shared";
import { practiceAnswers, practiceAttempts, questions, topics } from "./lib/db/schema";

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

async function catalog(): Promise<Topic[]> {
  const rows = await getDb().select({ id: topics.id, slug: topics.slug, name: topics.name, description: topics.description, questionCount: count(questions.id) })
    .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id);
  return utbkSubtests.flatMap((subtest) => {
    const row = rows.find((topic) => topic.slug === subtest.slug);
    return row ? [{ ...row, section: subtest.section, short: subtest.short }] : [];
  });
}
app.get("/api/learner/topics", async (c) => c.json(await catalog()));
app.get("/api/admin/topics", async (c) => c.json(await catalog()));
app.get("/api/learner/summary", async (c) => {
  const [summary] = await getDb().select({ attempts: count(), tried: countDistinct(practiceAttempts.topicId), correct: sum(practiceAttempts.correctCount), answered: sum(practiceAttempts.totalCount) }).from(practiceAttempts).where(eq(practiceAttempts.userId, c.get("user").id));
  return c.json({ ...summary, correct: Number(summary.correct ?? 0), answered: Number(summary.answered ?? 0) });
});
app.get("/api/learner/history", async (c) => {
  const rows = await getDb().select({ id: practiceAttempts.id, topic: topics.name, slug: topics.slug, correct: practiceAttempts.correctCount, total: practiceAttempts.totalCount, submittedAt: practiceAttempts.submittedAt })
    .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(eq(practiceAttempts.userId, c.get("user").id)).orderBy(desc(practiceAttempts.submittedAt));
  return c.json(rows.map((row) => ({ ...row, submittedAt: row.submittedAt.toISOString() })) satisfies HistoryItem[]);
});
app.get("/api/learner/practice/:slug", async (c) => {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, c.req.param("slug")));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  // Seleksi eksplisit: kunci/pembahasan tidak pernah keluar sebelum submit.
  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options }).from(questions).where(eq(questions.topicId, topic.id)).orderBy(questions.id);
  return c.json({ topic, items });
});
app.post("/api/learner/practice/:slug", async (c) => {
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Jawaban tidak valid." });
  const id = await getDb().transaction(async (tx) => {
    const [topic] = await tx.select().from(topics).where(eq(topics.slug, c.req.param("slug")));
    if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
    const ids = Object.keys(parsed.data.answers);
    if (!ids.length) throw new HTTPException(400, { message: "Jawab soal sebelum dikumpulkan." });
    const rows = await tx.select({ id: questions.id, answer: questions.correctAnswer }).from(questions).where(and(eq(questions.topicId, topic.id), inArray(questions.id, ids)));
    if (rows.length !== ids.length) throw new HTTPException(400, { message: "Soal tidak valid untuk subtes ini. Muat ulang latihan." });
    const [attempt] = await tx.insert(practiceAttempts).values({ userId: c.get("user").id, topicId: topic.id, totalCount: rows.length, correctCount: rows.filter((row) => row.answer === parsed.data.answers[row.id]).length }).returning({ id: practiceAttempts.id });
    await tx.insert(practiceAnswers).values(rows.map((row) => ({ attemptId: attempt.id, questionId: row.id, selectedAnswer: parsed.data.answers[row.id], isCorrect: row.answer === parsed.data.answers[row.id] ? 1 : 0 })));
    return attempt.id;
  });
  return c.json({ id }, 201);
});
app.get("/api/learner/results/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404);
  const [attempt] = await getDb().select({ id: practiceAttempts.id, topic: topics.name, slug: topics.slug, correct: practiceAttempts.correctCount, total: practiceAttempts.totalCount, submittedAt: practiceAttempts.submittedAt }).from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(and(eq(practiceAttempts.id, id.data), eq(practiceAttempts.userId, c.get("user").id)));
  if (!attempt) throw new HTTPException(404, { message: "Hasil tidak ditemukan." });
  const answers = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options, correctAnswer: questions.correctAnswer, explanation: questions.explanation, selectedAnswer: practiceAnswers.selectedAnswer, isCorrect: practiceAnswers.isCorrect })
    .from(practiceAnswers).innerJoin(questions, eq(practiceAnswers.questionId, questions.id)).where(eq(practiceAnswers.attemptId, attempt.id)).orderBy(questions.id);
  return c.json({ attempt: { ...attempt, submittedAt: attempt.submittedAt.toISOString() }, answers } satisfies Result);
});
app.get("/api/admin/questions", async (c) => {
  const parsed = bankQuerySchema.safeParse(c.req.query());
  if (!parsed.success) throw new HTTPException(400, { message: "Filter tidak valid." });
  const query = parsed.data;
  if (query.subtes && !utbkSubtests.some((subtest) => subtest.slug === query.subtes)) throw new HTTPException(404);
  const where = and(query.subtes ? eq(topics.slug, query.subtes) : undefined, query.kategori ? eq(questions.category, query.kategori) : undefined);
  const db = getDb();
  const [[total], categories, counts] = await Promise.all([
    db.select({ value: count() }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(where),
    db.selectDistinct({ category: questions.category }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(query.subtes ? eq(topics.slug, query.subtes) : undefined).orderBy(questions.category),
    catalog(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total.value / 15));
  const page = Math.min(query.halaman, pageCount);
  const rows = await db.select({ id: questions.id, prompt: questions.prompt, category: questions.category, topic: topics.name, source: questions.source }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(where).orderBy(topics.name, questions.id).limit(15).offset((page - 1) * 15);
  return c.json({ rows, total: total.value, page, pageCount, categories: categories.flatMap((row) => row.category ? [row.category] : []), tabs: [{ slug: "semua", name: "Semua", value: counts.reduce((sum, row) => sum + row.questionCount, 0) }, ...counts.map((row) => ({ slug: row.slug, name: row.name, value: row.questionCount }))] } satisfies Bank);
});
app.post("/api/admin/questions", async (c) => {
  const parsed = questionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Periksa isian soal, opsi, dan pembahasan." });
  const [topic] = await getDb().select({ slug: topics.slug }).from(topics).where(eq(topics.id, parsed.data.topicId));
  if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });
  const [created] = await getDb().insert(questions).values(parsed.data).returning({ id: questions.id });
  return c.json({ id: created.id, slug: topic.slug }, 201);
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
    const values = parsed.data.groups.flatMap((group) => group.questions.map((question) => ({ ...question, category: group.category, topicId: ids.get(group.subtes)! })));
    await tx.insert(questions).values(values);
    return values.length;
  });
  return c.json({ count: total }, 201);
});
app.get("/api/admin/questions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404);
  const [item] = await getDb().select({ id: questions.id, topicId: questions.topicId, prompt: questions.prompt, options: questions.options, correctAnswer: questions.correctAnswer, explanation: questions.explanation, category: questions.category, source: questions.source, topic: topics.name, slug: topics.slug }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(eq(questions.id, id.data));
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
    await tx.update(questions).set({ ...parsed.data, category: parsed.data.category ?? null }).where(eq(questions.id, id.data));
    return topic.slug;
  });
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
  return c.json({ count: deleted.length });
});
app.delete("/api/admin/questions/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(400);
  try {
    const deleted = await getDb().delete(questions).where(eq(questions.id, id.data)).returning({ id: questions.id });
    if (!deleted.length) throw new HTTPException(404);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    // FK database menolak penghapusan soal terpakai, termasuk race dengan submit.
    throw new HTTPException(409, { message: "Soal sudah digunakan atau tidak dapat dihapus." });
  }
  return c.json({ success: true });
});
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message || "Permintaan ditolak." }, error.status);
  console.error("API request failed:", error.name);
  return c.json({ error: "Operasi gagal. Coba lagi." }, 500);
});
