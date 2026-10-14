import { expect, it } from "vitest";
import { practiceAnswersToPayload } from "./practice-answers";

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: `question-${index}`,
  options: ["Satu", "Dua", "Tiga", "Empat", "Lima"],
}));

it("submits every A–E choice by question ID, including the fifth option", () => {
  expect(practiceAnswersToPayload(questions, { 0: "A", 1: "B", 2: "C", 3: "D", 4: "E" })).toEqual({
    "question-0": 0,
    "question-1": 1,
    "question-2": 2,
    "question-3": 3,
    "question-4": 4,
  });
});

it("rejects missing answers and choices outside the actual question options", () => {
  expect(practiceAnswersToPayload(questions, { 0: "A" })).toBeNull();
  expect(practiceAnswersToPayload([questions[0]], { 0: "F" })).toBeNull();
  expect(
    practiceAnswersToPayload([{ ...questions[0], options: ["A", "B", "C", "D"] }], { 0: "E" }),
  ).toBeNull();
});
