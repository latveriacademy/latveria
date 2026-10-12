import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LatexDiagram } from "./latex-diagram";

describe("LatexDiagram component", () => {
  it("renders simple TikZ geometry using local fast-path", () => {
    const source = String.raw`\begin{tikzpicture}\draw (0,0)--(4,0)--(0,3)--cycle;\end{tikzpicture}`;
    const html = renderToStaticMarkup(<LatexDiagram source={source} />);
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).not.toContain("Menyiapkan ilustrasi LaTeX");
  });

  it("identifies complex diagrams and initiates universal engine view", () => {
    // circuitikz is identified as complex so it bypasses local fast-path
    const source = String.raw`\begin{circuitikz}\draw (0,0) to[R] (2,0);\end{circuitikz}`;
    const html = renderToStaticMarkup(<LatexDiagram source={source} />);
    // Static markup renders initial loading skeleton of UniversalLatexEngineView
    expect(html).toContain("Menyiapkan ilustrasi LaTeX");
  });

  it("handles unsupported syntax gracefully in fallback view", () => {
    const source = String.raw`\chemfig{A=B}`;
    const html = renderToStaticMarkup(<LatexDiagram source={source} />);
    expect(html).toContain("Menyiapkan ilustrasi LaTeX");
  });
});
