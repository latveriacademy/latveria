import { expect, it } from "vitest";
import { questionSchema } from "./index";

it("accepts prompts up to 5000 characters and passages up to 10000 characters", () => {
  const base = {
    topicId: "00000000-0000-4000-8000-000000000001",
    prompt: "A".repeat(4500),
    passage: "Story ".repeat(1500), // ~9000 chars
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 0,
    explanation: "Penjelasan lengkap",
    source: "UTBK 2026",
  };
  expect(questionSchema.safeParse(base).success).toBe(true);
});

it("rejects prompt exceeding 5000 characters and passage exceeding 10000 characters", () => {
  const tooLongPrompt = {
    topicId: "00000000-0000-4000-8000-000000000001",
    prompt: "A".repeat(5001),
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 0,
    explanation: "Penjelasan",
    source: "UTBK 2026",
  };
  expect(questionSchema.safeParse(tooLongPrompt).success).toBe(false);

  const tooLongPassage = {
    topicId: "00000000-0000-4000-8000-000000000001",
    prompt: "Pertanyaan cerita",
    passage: "A".repeat(10001),
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 0,
    explanation: "Penjelasan",
    source: "UTBK 2026",
  };
  expect(questionSchema.safeParse(tooLongPassage).success).toBe(false);
});

it("accepts passageId referencing a parent question for reusable text", () => {
  const reusable = {
    topicId: "00000000-0000-4000-8000-000000000001",
    prompt: "Berdasarkan wacana pada soal pertama, apa simpulan paragraf kedua?",
    passageId: "00000000-0000-4000-8000-000000000099",
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 1,
    explanation: "Penjelasan",
    source: "UTBK 2026",
  };
  const parsed = questionSchema.safeParse(reusable);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.passageId).toBe("00000000-0000-4000-8000-000000000099");
  }
});
