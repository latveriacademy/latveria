import { describe, expect, it } from "vitest";
import {
  computeQuestionFingerprint,
  normalizeContentWhitespace,
  questionWorkflowStatusEnum,
  advancedSearchQuerySchema,
  bulkActionSchema,
} from "./question-intelligence";

describe("Question Intelligence Normalization & Fingerprint", () => {
  it("normalizes redundant whitespace without altering content", () => {
    const raw = "   Jika   f(x)  =  x^2 + 2x,   \n\n\n  maka f'(1) adalah...  ";
    const normalized = normalizeContentWhitespace(raw);
    expect(normalized).toBe("Jika f(x) = x^2 + 2x,\n\nmaka f'(1) adalah...");
  });

  it("produces identical fingerprints for identical question content despite spacing variations", () => {
    const q1 = {
      prompt: "Berapa nilai dari $2^3$?",
      options: ["2", "4", "6", "8", "10"],
      questionType: "single_choice",
    };
    const q2 = {
      prompt: "  Berapa   nilai  dari   $2^3$?  ",
      options: [" 2 ", " 4 ", " 6 ", " 8 ", " 10 "],
      questionType: "single_choice",
    };

    const fp1 = computeQuestionFingerprint(q1);
    const fp2 = computeQuestionFingerprint(q2);

    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64); // Valid sha256 hex
  });

  it("produces different fingerprints when options order differs", () => {
    const q1 = {
      prompt: "Berapa nilai dari $2^3$?",
      options: ["2", "4", "6", "8", "10"],
      questionType: "single_choice",
    };
    const q2 = {
      prompt: "Berapa nilai dari $2^3$?",
      options: ["10", "8", "6", "4", "2"], // Different order alters answer key
      questionType: "single_choice",
    };

    const fp1 = computeQuestionFingerprint(q1);
    const fp2 = computeQuestionFingerprint(q2);

    expect(fp1).not.toBe(fp2);
  });

  it("produces different fingerprints for different prompts", () => {
    const q1 = {
      prompt: "Nilai dari x adalah 1",
      options: ["A", "B", "C", "D", "E"],
    };
    const q2 = {
      prompt: "Nilai dari x adalah 2",
      options: ["A", "B", "C", "D", "E"],
    };

    expect(computeQuestionFingerprint(q1)).not.toBe(computeQuestionFingerprint(q2));
  });

  it("validates workflow statuses", () => {
    expect(questionWorkflowStatusEnum.safeParse("draft").success).toBe(true);
    expect(questionWorkflowStatusEnum.safeParse("in_review").success).toBe(true);
    expect(questionWorkflowStatusEnum.safeParse("approved").success).toBe(true);
    expect(questionWorkflowStatusEnum.safeParse("published").success).toBe(true);
    expect(questionWorkflowStatusEnum.safeParse("archived").success).toBe(true);
    expect(questionWorkflowStatusEnum.safeParse("invalid_status").success).toBe(false);
  });

  it("validates advanced search query defaults", () => {
    const parsed = advancedSearchQuerySchema.parse({
      subtes: "penalaran-umum",
      halaman: "2",
    });
    expect(parsed.subtes).toBe("penalaran-umum");
    expect(parsed.halaman).toBe(2);
    expect(parsed.sortBy).toBe("created_at");
    expect(parsed.sortOrder).toBe("desc");
    expect(parsed.limit).toBe(15);
  });

  it("validates bulk action schema", () => {
    const valid = bulkActionSchema.safeParse({
      questionIds: ["123e4567-e89b-12d3-a456-426614174000"],
      action: "set_status",
      payload: { status: "approved" },
    });
    expect(valid.success).toBe(true);
  });
});
