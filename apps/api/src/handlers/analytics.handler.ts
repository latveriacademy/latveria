import { Hono } from "hono";
import { getDb } from "../lib/db";
import { questions, topics, practiceAnswers } from "../lib/db/schema";
import { eq, sql, and, asc, desc } from "drizzle-orm";
import { pagination } from "../lib/admin-query";
import { HTTPException } from "hono/http-exception";

export const analyticsHandler = new Hono();

analyticsHandler.get("/api/admin/analytics/questions", async (c) => {
  const db = getDb();
  const { page, limit } = pagination(c.req.query());
  const subtest = c.req.query("subtest") ?? "";
  const sortBy = c.req.query("sort") ?? "accuracy";
  if (!["accuracy", "attempts", "correct"].includes(sortBy))
    throw new HTTPException(400, { message: "Urutan tidak valid." });

  const minAttempts = 10;

  // Get all questions with their answer counts
  const baseQuery = db
    .select({
      questionId: questions.id,
      topicSlug: topics.slug,
      topicName: topics.name,
      prompt: questions.prompt,
      answersCount: sql<number>`count(${practiceAnswers.id})`.as("answers_count"),
      correctCount:
        sql<number>`sum(case when ${practiceAnswers.isCorrect} = 1 then 1 else 0 end)`.as(
          "correct_count",
        ),
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(practiceAnswers, eq(practiceAnswers.questionId, questions.id))
    .where(and(subtest ? eq(topics.slug, subtest) : undefined))
    .groupBy(questions.id, topics.slug, topics.name, questions.prompt)
    .having(sql`count(${practiceAnswers.id}) >= ${minAttempts}`);

  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(baseQuery.as("stats"));
  const total = Number(totalRow.count);
  const order =
    sortBy === "attempts"
      ? desc(sql`count(${practiceAnswers.id})`)
      : sortBy === "correct"
        ? desc(sql`sum(${practiceAnswers.isCorrect})`)
        : asc(sql`sum(${practiceAnswers.isCorrect})::numeric / count(${practiceAnswers.id})`);
  const paginatedQuestions = await baseQuery
    .orderBy(order, asc(questions.id))
    .limit(limit)
    .offset((page - 1) * limit);

  const rows = paginatedQuestions.map((q) => {
    const answersCount = Number(q.answersCount ?? 0);
    const correctCount = Number(q.correctCount ?? 0);
    const correctRate = answersCount > 0 ? Math.round((correctCount / answersCount) * 100) : 0;
    // Questions need review if accuracy is < 30% or > 90%
    const needsReview = correctRate < 30 || correctRate > 90;

    return {
      questionId: q.questionId,
      topicSlug: q.topicSlug,
      topicName: q.topicName,
      prompt: q.prompt ?? "",
      attempts: answersCount,
      correctCount,
      correctRate,
      needsReview,
    };
  });

  return c.json({
    rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    },
    minAttempts,
  });
});
