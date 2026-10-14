import { describe, expect, it } from "vitest";
import { parseLatexTable } from "./latex-table";

describe("parseLatexTable", () => {
  it("parses standard \\begin{array} table with \\hline and column spec", () => {
    const source = `\\begin{array}{|c|c|c|}
\\hline
Nama & Nilai & Peringkat \\\\
\\hline
A & 85 & 2 \\\\
B & 92 & 1 \\\\
C & 78 & 3 \\\\
\\hline
\\end{array}`;

    const parsed = parseLatexTable(source);
    expect(parsed).not.toBeNull();
    expect(parsed?.environment).toBe("array");
    expect(parsed?.columns).toHaveLength(3);
    expect(parsed?.columns[0]).toEqual({ align: "center", borderLeft: true, borderRight: true });
    expect(parsed?.columns[1]).toEqual({ align: "center", borderLeft: true, borderRight: true });
    expect(parsed?.columns[2]).toEqual({ align: "center", borderLeft: true, borderRight: true });

    expect(parsed?.rows).toHaveLength(4);
    // Header row
    expect(parsed?.rows[0]?.[0]?.content).toBe("Nama");
    expect(parsed?.rows[0]?.[0]?.isHeader).toBe(true);
    expect(parsed?.rows[0]?.[0]?.borderTop).toBe(true);
    expect(parsed?.rows[0]?.[0]?.borderBottom).toBe(true);

    // Data rows
    expect(parsed?.rows[1]?.[0]?.content).toBe("A");
    expect(parsed?.rows[1]?.[1]?.content).toBe("85");
    expect(parsed?.rows[1]?.[2]?.content).toBe("2");
    expect(parsed?.rows[3]?.[2]?.content).toBe("3");
    expect(parsed?.rows[3]?.[2]?.borderBottom).toBe(true);
  });

  it("parses \\begin{tabular} with alignment l, c, r", () => {
    const source = `\\begin{tabular}{l|c|r}
Subtes & Soal & Waktu \\\\
PU & 30 & 25m \\\\
PK & 20 & 20m
\\end{tabular}`;

    const parsed = parseLatexTable(source);
    expect(parsed).not.toBeNull();
    expect(parsed?.environment).toBe("tabular");
    expect(parsed?.columns[0]?.align).toBe("left");
    expect(parsed?.columns[1]?.align).toBe("center");
    expect(parsed?.columns[2]?.align).toBe("right");
    expect(parsed?.rows).toHaveLength(3);
    expect(parsed?.rows[0]?.[0]?.content).toBe("Subtes");
    expect(parsed?.rows[1]?.[1]?.content).toBe("30");
    expect(parsed?.rows[2]?.[2]?.content).toBe("20m");
  });

  it("returns null for non-table LaTeX or malformed source", () => {
    expect(parseLatexTable("bukan tabel")).toBeNull();
    expect(parseLatexTable("\\begin{array}{c} missing end")).toBeNull();
  });
});
