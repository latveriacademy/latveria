import { describe, expect, it } from "vitest";
import { renderPgfplotsSvg } from "./pgfplots-svg";

describe("PGFPlots SVG Visualizer", () => {
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
grid style={dashed},
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
