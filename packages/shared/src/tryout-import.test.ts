import { expect, it } from "vitest";
import { normalizeTryoutImport } from "./tryout-import";
const question = {
  prompt: "Pertanyaan contoh",
  options: ["1", "2", "3", "4", "5"],
  correctAnswer: 4,
  explanation: "Penjelasan contoh",
  source: "Contoh",
};
const slug = "penalaran-umum";
it("accepts the Bank soal group format and preserves five options", () => {
  const parsed = normalizeTryoutImport(
    {
      groups: [
        {
          subtes: slug,
          packageName: "Ignored destination",
          category: "Materi",
          questions: [question],
        },
      ],
    },
    slug,
  );
  expect(parsed.groups[0].questions[0]).toMatchObject({ type: "single_choice", correctAnswer: 4 });
  expect(parsed.groups[0]).not.toHaveProperty("packageName");
});
it("normalizes legacy questions and rejects mismatched destinations", () => {
  expect(normalizeTryoutImport({ questions: [question] }, slug).groups[0].subtes).toBe(slug);
  expect(() => normalizeTryoutImport({ subtest: "EN", questions: [question] }, slug)).toThrow(
    "subtes tujuan",
  );
  expect(() => normalizeTryoutImport({ questions: [question] })).toThrow("Pilih subtes");
});
it("applies the 100-question limit across groups", () => {
  expect(() =>
    normalizeTryoutImport({
      groups: [50, 51].map((n) => ({ subtes: slug, questions: Array(n).fill(question) })),
    }),
  ).toThrow("100 soal");
});
it("allows Bank batches with multiple categories and rejects duplicate statement identifiers", () => {
  expect(
    normalizeTryoutImport({
      groups: Array.from({ length: 8 }, () => ({ subtes: slug, questions: [question] })),
    }).groups,
  ).toHaveLength(8);
  const invalid = {
    type: "true_false_group",
    prompt: "Complex question",
    statements: [
      { id: "same", text: "One", answer: true },
      { id: "same", text: "Two", answer: false },
    ],
  };
  expect(() => normalizeTryoutImport({ questions: [invalid] }, slug)).toThrow("unik");
});
