import { describe, expect, it } from "vitest";
import { calculateBattleScore } from "./warrior-scoring";

describe("Warrior Battle Scoring Logic", () => {
  it("awards 0 points for incorrect answers regardless of speed", () => {
    expect(calculateBattleScore(false, 1000, 20)).toBe(0);
    expect(calculateBattleScore(false, 19000, 20)).toBe(0);
  });

  it("awards base 100 plus speed bonus up to 50 for fast correct answers", () => {
    // Instant answer (0s): maximum speed bonus (+50) -> 150 pts
    const instantScore = calculateBattleScore(true, 0, 20);
    expect(instantScore).toBe(150);

    // Halfway answer (10s in 20s): half speed bonus (+25) -> 125 pts
    const halfwayScore = calculateBattleScore(true, 10000, 20);
    expect(halfwayScore).toBe(125);

    // Last second answer (19.9s in 20s): minimum speed bonus -> 100 pts
    const lateScore = calculateBattleScore(true, 20000, 20);
    expect(lateScore).toBe(100);
  });

  it("clamps speed bonus gracefully if elapsedMs exceeds time limit", () => {
    const overdueScore = calculateBattleScore(true, 25000, 20);
    expect(overdueScore).toBe(100);
  });
});
