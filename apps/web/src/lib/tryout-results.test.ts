import { expect, it } from "vitest";
import type { TryoutHistoryEntry } from "@latveria/shared";
import {
  formatTryoutScore,
  latestTryoutsByPackage,
  radarPoint,
  tryoutResultPath,
  tryoutScoreLabel,
} from "./tryout-results";
it("keeps a zero latest score and groups completed attempts by package", () => {
  const row: TryoutHistoryEntry = {
    id: "latest",
    packageId: "pkg",
    name: "Tryout",
    completedAt: "2026-10-09T00:00:00Z",
    score: 0,
    scoringVersion: "utbk-simulation-v1",
    method: "simulation",
    isCompleteUtbk: true,
  };
  const groups = latestTryoutsByPackage([
    row,
    { ...row, id: "older", score: 900 },
    { ...row, packageId: "another", id: "other" },
  ]);
  expect(groups.get("pkg")).toEqual({ latest: row, count: 2 });
  expect(formatTryoutScore(0)).toBe("0");
  expect(formatTryoutScore(null)).toBe("—");
  expect(tryoutScoreLabel("legacy")).toContain("Latveria lama");
  expect(tryoutResultPath("id&other=true")).toContain("id%26other%3Dtrue");
});
it("plots scores on the fixed 0–1000 radial scale", () => {
  expect(radarPoint(0, 3)).toEqual({ x: 180, y: 168 });
  expect(radarPoint(1000, 0)).toEqual({ x: 180, y: 56 });
  expect(radarPoint(500, 0).y).toBe(112);
  for (let index = 0; index < 7; index++) {
    const point = radarPoint(1000, index);
    expect(Math.hypot(point.x - 180, point.y - 168)).toBeCloseTo(112);
  }
});
