import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MathText } from "./math-text";

it("merender rumus inline dan blok dengan KaTeX", () => {
  const html = renderToStaticMarkup(<MathText>{"Nilai $x^2$ dan $$\\frac{1}{2}$$"}</MathText>);
  expect(html).toContain("katex");
  expect(html).toContain("katex-display");
  expect(html).not.toContain("$x^2$");
});

it("mempertahankan teks biasa dan LaTeX salah tanpa menjalankan HTML", () => {
  const html = renderToStaticMarkup(<MathText>{"<script>bahaya</script> dan $\\invalidcommand$"}</MathText>);
  expect(html).toContain("&lt;script&gt;bahaya&lt;/script&gt;");
  expect(html).toContain("$\\invalidcommand$");
  expect(html).not.toContain("<script>");
});
