import { expect, it } from "vitest";
import {
  learnerSummary,
  levelProgress,
  practiceDay,
  practiceStreak,
  practiceXP,
} from "./progression";

it("rewards completed practices and handles exact and multiple level boundaries", () => {
  expect(practiceXP(0)).toBe(30);
  expect(practiceXP(10)).toBe(180);
  expect(levelProgress(299)).toMatchObject({ level: 1, currentXP: 299, nextLevelXP: 300 });
  expect(levelProgress(300)).toMatchObject({ level: 2, currentXP: 0, nextLevelXP: 405 });
  expect(levelProgress(705)).toMatchObject({ level: 3, currentXP: 0, nextLevelXP: 547 });
  expect(levelProgress(1252)).toMatchObject({ level: 4, currentXP: 0 });
});

it("counts unique consecutive Jakarta days across midnight, gaps, and month boundaries", () => {
  expect(practiceDay("2026-09-30T17:00:00Z")).toBe("2026-10-01");
  const dates = [
    "2026-09-29T18:00:00Z",
    "2026-09-30T18:00:00Z",
    "2026-10-01T18:00:00Z",
    "2026-10-01T20:00:00Z",
  ];
  expect(practiceStreak(dates, new Date("2026-10-02T16:59:59Z"))).toEqual({
    streakDays: 3,
    practicedToday: true,
  });
  expect(practiceStreak(dates, new Date("2026-10-02T17:00:00Z"))).toEqual({
    streakDays: 3,
    practicedToday: false,
  });
  expect(practiceStreak(dates, new Date("2026-10-03T17:00:00Z"))).toEqual({
    streakDays: 0,
    practicedToday: false,
  });
  expect(practiceStreak([], new Date("2026-10-02"))).toEqual({
    streakDays: 0,
    practicedToday: false,
  });
});

it("derives progress and current week totals only from saved practices", () => {
  const attempts = [
    { topicId: "a", correctCount: 10, totalCount: 10, submittedAt: "2026-09-20T10:00:00Z" },
    { topicId: "b", correctCount: 5, totalCount: 10, submittedAt: "2026-10-01T18:00:00Z" },
  ];
  const result = learnerSummary(attempts, new Date("2026-10-02T12:00:00Z"));
  expect(result).toMatchObject({
    totalXP: 285,
    level: 1,
    answered: 20,
    correct: 15,
    attempts: 2,
    tried: 2,
    streakDays: 1,
  });
  expect(result.weeklyChartData.reduce((sum, day) => sum + day.xp, 0)).toBe(105);
  expect(result.weeklyChartData.find((day) => day.day === "Jum")?.questions).toBe(10);
});

it("handles re-attempt anti-farming EXP correctly", () => {
  // First attempt: 10 correct -> 30 + 10 * 15 = 180
  expect(practiceXP(10, null)).toBe(180);

  // Re-attempt with no improvement: 10 correct, prev was 10 -> 10 EXP bonus
  expect(practiceXP(10, 10)).toBe(10);

  // Re-attempt with lower score: 7 correct, prev was 10 -> 10 EXP bonus
  expect(practiceXP(7, 10)).toBe(10);

  // Re-attempt with improvement: 9 correct, prev was 6 -> (9 - 6) * 15 + 10 = 55
  expect(practiceXP(9, 6)).toBe(55);

  // Re-attempt with 0 correct: -> 5 EXP
  expect(practiceXP(0, 5)).toBe(5);

  // In learnerSummary: multiple attempts on the same packageId do not duplicate full EXP
  const repeatedAttempts = [
    {
      topicId: "t1",
      packageId: "pkg-1",
      correctCount: 10,
      totalCount: 10,
      submittedAt: "2026-10-01T10:00:00Z",
    },
    {
      topicId: "t1",
      packageId: "pkg-1",
      correctCount: 10,
      totalCount: 10,
      submittedAt: "2026-10-01T12:00:00Z",
    },
    {
      topicId: "t1",
      packageId: "pkg-1",
      correctCount: 10,
      totalCount: 10,
      submittedAt: "2026-10-01T14:00:00Z",
    },
  ];
  // Attempt 1: 180 XP, Attempt 2: 10 XP, Attempt 3: 10 XP -> Total 200 XP (not 540 XP!)
  const summary = learnerSummary(repeatedAttempts, new Date("2026-10-01T15:00:00Z"));
  expect(summary.totalXP).toBe(200);
});
