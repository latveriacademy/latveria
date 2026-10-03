import { expect, it, describe } from "vitest";
import {
  getPeriodRange,
  ACCURACY_MIN_ANSWERS,
  SUBTEST_TO_SLUG,
  tiebreaker,
} from "./leaderboard-utils";

describe("getPeriodRange", () => {
  it("returns full range for 'all' period", () => {
    const range = getPeriodRange("all", new Date("2026-10-15T10:00:00Z"));
    expect(range.startWIB).toBe("Awal zamanan");
    expect(range.endWIB).toBe("Sekarang");
  });

  it("calculates daily period correctly", () => {
    // October 15, 2026 WIB
    const range = getPeriodRange("daily", new Date("2026-10-15T03:00:00Z")); // 10:00 WIB
    expect(range.startWIB).toContain("2026-10-15");
    expect(range.endWIB).toContain("2026-10-15");
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it("calculates weekly period (Monday to Sunday)", () => {
    // Wednesday Oct 14, 2026 (WIB)
    // Week should be Oct 12 (Monday) to Oct 18 (Sunday)
    const range = getPeriodRange("weekly", new Date("2026-10-14T03:00:00Z")); // 10:00 WIB Wed
    expect(range.startWIB).toContain("2026-10-12");
    expect(range.endWIB).toContain("2026-10-18");
  });

  it("handles week boundary at Monday midnight", () => {
    // Monday Oct 12, 2026 00:00 WIB = Oct 11, 2026 17:00 UTC
    const range = getPeriodRange("weekly", new Date("2026-10-11T17:00:00Z"));
    // Start of week should be Monday Oct 12
    expect(range.startWIB).toContain("2026-10-12");
    expect(range.endWIB).toContain("2026-10-18");
  });

  it("calculates monthly period correctly", () => {
    // Oct 15, 2026
    const range = getPeriodRange("monthly", new Date("2026-10-15T03:00:00Z")); // 10:00 WIB
    expect(range.startWIB).toContain("2026-10-01");
    expect(range.endWIB).toContain("2026-10-31");
  });

  it("handles month boundary at end of February", () => {
    // Feb 28, 2026
    const range = getPeriodRange("monthly", new Date("2026-02-28T03:00:00Z")); // 10:00 WIB
    expect(range.startWIB).toContain("2026-02-01");
    expect(range.endWIB).toContain("2026-02-28");
  });

  it("handles leap year February", () => {
    // Feb 28, 2028 (leap year)
    const range = getPeriodRange("monthly", new Date("2028-02-28T03:00:00Z"));
    expect(range.endWIB).toContain("2028-02-29");
  });
});

describe("ACCURACY_MIN_ANSWERS", () => {
  it("has correct minimum for 'all' subtests", () => {
    expect(ACCURACY_MIN_ANSWERS.all).toBe(50);
  });

  it("has correct minimum for individual subtests", () => {
    expect(ACCURACY_MIN_ANSWERS.PU).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.PPU).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.PBM).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.PK).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.BI).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.EN).toBe(20);
    expect(ACCURACY_MIN_ANSWERS.PM).toBe(20);
  });
});

describe("SUBTEST_TO_SLUG", () => {
  it("maps subtest codes to correct topic slugs", () => {
    expect(SUBTEST_TO_SLUG.all).toBe("");
    expect(SUBTEST_TO_SLUG.PU).toBe("penalaran-umum");
    expect(SUBTEST_TO_SLUG.PPU).toBe("pengetahuan-pemahaman-umum");
    expect(SUBTEST_TO_SLUG.PBM).toBe("pemahaman-bacaan-menulis");
    expect(SUBTEST_TO_SLUG.PK).toBe("pengetahuan-kuantitatif");
    expect(SUBTEST_TO_SLUG.BI).toBe("literasi-bahasa-indonesia");
    expect(SUBTEST_TO_SLUG.EN).toBe("literasi-bahasa-inggris");
    expect(SUBTEST_TO_SLUG.PM).toBe("penalaran-matematika");
  });
});

describe("tiebreaker", () => {
  // tiebreaker returns negative when a < b (a ranks higher)
  // This means: higher value → lower result → ranks higher

  it("returns negative when a has higher value (a ranks higher)", () => {
    const a = { value: 30, timestamp: new Date("2026-10-01"), userId: "user1" };
    const b = { value: 20, timestamp: new Date("2026-10-01"), userId: "user2" };
    expect(tiebreaker(a, b)).toBeLessThan(0); // a has higher value, ranks higher
  });

  it("returns positive when b has higher value (b ranks higher)", () => {
    const a = { value: 10, timestamp: new Date("2026-10-01"), userId: "user1" };
    const b = { value: 20, timestamp: new Date("2026-10-01"), userId: "user2" };
    expect(tiebreaker(a, b)).toBeGreaterThan(0); // b has higher value, ranks higher
  });

  it("uses earlier timestamp when values are equal", () => {
    const a = { value: 10, timestamp: new Date("2026-10-01T10:00:00Z"), userId: "user1" };
    const b = { value: 10, timestamp: new Date("2026-10-01T12:00:00Z"), userId: "user2" };
    expect(tiebreaker(a, b)).toBeLessThan(0); // a is earlier, ranks higher
  });

  it("uses userId as final tiebreaker", () => {
    const a = { value: 10, timestamp: new Date("2026-10-01T10:00:00Z"), userId: "user2" };
    const b = { value: 10, timestamp: new Date("2026-10-01T10:00:00Z"), userId: "user1" };
    expect(tiebreaker(a, b)).toBeGreaterThan(0); // "user1" < "user2", so b ranks higher
  });
});
