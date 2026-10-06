export interface ScoringItemInput {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
  itemWeight?: number;
  scoreFraction?: number;
  stats?: {
    totalAttempts: number;
    correctAttempts: number;
    medianSeconds?: number;
  };
}

export interface ItemScoreBreakdown {
  questionId: string;
  isCorrect: boolean;
  scoreFraction?: number;
  timeSpentSeconds: number;
  itemWeight: number;
  timeFactor: number;
  itemScore: number;
}

export interface LatveriaScoreResult {
  score: number; // 0 - 1000
  rawScore: number;
  maxPossibleRawScore: number;
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number; // 0 - 100%
  averageTime: number; // seconds
  performanceIndex: number; // 0 - 100
  itemBreakdowns: ItemScoreBreakdown[];
}

export function calculateLatveriaScore(
  items: ScoringItemInput[],
  standardTimeSeconds = 90,
): LatveriaScoreResult {
  if (!items || items.length === 0) {
    return {
      score: 0,
      rawScore: 0,
      maxPossibleRawScore: 0,
      totalCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      accuracy: 0,
      averageTime: 0,
      performanceIndex: 0,
      itemBreakdowns: [],
    };
  }

  let totalRawScore = 0;
  let maxPossibleRawScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let totalTime = 0;
  const itemBreakdowns: ItemScoreBreakdown[] = [];

  for (const item of items) {
    const timeSpent = Math.max(2, Math.min(item.timeSpentSeconds ?? standardTimeSeconds, 300));
    totalTime += timeSpent;

    // Empirical weight calculation with Bayesian smoothing
    let weight = item.itemWeight && item.itemWeight > 0 ? item.itemWeight : 100;
    if (item.stats && item.stats.totalAttempts >= 5) {
      const p = item.stats.correctAttempts / item.stats.totalAttempts;
      // p=0.9 (easy) -> weight ~ 84; p=0.2 (hard) -> weight ~ 112
      const delta = (0.5 - p) * 40;
      weight = Math.round(100 + delta);
    }

    const fraction =
      typeof item.scoreFraction === "number"
        ? Math.max(0, Math.min(1, item.scoreFraction))
        : item.isCorrect
          ? 1.0
          : 0.0;

    // Time factor for fairness: bounded between 0.85 and 1.15
    let timeFactor = 1.0;
    if (fraction > 0) {
      correctCount += fraction;
      // Time efficiency factor
      const ratio = standardTimeSeconds / Math.max(10, timeSpent);
      timeFactor = Math.max(
        0.85,
        Math.min(1.15, 0.88 + 0.22 * Math.min(1.2, ratio / (ratio + 0.3))),
      );
      timeFactor = Math.round(timeFactor * 100) / 100;
    } else {
      incorrectCount++;
      timeFactor = 1.0;
    }

    const itemScore = Math.round(weight * timeFactor * fraction);
    const maxItemScore = Math.round(weight * 1.15);

    totalRawScore += itemScore;
    maxPossibleRawScore += maxItemScore;

    itemBreakdowns.push({
      questionId: item.questionId,
      isCorrect: fraction >= 1,
      scoreFraction: fraction,
      timeSpentSeconds: timeSpent,
      itemWeight: weight,
      timeFactor,
      itemScore,
    });
  }

  const accuracy = Math.round((Math.min(items.length, correctCount) / items.length) * 1000) / 10;
  const averageTime = Math.round((totalTime / items.length) * 10) / 10;

  // Normalized score 0 - 1000
  const normalizedScore =
    maxPossibleRawScore > 0
      ? Math.min(1000, Math.max(0, Math.round((totalRawScore / maxPossibleRawScore) * 1000)))
      : 0;

  // Performance Index (accuracy weighted with time efficiency, max 100)
  const performanceIndex = Math.min(100, Math.round((normalizedScore / 10) * 10) / 10);

  return {
    score: normalizedScore,
    rawScore: totalRawScore,
    maxPossibleRawScore,
    totalCount: items.length,
    correctCount: Math.round(correctCount),
    incorrectCount,
    unansweredCount: Math.max(0, items.length - Math.round(correctCount) - incorrectCount),
    accuracy,
    averageTime,
    performanceIndex,
    itemBreakdowns,
  };
}
