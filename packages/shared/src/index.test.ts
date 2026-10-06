import { expect, it } from "vitest";
import { bulkDeleteSchema, questionSchema, submissionSchema } from "./index";

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
