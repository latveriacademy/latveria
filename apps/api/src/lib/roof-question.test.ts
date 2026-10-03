import { describe, expect, it } from "vitest";
import {
  cylinderTankQuestion,
  openCuboidQuestion,
  pyramidQuestion,
  questionImportSchema,
  utbkSubtests,
} from "@latveria/shared";
import {
  geometryQuestionData,
  isLegacyCylinderTankQuestion,
  isLegacyOpenCuboidQuestion,
  isLegacyRoofQuestion,
} from "./roof-question";

describe("seeded geometry questions", () => {
  it("matches only the three legacy diagrams to their replacements", () => {
    const oldPyramid = String.raw`Atap limas segiempat bersisi 8 m membutuhkan genteng. $$\begin{tikzpicture}[scale=.35]...\end{tikzpicture}$$`;
    const oldBox = String.raw`Nipon membuat wadah dengan isolator. \begin{tikzpicture}[scale=.8]...\end{tikzpicture}`;
    const oldTank = String.raw`Tangki Dumai 154 m3. \begin{tikzpicture}[scale=.7]...\end{tikzpicture}`;
    expect(isLegacyRoofQuestion(oldPyramid)).toBe(true);
    expect(isLegacyOpenCuboidQuestion(oldBox)).toBe(true);
    expect(isLegacyCylinderTankQuestion(oldTank)).toBe(true);
    expect(geometryQuestionData(oldPyramid)).toBe(pyramidQuestion);
    expect(geometryQuestionData(oldBox)).toBe(openCuboidQuestion);
    expect(geometryQuestionData(oldTank)).toBe(cylinderTankQuestion);
    expect(geometryQuestionData("Tangki air 154 liter")).toBeNull();
  });

  it("keeps every replacement renderer-compatible and import-valid under prompt limits", () => {
    const questions = [pyramidQuestion, openCuboidQuestion, cylinderTankQuestion];
    const parsed = questionImportSchema.safeParse({
      groups: [
        {
          subtes: utbkSubtests.find((subtest) => subtest.slug === "penalaran-matematika")!.slug,
          category: "Bangun ruang",
          questions,
        },
      ],
    });
    expect(parsed.success).toBe(true);
    for (const question of questions) {
      expect(question.prompt.length).toBeLessThanOrEqual(1000);
      expect(question.prompt).toContain(String.raw`\begin{tikzpicture}`);
      expect(question.prompt).not.toContain(String.raw`$$\begin{tikzpicture}`);
    }
    expect(pyramidQuestion.options[pyramidQuestion.correctAnswer]).toBe("1.200 genteng");
    expect(openCuboidQuestion.options[openCuboidQuestion.correctAnswer]).toBe("Rp275.000,00");
    expect(cylinderTankQuestion.options[cylinderTankQuestion.correctAnswer]).toBe("6 jam");
    expect(cylinderTankQuestion.prompt).toContain(String.raw`\frac{3}{5}`);
    expect(cylinderTankQuestion.prompt).not.toContain(String.raw`\frac35`);
  });
});
