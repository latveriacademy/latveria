import { describe, expect, it } from "vitest";
import { parseTikz, projectPoint } from "./tikz";
import { tikzExamples } from "./tikz-examples";

describe("parseTikz", () => {
  it("parses the bundled triangle, cube, and sphere examples", () => {
    expect(tikzExamples.every((example) => example.source.length <= 1000)).toBe(true);
    const triangle = parseTikz(tikzExamples.find((example) => example.name === "Segitiga")!.source);
    const pyramid = parseTikz(
      tikzExamples.find((example) => example.name === "Limas segiempat")!.source,
    );
    const cube = parseTikz(tikzExamples.find((example) => example.name === "Kubus")!.source);
    const sphere = parseTikz(tikzExamples.find((example) => example.name === "Bola")!.source);
    expect(triangle.shapes[0]).toMatchObject({
      kind: "path",
      closed: true,
      points: [
        [0, 0, 0],
        [4, 0, 0],
        [0, 3, 0],
      ],
    });
    expect(triangle.labels).toHaveLength(5);
    expect(pyramid.shapes).toHaveLength(4);
    expect(
      tikzExamples.find((example) => example.name === "Limas segiempat")!.source.length,
    ).toBeLessThan(1000);
    expect(cube.shapes).toHaveLength(5);
    expect(
      cube.shapes.filter((shape) => shape.kind === "path").some((shape) => shape.style.dash),
    ).toBe(true);
    expect(projectPoint([0, 0, 3])).toEqual([1.7999999999999998, -1.0499999999999998]);
    expect(sphere.shapes.some((shape) => shape.kind === "ellipse" && shape.ry === 0.6)).toBe(true);
    expect(sphere.description).toContain("Bola berjari-jari r");
  });

  it("supports common draw options and rectangles", () => {
    const diagram = parseTikz(String.raw`\begin{tikzpicture}
\draw[thick,dashed] (0,0) rectangle (4,3);
\fill (2,1) circle (0.2);
\end{tikzpicture}`);
    expect(diagram.shapes[0]).toMatchObject({
      kind: "path",
      closed: true,
      style: { width: 3, dash: "8 6" },
    });
    expect(diagram.shapes[1]).toMatchObject({ kind: "ellipse", style: { fill: "solid" } });
  });

  it("supports arrow operator ->, <-, and <->", () => {
    const diagram = parseTikz(String.raw`\begin{tikzpicture}
\draw[->] (0,0) -- (4,0);
\draw[->, thick] (0,0) -- (0,3);
\draw[<->, dashed] (1,1) -- (2,2);
\node at (4.2,0) {x};
\node at (0,3.2) {y};
\end{tikzpicture}`);
    expect(diagram.shapes[0]).toMatchObject({
      kind: "path",
      style: { width: 2, arrow: "->" },
    });
    expect(diagram.shapes[1]).toMatchObject({
      kind: "path",
      style: { width: 3, arrow: "->" },
    });
    expect(diagram.shapes[2]).toMatchObject({
      kind: "path",
      style: { width: 2, arrow: "<->", dash: "8 6" },
    });
    expect(diagram.labels).toHaveLength(2);
  });

  it("does not execute unsupported, oversized, or unsafe TeX", () => {
    expect(() =>
      parseTikz(String.raw`\begin{tikzpicture}\draw[red] (0,0)--(1,1);\end{tikzpicture}`),
    ).toThrow("belum didukung");
    expect(() =>
      parseTikz(`\\begin{tikzpicture}${" ".repeat(4001)}\\draw (0,0)--(1,1);\\end{tikzpicture}`),
    ).toThrow("4.000 karakter");
    expect(() =>
      parseTikz(String.raw`\begin{tikzpicture}\draw (999,0)--(1,1);\end{tikzpicture}`),
    ).toThrow("antara");
    expect(() =>
      parseTikz(
        String.raw`\begin{tikzpicture}\draw (0,0)--(1,1);\node at (0,0) {\href{x}{x}};\end{tikzpicture}`,
      ),
    ).toThrow("Label hanya mendukung");
    expect(() =>
      parseTikz(String.raw`\begin{tikzpicture}\draw (0,0)--(1,1)\end{tikzpicture}`),
    ).toThrow("titik koma");
  });
});
