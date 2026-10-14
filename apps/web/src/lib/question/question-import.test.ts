import { describe, expect, it } from "vitest";
import { lexiconImportExample, packageImportExample, parseQuestionImport } from "./question-import";
import { parseTikz } from "../math/tikz";
import { geometryImportExample } from "../math/tikz-examples";
import { cylinderTankQuestion, openCuboidQuestion, pyramidQuestion } from "@latveria/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { MathFormula } from "../../components/math/math-formula";
import { mathImportExample, mathNotationExamples } from "../math/math-import-examples";

const group = {
  subtes: "pengetahuan-kuantitatif",
  category: "Persentase",
  questions: [
    {
      prompt: "Berapakah seperempat dari 80?",
      options: ["10", "15", "20", "25", "30"],
      correctAnswer: 2,
      explanation: "Seperempat dari 80 adalah 20.",
      source: "Contoh buatan tim",
    },
  ],
};

describe("parseQuestionImport", () => {
  it("round-trips math examples through JSON and renders every formula without fallback", () => {
    const text = JSON.stringify(mathImportExample);
    const data = parseQuestionImport(text);
    expect(data.groups[0].questions).toHaveLength(6);
    expect(data.groups[0].questions[0].prompt).toBe(
      String.raw`Nilai $\displaystyle \lim_{x \to 2^+} \frac{3}{x-2}$ adalah ...`,
    );
    expect(text).toContain(String.raw`\\displaystyle \\lim`);
    for (const example of mathNotationExamples) {
      const formulas = [example.prompt, ...example.options, example.explanation].flatMap(
        (source) => source.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g) ?? [],
      );
      expect(formulas.length).toBeGreaterThan(0);
      for (const formula of formulas) {
        const display = formula.startsWith("$$");
        const source = formula.slice(display ? 2 : 1, display ? -2 : -1);
        const html = renderToStaticMarkup(MathFormula({ source, displayMode: display }));
        expect(html).toContain("katex");
        expect(html).not.toContain("math-error");
      }
    }
  });
  it("ships a valid named-package example with the correct answer index", () => {
    const data = parseQuestionImport(JSON.stringify(packageImportExample));
    expect(data.groups[0].packageName).toBe("Paket Persentase");
    const question = data.groups[0].questions[0];
    expect(question.options[question.correctAnswer]).toBe("20");
  });
  it("accepts the same JSON text whether pasted or read from a file", () => {
    const data = { groups: [group] };
    expect(parseQuestionImport(JSON.stringify(data))).toEqual({
      groups: [
        {
          ...group,
          questions: group.questions.map((question) => ({ ...question, annotations: [] })),
        },
      ],
    });
  });
  it("ships a valid importable pyramid question with renderer-compatible TikZ under the prompt limit", () => {
    const batch = parseQuestionImport(JSON.stringify(geometryImportExample));
    expect(batch.groups[0].questions).toHaveLength(3);
    expect(batch.groups[0].questions.map((question) => question.prompt)).toEqual([
      pyramidQuestion.prompt,
      openCuboidQuestion.prompt,
      cylinderTankQuestion.prompt,
    ]);
    for (const question of batch.groups[0].questions) {
      const diagram = question.prompt.match(
        /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/,
      )?.[0];
      expect(question.prompt.length).toBeLessThanOrEqual(1000);
      expect(diagram).toBeTruthy();
      expect(parseTikz(diagram!).shapes.length).toBeGreaterThan(0);
    }
    expect(batch.groups[0].questions[0].options[batch.groups[0].questions[0].correctAnswer]).toBe(
      "1.200 genteng",
    );
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
    expect(() =>
      parseQuestionImport(JSON.stringify({ groups: [group, { ...group, subtes: "unknown" }] })),
    ).toThrow("grup 2");
  });
  it("identifies the question containing invalid options", () => {
    const invalid = {
      ...group,
      questions: [
        group.questions[0],
        { ...group.questions[0], options: ["A", "A", "B", "C", "D"] },
      ],
    };
    expect(() => parseQuestionImport(JSON.stringify({ groups: [invalid] }))).toThrow(
      "grup 1, soal 2",
    );
  });
  it("accepts a named package or an existing package ID on a group", () => {
    const packageId = "00000000-0000-4000-8000-000000000001";
    expect(
      parseQuestionImport(
        JSON.stringify({ groups: [{ ...group, packageName: " Paket Persentase " }] }),
      ).groups[0].packageName,
    ).toBe("Paket Persentase");
    expect(
      parseQuestionImport(JSON.stringify({ groups: [{ ...group, packageId }] })).groups[0]
        .packageId,
    ).toBe(packageId);
    expect(() =>
      parseQuestionImport(
        JSON.stringify({ groups: [{ ...group, packageId, packageName: "Paket 2" }] }),
      ),
    ).toThrow("jangan keduanya");
    expect(() =>
      parseQuestionImport(
        JSON.stringify({
          groups: [{ ...group, questions: [{ ...group.questions[0], packageId }] }],
        }),
      ),
    ).toThrow("bukan pada tiap soal");
  });
  it("ships a valid importable lexicon example with auto-resolved annotations", () => {
    const data = parseQuestionImport(JSON.stringify(lexiconImportExample));
    expect(data.groups[0].subtes).toBe("literasi-bahasa-inggris");
    const annotations = data.groups[0].questions[0].annotations!;
    expect(annotations).toHaveLength(2);
    expect(annotations[0].term).toBe("hegemony");
    expect(annotations[0].start).toBe(9);
    expect(annotations[0].end).toBe(17);
  });
});
