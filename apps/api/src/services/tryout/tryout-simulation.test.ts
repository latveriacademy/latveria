import { expect, it } from "vitest";
import { gradeTryoutQuestion } from "./tryout-simulation";
const question = {
  questionType: "true_false_group",
  correctAnswer: 0,
  scoringConfig: { mode: "per_statement" as const, points: 2 },
  statements: [
    { id: "a", text: "One", answer: true },
    { id: "b", text: "Two", answer: false },
  ],
};
it("grades object and serialized true-false drafts identically with partial credit", () => {
  expect(gradeTryoutQuestion(question, '{"a":true}')).toEqual(
    gradeTryoutQuestion(question, { a: true }),
  );
  expect(gradeTryoutQuestion(question, { a: true })).toMatchObject({
    scoreFraction: 0.5,
    maxPoints: 4,
    isAnswered: true,
    irtEligible: false,
  });
  expect(gradeTryoutQuestion(question, undefined)).toMatchObject({
    isAnswered: false,
    scoreFraction: 0,
  });
  expect(gradeTryoutQuestion(question, {})).toMatchObject({ isAnswered: false });
});
it("rejects unknown statements and invalid single-choice selections", () => {
  expect(() => gradeTryoutQuestion(question, { other: true })).toThrow("Pernyataan");
  expect(() => gradeTryoutQuestion(question, { a: "true" })).toThrow("Pernyataan");
  const single = { ...question, questionType: "single_choice", correctAnswer: 4 };
  expect(gradeTryoutQuestion(single, "E").scoreFraction).toBe(1);
  expect(() => gradeTryoutQuestion(single, 4.5)).toThrow("Pilihan");
});
