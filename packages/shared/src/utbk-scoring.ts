import { estimate2pl, type IrtEstimate, type IrtParameter } from "./irt";
import { utbkSubtests } from "./utbk-subtests";

export type SimulationItem = {
  questionId: string;
  revisionId: string;
  isAnswered: boolean;
  scoreFraction: number;
  maxPoints: number;
  timeSpentSeconds: number;
  irtEligible: boolean;
};
export type SectionCalibration = { id: string; version: string; parameters: IrtParameter[] };
export type SimulationSubtest = {
  slug: string;
  name: string;
  score: number;
  rawScore: number;
  maxPossibleRawScore: number;
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  unansweredCount: number;
  accuracy: number;
  averageTime: number;
  irt: (IrtEstimate & { calibrationId: string; version: string }) | null;
  irtStatus: "calibrated" | "unavailable" | "partial-credit" | "missing-items";
};
export type UtbkScoreReport = {
  version: "utbk-simulation-v1";
  method: "simulation" | "irt-2pl";
  complete: boolean;
  isCompleteUtbk: boolean;
  score: number;
  simulationScore: number;
  irtScore: number | null;
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  unansweredCount: number;
  accuracy: number;
  subtests: SimulationSubtest[];
};

export function scoreSimulationSubtest(
  slug: string,
  name: string,
  items: SimulationItem[],
  calibration?: SectionCalibration,
): SimulationSubtest {
  if (
    !items.length ||
    new Set(items.map((item) => item.questionId)).size !== items.length ||
    items.some(
      (item) =>
        !Number.isFinite(item.scoreFraction) ||
        item.scoreFraction < 0 ||
        item.scoreFraction > 1 ||
        !Number.isFinite(item.maxPoints) ||
        item.maxPoints <= 0 ||
        !Number.isFinite(item.timeSpentSeconds) ||
        item.timeSpentSeconds < 0 ||
        (!item.isAnswered && item.scoreFraction !== 0),
    )
  )
    throw new RangeError("Respons skor simulasi tidak valid.");
  const rawScore = items.reduce((n, item) => n + item.scoreFraction * item.maxPoints, 0);
  const maximum = items.reduce((n, item) => n + item.maxPoints, 0);
  const correctCount = items.filter((item) => item.isAnswered && item.scoreFraction === 1).length;
  const partialCount = items.filter(
    (item) => item.isAnswered && item.scoreFraction > 0 && item.scoreFraction < 1,
  ).length;
  const unansweredCount = items.filter((item) => !item.isAnswered).length;
  const parameters = new Map(calibration?.parameters.map((p) => [p.revisionId, p]));
  const irtStatus = !items.every((item) => item.irtEligible)
    ? "partial-credit"
    : !calibration
      ? "unavailable"
      : items.some((item) => !parameters.has(item.revisionId))
        ? "missing-items"
        : "calibrated";
  const irt =
    irtStatus === "calibrated" && calibration
      ? {
          ...estimate2pl(
            items.map((item) => ({
              ...parameters.get(item.revisionId)!,
              response: item.scoreFraction === 1 ? 1 : 0,
            })),
          ),
          calibrationId: calibration.id,
          version: calibration.version,
        }
      : null;
  return {
    slug,
    name,
    score: Math.round((rawScore / maximum) * 1000),
    rawScore,
    maxPossibleRawScore: maximum,
    totalCount: items.length,
    correctCount,
    partialCount,
    unansweredCount,
    incorrectCount: items.length - correctCount - partialCount - unansweredCount,
    accuracy: Math.round((correctCount / items.length) * 1000) / 10,
    averageTime: items.reduce((n, item) => n + item.timeSpentSeconds, 0) / items.length,
    irt,
    irtStatus,
  };
}

export function buildUtbkReport(
  subtests: SimulationSubtest[],
  expectedSubtests: number,
): UtbkScoreReport {
  const complete = subtests.length === expectedSubtests && expectedSubtests > 0;
  const isCompleteUtbk =
    complete &&
    subtests.length === 7 &&
    utbkSubtests.every((s) => subtests.some((t) => t.slug === s.slug));
  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((n, value) => n + value, 0) / values.length) : 0;
  const simulationScore = average(subtests.map((s) => s.score));
  const irtScore =
    isCompleteUtbk && subtests.every((s) => s.irt)
      ? average(subtests.map((s) => s.irt!.score))
      : null;
  const totalCount = subtests.reduce((n, s) => n + s.totalCount, 0);
  const correctCount = subtests.reduce((n, s) => n + s.correctCount, 0);
  return {
    version: "utbk-simulation-v1",
    method: irtScore === null ? "simulation" : "irt-2pl",
    complete,
    isCompleteUtbk,
    score: irtScore ?? simulationScore,
    simulationScore,
    irtScore,
    totalCount,
    correctCount,
    incorrectCount: subtests.reduce((n, s) => n + s.incorrectCount, 0),
    partialCount: subtests.reduce((n, s) => n + s.partialCount, 0),
    unansweredCount: subtests.reduce((n, s) => n + s.unansweredCount, 0),
    accuracy: totalCount ? Math.round((correctCount / totalCount) * 1000) / 10 : 0,
    subtests,
  };
}
