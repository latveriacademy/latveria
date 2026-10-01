import { describe, expect, it } from "vitest";
import { questionImportSchema, utbkSubtests } from "@latveria/shared";
import { isLegacyRoofQuestion, roofQuestionCorrectAnswer, roofQuestionExplanation, roofQuestionOptions, roofQuestionPrompt } from "./roof-question";

describe("seeded pyramid roof question", () => {
  it("matches only the legacy roof prompt with the broken math wrapper", () => {
    const old = String.raw`Atap limas segiempat beraturan memiliki alas persegi (sisi 8 m), tinggi 3 m, dan kebutuhan genteng. $$\begin{tikzpicture}[scale=.35]\draw(0,0)--cycle;\end{tikzpicture}$$`;
    expect(isLegacyRoofQuestion(old)).toBe(true);
    expect(isLegacyRoofQuestion("Tangki limas berkapasitas 40 liter")).toBe(false);
    expect(isLegacyRoofQuestion(String.raw`Atap limas memakai genteng. \begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}`)).toBe(false);
  });

  it("is a schema-valid question with a single-backslash diagram and correct tile calculation", () => {
    const question = { prompt: roofQuestionPrompt(), options: [...roofQuestionOptions], correctAnswer: roofQuestionCorrectAnswer, explanation: roofQuestionExplanation, source: "Contoh buatan tim" };
    const parsed = questionImportSchema.safeParse({ groups: [{ subtes: utbkSubtests.find((subtest) => subtest.slug === "penalaran-matematika")!.slug, category: "Bangun ruang", questions: [question] }] });
    expect(parsed.success).toBe(true);
    expect(question.prompt.length).toBeLessThanOrEqual(1000);
    expect(question.prompt).toContain(String.raw`\begin{tikzpicture}`);
    expect(question.prompt).not.toContain(String.raw`\\begin{tikzpicture}`);
    expect(question.options[question.correctAnswer]).toBe("1.200 genteng");
    expect(question.explanation).toContain(String.raw`\sqrt{3^2+4^2}=5`);
  });
});
