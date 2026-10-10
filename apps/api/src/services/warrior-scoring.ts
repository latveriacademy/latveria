export function calculateBattleScore(
  isCorrect: boolean,
  elapsedMs: number,
  timeLimitSeconds: number,
): number {
  if (!isCorrect) return 0;
  const basePoints = 100;
  const timeLimitMs = timeLimitSeconds * 1000;
  if (timeLimitMs <= 0) return basePoints;

  // Faster answers get up to 50 bonus points
  const fractionRemaining = Math.max(0, Math.min(1, (timeLimitMs - elapsedMs) / timeLimitMs));
  const speedBonus = Math.round(fractionRemaining * 50);
  return basePoints + speedBonus;
}
