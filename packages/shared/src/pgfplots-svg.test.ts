import { describe, expect, it } from "vitest";
import { renderPgfplotsSvg } from "./pgfplots-svg";

describe("PGFPlots SVG Visualizer", () => {
  const chart = (options = "", points = "(A,5)", category = "A", legend = "") =>
    String.raw`\begin{axis}[ybar,xtick=data,symbolic x coords={${category}}${options ? "," + options : ""}]\addplot coordinates {${points}};${legend}\end{axis}`;

  it("escapes all source-derived SVG text and attributes", () => {
    const payload = 'x" onload="alert(1)<script>bad</script>&';
    const svg = renderPgfplotsSvg(
      chart(
        `title={${payload}},xlabel={${payload}},ylabel={${payload}}`,
        "(A,5)",
        "A",
        String.raw`\legend{${payload}}`,
      ),
    );
    expect(svg).not.toBeNull();
    expect(svg).not.toContain(' onload="');
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;");
    expect(svg).toContain("&lt;script&gt;");
    expect(renderPgfplotsSvg(chart("", "(<script>,5)", "<script>"))).toContain("&lt;script&gt;");
  });

  it("routes unsupported plots and options to the worker instead of inventing bars", () => {
    for (const source of [
      String.raw`\begin{axis}\addplot[domain=-3:3] {x^2};\end{axis}`,
      chart().replace("ybar,", ""),
      chart("ybar stacked"),
      chart("xbar"),
      chart("ymode=log"),
      chart().replace("\\addplot", "\\addplot+"),
      chart().replace("\\end{axis}", "\\draw (0,0)--(1,1);\\end{axis}"),
      chart().replace("symbolic x coords={A}", "xmin=0"),
    ])
      expect(renderPgfplotsSvg(source)).toBeNull();
  });

  it("validates numbers, ranges, categories and plot bounds", () => {
    for (const source of [
      chart("", "(A,nope)"),
      chart("", "(A,1e999)"),
      chart("ymin=10,ymax=0"),
      chart("ymin=0,ymax=0"),
      chart("ymax=2"),
      chart("ytick={nope}"),
      chart("", "(A,5) (A,6)"),
      chart("", "(B,5)"),
      chart("", "(A,5) garbage"),
      chart("", "(A,5)", Array.from({ length: 200 }, (_, i) => `A${i}`).join(",")),
    ])
      expect(renderPgfplotsSvg(source)).toBeNull();
  });

  it("renders signed/exponent values from the zero baseline and derives the range", () => {
    const svg = renderPgfplotsSvg(chart("ymin=-1e1,ymax=+1e1", "(A,-5)"));
    expect(svg).toContain('y="192.5"');
    expect(svg).toContain('height="71.25"');
    expect(svg).not.toMatch(/NaN|Infinity|(?:width|height)="-/);
    expect(renderPgfplotsSvg(chart("", "(A,500)"))).toContain('height="285"');
    expect(renderPgfplotsSvg(chart("", "(A,0)"))).not.toBeNull();
    expect(renderPgfplotsSvg(chart("title={ymin=3}", "(A,5)"))).toContain('height="285"');
    expect(renderPgfplotsSvg(chart("", "(A,1e308)"))).not.toMatch(/NaN|Infinity/);
  });

  it("renders potato and corn harvest data bar chart with correct series and colors", () => {
    const source = `\\begin{tikzpicture}
\\begin{axis}[
ybar,
bar width=8pt,
width=10cm,
height=7cm,
title={Hasil Panen Kentang dan Jagung (kuintal)},
xlabel={Tahun},
ylabel={Jumlah (kuintal)},
symbolic x coords={2019, 2020, 2021, 2022, 2023, 2024, 2025},
xtick=data,
ymin=0,
ymax=120,
ytick={0,10,20,30,40,50,60,70,80,90,100,110,120},
legend pos=north west,
ymajorgrids=true,
 grid style=dashed,
]
\\addplot[fill=pink!80!white,draw=pink]
coordinates {
(2019,50) (2020,75) (2021,40) (2022,55)
(2023,75) (2024,90) (2025,100)
};
\\addplot[fill=blue!80!white,draw=blue]
coordinates {
(2019,65) (2020,60) (2021,46) (2022,55)
(2023,60) (2024,70) (2025,90)
};
\\legend{Kentang,Jagung}
\\end{axis}
\\end{tikzpicture}`;

    const svg = renderPgfplotsSvg(source);
    expect(svg).not.toBeNull();
    expect(svg).toContain("Hasil Panen Kentang dan Jagung (kuintal)");
    expect(svg).toContain("Tahun");
    expect(svg).toContain("Jumlah (kuintal)");
    expect(svg).toContain("2019");
    expect(svg).toContain("2025");
    expect(svg).toContain("120");
    expect(svg).toContain("Kentang");
    expect(svg).toContain("Jagung");
    expect(svg).toContain('fill="#ffb6c1"'); // pink
    expect(svg).toContain('fill="#99ccff"'); // blue
    expect(svg).toContain('stroke-dasharray="4,4"'); // dashed grid
  });

  it("returns null for non-axis latex source", () => {
    expect(renderPgfplotsSvg("\\draw (0,0) -- (1,1);")).toBeNull();
  });
});
