import { count, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { OptionDistributionItem, QuestionPerformanceAnalytics } from "@latveria/shared";
import { getDb } from "../lib/db";
import { practiceAnswers, questions, questionReports } from "../lib/db/schema";

export async function getQuestionPerformanceAnalytics(
  questionId: string,
): Promise<QuestionPerformanceAnalytics> {
  const db = getDb();
  const [q] = await db
    .select({
      id: questions.id,
      difficulty: questions.difficulty,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });

  const [answers, [reportsRes]] = await Promise.all([
    db
      .select({
        selectedAnswer: practiceAnswers.selectedAnswer,
        isCorrect: practiceAnswers.isCorrect,
        timeSpentSeconds: practiceAnswers.timeSpentSeconds,
      })
      .from(practiceAnswers)
      .where(eq(practiceAnswers.questionId, questionId)),
    db
      .select({ value: count() })
      .from(questionReports)
      .where(eq(questionReports.questionId, questionId)),
  ]);

  const totalAttempts = answers.length;
  const reportsCount = Number(reportsRes?.value ?? 0);

  if (totalAttempts === 0) {
    return {
      questionId,
      totalAttempts: 0,
      correctCount: 0,
      accuracyPercentage: 0,
      isLowSample: true,
      medianTimeSeconds: 0,
      skipCount: 0,
      skipPercentage: 0,
      optionDistribution: (q.options ?? []).map((_, i) => ({
        optionIndex: i,
        label: String.fromCharCode(65 + i),
        count: 0,
        percentage: 0,
      })),
      empiricalDifficulty: "medium",
      configuredDifficulty: q.difficulty,
      reportsCount,
    };
  }

  const correctCount = answers.filter((a) => a.isCorrect === 1).length;
  const accuracyPercentage = Math.round((correctCount / totalAttempts) * 100);
  const skipCount = answers.filter((a) => a.selectedAnswer === -1).length;
  const skipPercentage = Math.round((skipCount / totalAttempts) * 100);

  // Median time calculation
  const times = answers
    .map((a) => a.timeSpentSeconds ?? 0)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  let medianTimeSeconds = 0;
  if (times.length > 0) {
    const mid = Math.floor(times.length / 2);
    medianTimeSeconds =
      times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
  }

  // Option distribution (A–E)
  const optionCounts = new Map<number, number>();
  for (const a of answers) {
    if (a.selectedAnswer >= 0 && a.selectedAnswer <= 4) {
      optionCounts.set(a.selectedAnswer, (optionCounts.get(a.selectedAnswer) ?? 0) + 1);
    }
  }

  const optionDistribution: OptionDistributionItem[] = (q.options ?? []).map((_, i) => {
    const optCount = optionCounts.get(i) ?? 0;
    return {
      optionIndex: i,
      label: String.fromCharCode(65 + i),
      count: optCount,
      percentage: totalAttempts > 0 ? Math.round((optCount / totalAttempts) * 100) : 0,
    };
  });

  // Empirical difficulty grading
  let empiricalDifficulty: QuestionPerformanceAnalytics["empiricalDifficulty"] = "medium";
  if (accuracyPercentage >= 80) empiricalDifficulty = "very_easy";
  else if (accuracyPercentage >= 60) empiricalDifficulty = "easy";
  else if (accuracyPercentage >= 40) empiricalDifficulty = "medium";
  else if (accuracyPercentage >= 20) empiricalDifficulty = "hard";
  else empiricalDifficulty = "very_hard";

  return {
    questionId,
    totalAttempts,
    correctCount,
    accuracyPercentage,
    isLowSample: totalAttempts < 5,
    medianTimeSeconds,
    skipCount,
    skipPercentage,
    optionDistribution,
    empiricalDifficulty,
    configuredDifficulty: q.difficulty,
    reportsCount,
  };
}
