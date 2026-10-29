import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TargetUniversityPicker } from "./target-university-picker";

describe("TargetUniversityPicker", () => {
  it("renders input with initial value and placeholder", () => {
    const html = renderToStaticMarkup(
      <TargetUniversityPicker value="UI - S1 Ilmu Komputer" onChange={() => {}} />,
    );

    expect(html).toContain('value="UI - S1 Ilmu Komputer"');
    expect(html).toContain("Pilih dari daftar atau ketik sendiri");
    expect(html).toContain("Cari di data SNBT");
  });

  it("renders disabled state properly", () => {
    const html = renderToStaticMarkup(
      <TargetUniversityPicker value="" onChange={() => {}} disabled />,
    );

    expect(html).toContain("disabled");
  });
});
