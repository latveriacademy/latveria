import { expect, it } from "vitest";
import {
  bulkDeleteSchema,
  questionSchema,
  submissionSchema,
  questionImportSchema,
  questionReportSchema,
  questionReportReasons,
} from "./index";

it("rejects invalid answers and duplicate options at both trust boundaries", () => {
  expect(
    submissionSchema.safeParse({ answers: { "00000000-0000-4000-8000-000000000001": 0 } }).success,
  ).toBe(true);
  expect(
    submissionSchema.safeParse({ answers: { "00000000-0000-4000-8000-000000000001": 5 } }).success,
  ).toBe(false);
  expect(submissionSchema.safeParse({ answers: { bad: 1 } }).success).toBe(false);
  expect(
    questionSchema.safeParse({
      topicId: "00000000-0000-4000-8000-000000000001",
      prompt: "Pertanyaan",
      options: ["A", "A", "C", "D", "E"],
      correctAnswer: 0,
      explanation: "Penjelasan",
      source: "Dummy",
    }).success,
  ).toBe(false);
});

it("bounds bulk deletion and rejects duplicate identifiers", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  expect(bulkDeleteSchema.safeParse({ ids: [id] }).success).toBe(true);
  expect(bulkDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
  expect(bulkDeleteSchema.safeParse({ ids: [id, id] }).success).toBe(false);
  expect(
    bulkDeleteSchema.safeParse({
      ids: Array.from(
        { length: 101 },
        (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      ),
    }).success,
  ).toBe(false);
});

it("limits imports to 100 questions across all groups", () => {
  const question = {
    prompt: "Pertanyaan",
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 4,
    explanation: "Penjelasan",
    source: "Dummy",
  };
  const group = (count: number) => ({
    subtes: "pengetahuan-kuantitatif",
    category: "Aljabar",
    questions: Array.from({ length: count }, () => question),
  });
  expect(questionImportSchema.safeParse({ groups: [group(100)] }).success).toBe(true);
  expect(questionImportSchema.safeParse({ groups: [group(101)] }).success).toBe(false);
  expect(questionImportSchema.safeParse({ groups: [group(50), group(51)] }).success).toBe(false);
});

it("validates question report reasons and schema boundaries", () => {
  const validQuestionId = "00000000-0000-4000-8000-000000000001";
  for (const reason of questionReportReasons) {
    const res = questionReportSchema.safeParse({
      questionId: validQuestionId,
      reason,
      description: "Penjelasan masalah",
    });
    expect(res.success).toBe(true);
  }

  // Rejects invalid reason
  expect(
    questionReportSchema.safeParse({
      questionId: validQuestionId,
      reason: "Alasan tidak terdaftar",
    }).success,
  ).toBe(false);

  // Rejects invalid questionId
  expect(
    questionReportSchema.safeParse({
      questionId: "invalid-uuid",
      reason: questionReportReasons[0],
    }).success,
  ).toBe(false);

  // Accepts optional packageId (uuid or null or undefined)
  expect(
    questionReportSchema.safeParse({
      questionId: validQuestionId,
      packageId: "00000000-0000-4000-8000-000000000002",
      reason: questionReportReasons[0],
    }).success,
  ).toBe(true);
  expect(
    questionReportSchema.safeParse({
      questionId: validQuestionId,
      packageId: null,
      reason: questionReportReasons[0],
    }).success,
  ).toBe(true);
});
