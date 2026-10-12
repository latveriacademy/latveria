import { describe, expect, it } from "vitest";
import { isHtmlTable, parseHtmlTable, parseSafeStyle } from "./html-table";

describe("HTML Table Parser and Sanitizer", () => {
  it("preserves captions, entities, line breaks, row headers and spaced spans safely", () => {
    const parsed = parseHtmlTable(
      `<table><caption>Units: kg &amp; m&#178;</caption><tr><th scope = 'row'>A &amp; B</th><td rowspan = "2" colspan = 3>10<br>20 &#xD7; 2<script>alert(1)</script><img src=x onerror=alert(1)></td></tr></table>`,
    );
    expect(parsed?.caption).toBe("Units: kg & m²");
    expect(parsed?.rows[0].cells[0]).toMatchObject({ scope: "row", content: "A & B" });
    expect(parsed?.rows[0].cells[1]).toMatchObject({
      rowSpan: 2,
      colSpan: 3,
      content: "10\n20 × 2",
    });
    expect(
      parseHtmlTable(
        `<table><tr><th>Default</th><td rowspan="nope" colspan="-2">X</td></tr></table>`,
      )?.rows[0].cells[0].scope,
    ).toBeUndefined();
  });

  it("keeps comparisons and multiline math intact while removing inline HTML", () => {
    const content = "<b>Bandingkan</b> x < 5 dan y > 2: $a<b>c$ $$\nx < y\n$$";
    expect(
      parseHtmlTable(`<table><tr><td>${content}</td></tr></table>`)?.rows[0].cells[0].content,
    ).toBe("Bandingkan x < 5 dan y > 2: $a<b>c$ $$\nx < y\n$$");
  });

  it("detects valid HTML table blocks and ignores plain text with < and >", () => {
    expect(isHtmlTable("<table><tr><td>A</td></tr></table>")).toBe(true);
    expect(isHtmlTable('<TABLE border="1"><tr><th>T</th></tr></TABLE>')).toBe(true);
    expect(isHtmlTable("Jika x < 5 dan y > 2")).toBe(false);
    expect(isHtmlTable("<table tanpa penutup")).toBe(false);
  });

  it("parses table rows, header cells, data cells and styles correctly", () => {
    const html = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; text-align:center; width:100%;">
<tr style="background-color:#f0f0f0;">
<th>Tahun</th>
<th style="background-color:#ffe6f2; color:#cc0066;">Kentang (kuintal)</th>
<th style="background-color:#e6f2ff; color:#0055ff;">Jagung (kuintal)</th>
</tr>
<tr><td>2019</td><td>50</td><td>65</td></tr>
<tr><td>2020</td><td>75</td><td>60</td></tr>
</table>`;

    const parsed = parseHtmlTable(html);
    expect(parsed).not.toBeNull();
    expect(parsed!.rows.length).toBe(3);

    // Row 0 (Headers)
    const headerRow = parsed!.rows[0];
    expect(headerRow.style.backgroundColor).toBe("#f0f0f0");
    expect(headerRow.cells.length).toBe(3);
    expect(headerRow.cells[0].content).toBe("Tahun");
    expect(headerRow.cells[1].content).toBe("Kentang (kuintal)");
    expect(headerRow.cells[1].style.backgroundColor).toBe("#ffe6f2");
    expect(headerRow.cells[1].style.color).toBe("#cc0066");
    expect(headerRow.cells[2].style.backgroundColor).toBe("#e6f2ff");
    expect(headerRow.cells[2].style.color).toBe("#0055ff");

    // Row 1 (Data)
    const dataRow1 = parsed!.rows[1];
    expect(dataRow1.cells.map((c) => c.content)).toEqual(["2019", "50", "65"]);
  });

  it("extracts colspan and rowspan safely", () => {
    const html = `<table>
<tr><th colspan="2">Gabungan</th></tr>
<tr><td rowspan="2">A</td><td>B</td></tr>
<tr><td>C</td></tr>
</table>`;

    const parsed = parseHtmlTable(html);
    expect(parsed).not.toBeNull();
    expect(parsed!.rows[0].cells[0].colSpan).toBe(2);
    expect(parsed!.rows[1].cells[0].rowSpan).toBe(2);
  });

  it("sanitizes unsafe styles and attributes", () => {
    const safe = parseSafeStyle(
      "background-color: red; color: blue; background-image: url('http://evil.com/x.jpg'); behavior: url(x); text-align: left;",
    );
    expect(safe.backgroundColor).toBe("red");
    expect(safe.color).toBe("blue");
    expect(safe.textAlign).toBe("left");
    expect((safe as Record<string, string>)["backgroundImage"]).toBeUndefined();
  });
});
