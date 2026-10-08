import { expect, it } from "vitest";
import { toCsv } from "./csv";
it("preserves CSV fields and neutralizes spreadsheet formulas", () => {
  expect(toCsv([["a,b", 'a"b', "a\nb", "=SUM(A1)", -2, null]])).toBe(
    '"a,b","a""b","a\nb","\'=SUM(A1)","-2",""',
  );
});
