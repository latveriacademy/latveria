import { utbkSubtests, type Result } from "@latveria/shared";
import { practiceOptionKeys as letters } from "./practice-answers";

export function reviewResultToSession(result: Result) {
  if (!result.answers.length || result.answers.length !== result.attempt.total)
    throw new Error("Hasil sesi belum lengkap. Coba muat lagi.");
  const subtest = utbkSubtests.find((item) => item.slug === result.attempt.slug);
  const short = subtest?.short ?? "";
  const subjectId = short === "BI" ? "LBI" : short === "EN" ? "LBE" : short;
  const questions = result.answers.map((answer) => ({
    id: answer.id,
    question: answer.prompt,
    passage: answer.passage ?? null,
    options: answer.options.map((text, index) => ({ key: letters[index], text })),
    correctAnswer: letters[answer.correctAnswer],
    explanation: answer.explanation,
    annotations: answer.annotations ?? [],
  }));
  const answers = Object.fromEntries(
    result.answers.map((answer, index) => [index, letters[answer.selectedAnswer]]),
  );
  const accuracy = Math.round((result.attempt.correct / result.attempt.total) * 100);
  const results = {
    attemptId: result.attempt.id,
    score: result.attempt.score ?? accuracy,
    accuracy,
    correctCount: result.attempt.correct,
    incorrectCount: result.attempt.total - result.attempt.correct,
    unansweredCount: 0,
    earnedXP: null,
  };
  return {
    attemptId: result.attempt.id,
    subjectId,
    subjectSlug: result.attempt.slug,
    subjectName: result.attempt.topic,
    subjectCode: short ? `SNBT-${subjectId}` : "",
    packageId: result.attempt.packageId ?? null,
    packageName: result.attempt.packageName ?? null,
    scoreBreakdown: result.attempt.scoreBreakdown ?? null,
    mode: "Review",
    difficulty: "",
    totalQuestions: result.attempt.total,
    currentIndex: 0,
    questions,
    answers,
    flagged: {},
    isEvaluated: true,
    results,
  };
}
