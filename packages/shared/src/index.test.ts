import { expect, it } from "vitest";
import { questionSchema, submissionSchema } from "./index";

it("rejects invalid answers and duplicate options at both trust boundaries", () => {
  expect(submissionSchema.safeParse({ answers: { "00000000-0000-4000-8000-000000000001": 0 } }).success).toBe(true);
  expect(submissionSchema.safeParse({ answers: { "00000000-0000-4000-8000-000000000001": 4 } }).success).toBe(false);
  expect(submissionSchema.safeParse({ answers: { bad: 1 } }).success).toBe(false);
  expect(questionSchema.safeParse({ topicId: "00000000-0000-4000-8000-000000000001", prompt: "Pertanyaan", options: ["A", "A", "C", "D"], correctAnswer: 0, explanation: "Penjelasan", source: "Dummy" }).success).toBe(false);
});
