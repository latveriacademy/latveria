import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MathText } from "./math-text";

it("keeps formula source available during lazy rendering", () => {
  const html = renderToStaticMarkup(<MathText>{"Nilai $x^2$ dan $$\\frac{1}{2}$$"}</MathText>);
  expect(html).toContain("math-pending");
  expect(html).toContain("$x^2$");
});

it("mempertahankan teks biasa dan LaTeX salah tanpa menjalankan HTML", () => {
  const html = renderToStaticMarkup(
    <MathText>{"<script>bahaya</script> dan $\\invalidcommand$"}</MathText>,
  );
  expect(html).toContain("&lt;script&gt;bahaya&lt;/script&gt;");
  expect(html).toContain("$\\invalidcommand$");
  expect(html).not.toContain("<script>");
});

it("renders inline and display formulas using KaTeX", async () => {
  const { MathFormula } = await import("./math-formula");
  const html = renderToStaticMarkup(
    <>
      <MathFormula source="x^2" />
      <MathFormula source="\\frac{1}{2}" displayMode />
    </>,
  );
  expect(html).toContain("katex");
  expect(html).toContain("katex-display");
});

it("renders supported TikZ geometry as accessible inline SVG", () => {
  const source = String.raw`\begin{tikzpicture}
% alt: Segitiga ABC.
\draw (0,0)--(4,0)--(0,3)--cycle;
\node[below] at (0,0) {$A$};
\end{tikzpicture}`;
  const html = renderToStaticMarkup(<MathText>{source}</MathText>);
  expect(html).toContain("tikz-pending");
  expect(html).toContain("tikzpicture");
});

it("renders TikZ pictures as accessible SVG once the renderer is loaded", async () => {
  const { TikzDiagram } = await import("./tikz-diagram");
  const html = renderToStaticMarkup(
    <TikzDiagram
      source={String.raw`\begin{tikzpicture}\draw (0,0)--(4,0)--(0,3)--cycle;\node at (0,0) {$A$};\end{tikzpicture}`}
    />,
  );
  expect(html).toContain("<svg");
  expect(html).toContain('role="img"');
  expect(html).toContain("katex");
  expect(html).not.toContain(String.raw`\begin{tikzpicture}`);
});

it("uses author-provided TikZ alt text for the diagram title", async () => {
  const { TikzDiagram } = await import("./tikz-diagram");
  const html = renderToStaticMarkup(
    <TikzDiagram
      source={String.raw`\begin{tikzpicture}
% alt: Segitiga ABC.
\draw (0,0)--(4,0)--(0,3)--cycle;
\end{tikzpicture}`}
    />,
  );
  expect(html).toContain("Segitiga ABC.");
});

it("renders TikZ arrow operator -> with marker elements", async () => {
  const { TikzDiagram } = await import("./tikz-diagram");
  const html = renderToStaticMarkup(
    <TikzDiagram
      source={String.raw`\begin{tikzpicture}\draw[->] (0,0) -- (4,0);\draw[->, thick] (0,0) -- (0,3);\end{tikzpicture}`}
    />,
  );
  expect(html).toContain("<marker");
  expect(html).toContain("marker-end");
  expect(html).not.toContain("Diagram belum dapat ditampilkan");
});

it("shows the source with a useful message for unsupported TikZ commands", async () => {
  const source = String.raw`\begin{tikzpicture}\draw[red] (0,0)--(1,1);\end{tikzpicture}`;
  const { TikzDiagram } = await import("./tikz-diagram");
  const html = renderToStaticMarkup(<TikzDiagram source={source} />);
  expect(html).toContain("Diagram belum dapat ditampilkan");
  expect(html).toContain("belum didukung");
  expect(html).toContain(source);
});

it("renders LaTeX array and tabular as structured table", async () => {
  const { LatexTable } = await import("./latex-table");
  const arraySource = String.raw`\begin{array}{|c|c|c|}
\hline
Nama & Nilai & Peringkat \\
\hline
A & 85 & 2 \\
\hline
\end{array}`;

  const html = renderToStaticMarkup(<LatexTable source={arraySource} />);
  expect(html).toContain("<table");
  expect(html).toContain("<th");
  expect(html).toContain("Nama");
  expect(html).toContain("Nilai");
  expect(html).toContain("Peringkat");
  expect(html).toContain("<td");
  expect(html).toContain("85");
});

it("renders LaTeX tabular with math in cells", async () => {
  const { LatexTable } = await import("./latex-table");
  const tabularSource = String.raw`\begin{tabular}{l|r}
Variabel & Formula \\
x & \frac{1}{2}
\end{tabular}`;

  const html = renderToStaticMarkup(<LatexTable source={tabularSource} />);
  expect(html).toContain("<table");
  expect(html).toContain("Variabel");
  expect(html).toContain("Formula");
  expect(html).toContain("katex");
});

it("renders fallback message on malformed LaTeX table", async () => {
  const { LatexTable } = await import("./latex-table");
  const malformed = String.raw`\begin{tabular}{c} malformed table without end`;
  const html = renderToStaticMarkup(<LatexTable source={malformed} />);
  expect(html).toContain("table-fallback");
  expect(html).toContain("Tabel belum dapat ditampilkan");
});
