import { describe, expect, it } from "vitest";
import { parseQuestionImport } from "./question-import";
import { parseTikz } from "./tikz";
import { geometryImportExample } from "./tikz-examples";
import { cylinderTankQuestion, openCuboidQuestion, pyramidQuestion } from "@latveria/shared";

const group = {
  subtes: "pengetahuan-kuantitatif",
  category: "Persentase",
  questions: [{ prompt: "Berapakah seperempat dari 80?", options: ["10", "15", "20", "25"], correctAnswer: 2, explanation: "Seperempat dari 80 adalah 20.", source: "Contoh buatan tim" }],
};

describe("parseQuestionImport", () => {
  it("accepts the same JSON text whether pasted or read from a file", () => {
    const data = { groups: [group] };
    expect(parseQuestionImport(JSON.stringify(data))).toEqual(data);
  });
  it("ships a valid importable pyramid question with renderer-compatible TikZ under the prompt limit", () => {
    const batch = parseQuestionImport(JSON.stringify(geometryImportExample));
    expect(batch.groups[0].questions).toHaveLength(3);
    expect(batch.groups[0].questions.map((question) => question.prompt)).toEqual([pyramidQuestion.prompt, openCuboidQuestion.prompt, cylinderTankQuestion.prompt]);
    for (const question of batch.groups[0].questions) {
      const diagram = question.prompt.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/)?.[0];
      expect(question.prompt.length).toBeLessThanOrEqual(1000);
      expect(diagram).toBeTruthy();
      expect(parseTikz(diagram!).shapes.length).toBeGreaterThan(0);
    }
    expect(batch.groups[0].questions[0].options[batch.groups[0].questions[0].correctAnswer]).toBe("1.200 genteng");
  });
  it.each(["", "{oops}"])("rejects empty or malformed input: %s", (text) => {
    expect(() => parseQuestionImport(text)).toThrow();
  });
  it("measures the UTF-8 byte limit rather than character count", () => {
    const text = JSON.stringify({ padding: "é".repeat(100_000) });
    expect(text.length).toBeLessThan(200_000);
    expect(() => parseQuestionImport(text)).toThrow("200 KB");
  });
  it("identifies the group for an unknown subtest", () => {
    expect(() => parseQuestionImport(JSON.stringify({ groups: [group, { ...group, subtes: "unknown" }] }))).toThrow("grup 2");
  });
  it("identifies the question containing invalid options", () => {
    const invalid = { ...group, questions: [group.questions[0], { ...group.questions[0], options: ["A", "A", "B", "C"] }] };
    expect(() => parseQuestionImport(JSON.stringify({ groups: [invalid] }))).toThrow("grup 1, soal 2");
  });
});
