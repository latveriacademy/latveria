import { expect, it } from "vitest";
import type { Result } from "@latveria/shared";
import { reviewResultToSession } from "./practice-review";

const result: Result = {
  attempt: {
    id: "attempt-1",
    topic: "Penalaran Umum",
    slug: "penalaran-umum",
    correct: 1,
    total: 2,
    submittedAt: "2026-10-01T03:00:00Z",
  },
  answers: [
    {
      id: "question-1",
      prompt: "Soal pertama",
      options: ["10", "20", "30", "40", "50"],
      correctAnswer: 0,
      selectedAnswer: 0,
      isCorrect: 1,
      explanation: "Pembahasan pertama",
    },
    {
      id: "question-2",
      prompt: "Soal kedua",
      options: ["A", "B", "C", "D", "E"],
      correctAnswer: 1,
      selectedAnswer: 2,
      isCorrect: 0,
      explanation: "Pembahasan kedua",
    },
  ],
};

it("reopens stored answers as an evaluated session, including answer index zero", () => {
  const session = reviewResultToSession(result);
  expect(session.isEvaluated).toBe(true);
  expect(session.answers).toEqual({ 0: "A", 1: "C" });
  expect(session.questions[0].correctAnswer).toBe("A");
  expect(session.questions[1].explanation).toBe("Pembahasan kedua");
  expect(session.results).toMatchObject({
    correctCount: 1,
    incorrectCount: 1,
    score: 50,
    earnedXP: null,
  });
});
it("maps English literacy to the existing practice renderer's subject code", () => {
  expect(
    reviewResultToSession({
      ...result,
      attempt: { ...result.attempt, slug: "literasi-bahasa-inggris" },
    }).subjectId,
  ).toBe("LBE");
});
it("rejects incomplete results rather than opening an empty review", () => {
  expect(() => reviewResultToSession({ ...result, answers: [] })).toThrow("belum lengkap");
  expect(() => reviewResultToSession({ ...result, answers: result.answers.slice(0, 1) })).toThrow(
    "belum lengkap",
  );
});
