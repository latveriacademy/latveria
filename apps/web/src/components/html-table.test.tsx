import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HtmlTable } from "./html-table";

describe("HtmlTable component", () => {
  it("renders caption, row header, decoded text and actual line breaks without active HTML", () => {
    const html = renderToStaticMarkup(
      <HtmlTable
        source={`<table><caption>Units: kg</caption><tr><th scope="row">A &amp; B</th><td rowspan = "2">10<br>20 &lt;img src=x onerror=alert(1)&gt;</td></tr></table>`}
      />,
    );
    expect(html).toContain("<caption>Units: kg</caption>");
    expect(html).toContain('scope="row"');
    expect(html).toContain('rowSpan="2"');
    expect(html).toContain("A &amp; B");
    expect(html).not.toContain("&amp;amp;");
    expect(html).toContain("<br/>");
    expect(html).not.toContain("<img");
  });

  it("renders visual table with customized colors and borders", () => {
    const source = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; text-align:center; width:100%;">
<tr style="background-color:#f0f0f0;">
<th>Tahun</th>
<th style="background-color:#ffe6f2; color:#cc0066;">Kentang (kuintal)</th>
<th style="background-color:#e6f2ff; color:#0055ff;">Jagung (kuintal)</th>
</tr>
<tr><td>2019</td><td>50</td><td>65</td></tr>
</table>`;

    const html = renderToStaticMarkup(<HtmlTable source={source} />);
    expect(html).toContain("<table");
    expect(html).toContain('role="table"');
    expect(html).toContain("<th");
    expect(html).toContain("Tahun");
    expect(html).toContain("Kentang (kuintal)");
    expect(html).toContain("Jagung (kuintal)");
    expect(html).toContain("background-color:#ffe6f2");
    expect(html).toContain("color:#cc0066");
    expect(html).toContain("background-color:#e6f2ff");
    expect(html).toContain("color:#0055ff");
    expect(html).toContain("<td");
    expect(html).toContain("2019");
    expect(html).toContain("50");
  });

  it("handles malformed table with fallback container", () => {
    const malformed = "<table><tr><td>No closing tag";
    const html = renderToStaticMarkup(<HtmlTable source={malformed} />);
    expect(html).toContain("table-fallback");
    expect(html).toContain("Tabel HTML belum dapat ditampilkan");
  });
});
