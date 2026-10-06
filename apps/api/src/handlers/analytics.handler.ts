import { Hono } from "hono";
import { getDb } from "../lib/db";
import { questions, topics, practiceAnswers, practiceAttempts } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const analyticsHandler = new Hono();

analyticsHandler.get("/api/admin/analytics/questions", async (c) => {
  const db = getDb();
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const subtest = c.req.query("subtest") ?? "";
  const sortBy = c.req.query("sort") ?? "accuracy";

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
    .leftJoin(practiceAttempts, sql`1=1`)
    .leftJoin(practiceAnswers, eq(practiceAnswers.attemptId, practiceAttempts.id))
    .groupBy(questions.id, topics.slug, topics.name, questions.prompt)
    .having(sql`count(${practiceAnswers.id}) >= ${minAttempts}`);

  // Get all questions first
  const allQuestions = await baseQuery;

  // Filter by subtest if specified
  const filteredQuestions = subtest
    ? allQuestions.filter((q) => q.topicSlug === subtest)
    : allQuestions;

  // Sort
  filteredQuestions.sort((a, b) => {
    const rateA = Number(a.answersCount) > 0 ? Number(a.correctCount) / Number(a.answersCount) : 1;
    const rateB = Number(b.answersCount) > 0 ? Number(b.correctCount) / Number(b.answersCount) : 1;

    switch (sortBy) {
      case "attempts":
        return Number(b.answersCount) - Number(a.answersCount);
      case "correct":
        return Number(b.correctCount) - Number(a.correctCount);
      case "accuracy":
      default:
        return rateA - rateB;
    }
  });

  const total = filteredQuestions.length;

  // Paginate
  const offset = (page - 1) * limit;
  const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);

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
