import { describe, expect, it } from "vitest";
import { isComplexLatexDiagram, latexRenderRequestSchema } from "./latex";

describe("Latex Shared Schemas & Helpers", () => {
  it("validates latex render requests", () => {
    const valid = latexRenderRequestSchema.safeParse({
      source: "\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}",
      compiler: "pdflatex",
      packages: ["tikz", "amsmath"],
    });
    expect(valid.success).toBe(true);
  });

  it("detects complex latex diagrams that require full TeX compiler", () => {
    expect(
      isComplexLatexDiagram("\\begin{circuitikz}\\draw (0,0) to[R] (2,0);\\end{circuitikz}"),
    ).toBe(true);
    expect(isComplexLatexDiagram("\\chemfig{A=B-C}")).toBe(true);
    expect(isComplexLatexDiagram("\\begin{forest} [VP [V] [NP]] \\end{forest}")).toBe(true);
    expect(isComplexLatexDiagram("\\begin{axis} \\addplot {x^2}; \\end{axis}")).toBe(true);
    expect(isComplexLatexDiagram("Just some plain text $x + y = 2$")).toBe(false);
  });
});
