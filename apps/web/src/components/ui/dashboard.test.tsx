import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./dashboard";

describe("ProgressBar", () => {
  it.each([
    [40, 80, 50],
    [120, 100, 100],
    [-5, 100, 0],
    [10, 0, 0],
    [NaN, 100, 0],
  ])("keeps visual and accessible progress consistent for %s/%s", (value, max, percent) => {
    const html = renderToStaticMarkup(<ProgressBar value={value} max={max} label="EXP" />);
    expect(html).toContain(`aria-valuenow="${percent}"`);
    expect(html).toContain(`width:${percent}%`);
    expect(html).toContain('aria-label="EXP"');
  });
});
