import { expect, it } from "vitest";
import { questionSchema, questionImportSchema } from "./index";
import { lexiconAnnotationSchema, mathSourcePattern, validLexiconRanges } from "./lexicon";

const prompt = "The phone was fried. The egg was fried.";
const annotation = lexiconAnnotationSchema.parse({
  id: "00000000-0000-4000-8000-000000000099",
  term: "fried",
  start: 14,
  end: 19,
  definition: "Rusak akibat panas atau korsleting.",
  partOfSpeech: "adjective",
  context: "The phone was fried.",
});
const question = {
  topicId: "00000000-0000-4000-8000-000000000001",
  prompt,
  options: ["A", "B", "C", "D", "E"],
  correctAnswer: 0,
  explanation: "Penjelasan soal",
  source: "Contoh tim",
  annotations: [annotation],
};

it("keeps matching nested diagrams and bare tables intact without shifting text offsets", () => {
  for (const source of [
    String.raw`\begin{tikzpicture}\begin{axis}\addplot {x^2};\end{axis}\end{tikzpicture}`,
    String.raw`\begin{array}{cc}A & B \\ 1 & 2\end{array}`,
    String.raw`\begin{tabular}{cc}A & B\end{tabular}`,
    String.raw`\[x^2\]`,
  ]) {
    const text = `Before ${source} fried`;
    expect(text.split(mathSourcePattern)).toEqual(["Before ", source, " fried"]);
    expect(
      validLexiconRanges(text, [{ ...annotation, start: text.length - 5, end: text.length }]),
    ).toBe(true);
  }
});

it("validates exact contextual ranges, duplicates, overlap, and stale offsets", () => {
  expect(questionSchema.safeParse(question).success).toBe(true);
  expect(validLexiconRanges(prompt, [annotation, annotation])).toBe(false);
  expect(validLexiconRanges(prompt, [{ ...annotation, start: 15 }])).toBe(false);
  expect(
    validLexiconRanges(prompt, [
      annotation,
      { ...annotation, id: crypto.randomUUID(), term: "was fried", start: 10, end: 19 },
    ]),
  ).toBe(false);
  expect(
    questionSchema.safeParse({ ...question, annotations: [{ ...annotation, definition: "" }] })
      .success,
  ).toBe(false);
});

it("rejects annotations inside math and TikZ but allows neighboring plain text", () => {
  expect(validLexiconRanges("$fried$", [{ ...annotation, start: 1, end: 6 }])).toBe(false);
  const diagram = "\\begin{tikzpicture}fried\\end{tikzpicture}";
  const start = diagram.indexOf("fried");
  expect(validLexiconRanges(diagram, [{ ...annotation, start, end: start + 5 }])).toBe(false);
  expect(validLexiconRanges("$x$ fried", [{ ...annotation, start: 4, end: 9 }])).toBe(true);
});

it("accepts annotated imports and preserves compatibility with existing questions", () => {
  const item = { ...question, topicId: undefined };
  expect(
    questionImportSchema.safeParse({
      groups: [{ subtes: "literasi-bahasa-inggris", category: "Vocabulary", questions: [item] }],
    }).success,
  ).toBe(true);
  expect(questionSchema.parse({ ...question, annotations: undefined }).annotations).toEqual([]);
  const full = lexiconAnnotationSchema.parse({
    ...annotation,
    phonetic: "/fraɪd/",
    etymology: "From Old English frygan",
  });
  expect(full.phonetic).toBe("/fraɪd/");
  expect(full.etymology).toBe("From Old English frygan");

  // Auto-resolution when id, start, end, context are omitted in JSON import
  const minimalImport = {
    groups: [
      {
        subtes: "literasi-bahasa-inggris",
        category: "Generated",
        questions: [
          {
            prompt: "National sovereignty requires civic responsibility.",
            options: ["A", "B", "C", "D", "E"],
            correctAnswer: 0,
            explanation: "Pembahasan",
            source: "AI Import",
            annotations: [
              {
                term: "sovereignty",
                definition: "Kedaulatan",
                partOfSpeech: "noun",
              },
              {
                term: "responsibility",
                definition: "Tanggung jawab",
                partOfSpeech: "noun",
              },
            ],
          },
        ],
      },
    ],
  };
  const parsed = questionImportSchema.parse(minimalImport);
  const q = parsed.groups[0].questions[0];
  expect(q.annotations).toHaveLength(2);
  expect(q.annotations[0].term).toBe("sovereignty");
  expect(q.annotations[0].start).toBe(9);
  expect(q.annotations[0].end).toBe(20);
  expect(q.annotations[0].id).toBeDefined();
  expect(q.annotations[1].term).toBe("responsibility");
  expect(q.annotations[1].start).toBe(36);
  expect(q.annotations[1].end).toBe(50);
});
