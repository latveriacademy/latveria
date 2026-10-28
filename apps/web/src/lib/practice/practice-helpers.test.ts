import { describe, expect, it } from "vitest";
import {
  apiQuestionToView,
  buildSessionResults,
  formatRecentActivities,
  mergeReviewData,
  topicToSubject,
} from "./practice-helpers";

describe("practice-helpers", () => {
  it("converts api topic to subject catalog shape", () => {
    const subject = topicToSubject({
      id: "uuid-1",
      slug: "penalaran-umum",
      name: "Penalaran Umum",
      questionCount: 20,
      packageCount: 2,
    });
    expect(subject.id).toBe("PU");
    expect(subject.name).toBe("Penalaran Umum");
    expect(subject.code).toBe("LTV-PU");
    expect(subject.category).toBe("Tes Skolastik");
    expect(subject.packageCount).toBe(2);
  });

  it("converts api question to view question shape", () => {
    const viewQ = apiQuestionToView({
      id: "q-1",
      prompt: "Berapa 1 + 1?",
      options: ["1", "2", "3", "4", "5"],
    });
    expect(viewQ.id).toBe("q-1");
    expect(viewQ.options[1]).toEqual({ key: "B", text: "2" });
    expect(viewQ.correctAnswer).toBeNull();
  });

  it("merges review data into session questions", () => {
    const sessionQuestions = [
      { id: "q-1", question: "Prompt 1", options: [] },
      { id: "q-2", question: "Prompt 2", options: [] },
    ];
    const reviewAnswers = [
      { id: "q-1", correctAnswer: 1, explanation: "Penjelasan 1" },
      { id: "q-2", correctAnswer: 3, explanation: "Penjelasan 2" },
    ];
    const merged = mergeReviewData(sessionQuestions, reviewAnswers);
    expect(merged[0].correctAnswer).toBe("B");
    expect(merged[0].explanation).toBe("Penjelasan 1");
    expect(merged[1].correctAnswer).toBe("D");
  });

  it("formats recent activities properly", () => {
    const activities = formatRecentActivities([
      {
        id: "a-1",
        slug: "penalaran-umum",
        topic: "Penalaran Umum",
        total: 10,
        correct: 8,
        submittedAt: "2026-10-28T12:00:00Z",
      },
    ]);
    expect(activities.length).toBe(1);
    expect(activities[0].code).toBe("PU");
    expect(activities[0].accuracy).toBe("80%");
  });

  it("builds session results correctly", () => {
    const activeSession = {
      subjectId: "PU",
      subjectName: "Penalaran Umum",
      subjectCode: "LTV-PU",
      mode: "Practice",
      difficulty: "Medium",
      totalQuestions: 2,
      questions: [{ id: "q-1" }, { id: "q-2" }],
      answers: { 0: "B", 1: "A" },
    };
    const reviewData = {
      attempt: { earnedXP: 20 },
      answers: [
        { id: "q-1", correctAnswer: 1 }, // "B" -> correct
        { id: "q-2", correctAnswer: 2 }, // "C" -> incorrect
      ],
    };
    const results = buildSessionResults({
      activeSession,
      reviewData,
      enrichedQuestions: [],
      attemptId: "att-1",
    });
    expect(results.correctCount).toBe(1);
    expect(results.incorrectCount).toBe(1);
    expect(results.accuracy).toBe(50);
    expect(results.earnedXP).toBe(20);
  });
});
