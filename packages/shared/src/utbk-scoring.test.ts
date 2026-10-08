import { expect, it } from "vitest";
import { scoreSimulationSubtest, buildUtbkReport, type SimulationItem } from "./utbk-scoring";
import { utbkSubtests } from "./utbk-subtests";
import { estimate2pl } from "./irt";
const item: SimulationItem = {
  questionId: "q",
  revisionId: "r",
  isAnswered: true,
  scoreFraction: 1,
  maxPoints: 1,
  timeSpentSeconds: 60,
  irtEligible: true,
};
it("uses points without time bonuses and separates wrong, partial, and empty answers", () => {
  expect(scoreSimulationSubtest("PU", "PU", [item]).score).toBe(1000);
  expect(scoreSimulationSubtest("PU", "PU", [{ ...item, timeSpentSeconds: 600 }]).score).toBe(1000);
  const result = scoreSimulationSubtest("PU", "PU", [
    item,
    { ...item, questionId: "q2", scoreFraction: 0 },
    { ...item, questionId: "q3", scoreFraction: 0.5, irtEligible: false },
    { ...item, questionId: "q4", scoreFraction: 0, isAnswered: false },
  ]);
  expect(result).toMatchObject({
    score: 375,
    correctCount: 1,
    incorrectCount: 1,
    partialCount: 1,
    unansweredCount: 1,
    irt: null,
  });
});
it("averages subtest scores equally rather than weighting their question counts", () => {
  const sections = utbkSubtests.map((s, index) =>
    scoreSimulationSubtest(
      s.slug,
      s.name,
      Array.from({ length: index + 1 }, (_, n) => ({
        ...item,
        questionId: `q${n}`,
        scoreFraction: index === 0 ? 1 : 0,
      })),
    ),
  );
  expect(buildUtbkReport(sections, 7)).toMatchObject({
    score: 143,
    isCompleteUtbk: true,
    irtScore: null,
  });
  expect(buildUtbkReport(sections.slice(0, 2), 7).isCompleteUtbk).toBe(false);
});
it("estimates stable EAP abilities and treats calibration as mandatory", () => {
  expect(estimate2pl([{ a: 1, b: 0, response: 1 }]).theta).toBeCloseTo(0.41324193, 5);
  const correct = estimate2pl(
    Array.from({ length: 100 }, () => ({ a: 1, b: 0, response: 1 as const })),
  );
  const wrong = estimate2pl(
    Array.from({ length: 100 }, () => ({ a: 1, b: 0, response: 0 as const })),
  );
  expect(correct.theta).toBeGreaterThan(0);
  expect(correct.theta).toBeCloseTo(-wrong.theta, 6);
  expect(correct.standardError).toBeGreaterThan(0);
  expect(scoreSimulationSubtest("PU", "PU", [item]).irt).toBeNull();
  expect(
    scoreSimulationSubtest("PU", "PU", [item], {
      id: "model",
      version: "v1",
      parameters: [{ revisionId: "r", a: 1, b: 0 }],
    }).irt?.theta,
  ).toBeCloseTo(0.41324193, 5);
});
it("uses response-pattern likelihood rather than a sum of difficulty weights", () => {
  const first = estimate2pl([
    { a: 0.5, b: 0, response: 1 },
    { a: 2, b: 0, response: 0 },
  ]);
  const second = estimate2pl([
    { a: 0.5, b: 0, response: 0 },
    { a: 2, b: 0, response: 1 },
  ]);
  expect(second.theta).toBeGreaterThan(first.theta);
  expect(() => estimate2pl([{ a: 0, b: 0, response: 1 }])).toThrow("IRT");
});
