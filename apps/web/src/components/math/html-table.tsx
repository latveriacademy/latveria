import { useMemo } from "react";
import { parseHtmlTable, type HtmlTableCell } from "../../lib/math/html-table";
import { MathText } from "./math-text";

export function HtmlTable({ source }: { source: string }) {
  const parsed = useMemo(() => parseHtmlTable(source), [source]);

  if (!parsed || parsed.rows.length === 0) {
    return (
      <div className="table-fallback my-3 rounded border border-[var(--edge)] bg-[var(--surface-muted)]/50 p-3 font-mono text-xs text-[var(--soft-ink)]">
        <span className="block font-semibold text-[var(--crimson)] mb-1">
          Tabel HTML belum dapat ditampilkan:
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap">{source}</pre>
      </div>
    );
  }

  const renderCell = (cell: HtmlTableCell, cIdx: number) => {
    const Component = cell.kind === "th" ? "th" : "td";

    const baseClass =
      cell.kind === "th"
        ? "px-3.5 py-2 text-sm font-mono font-semibold border border-[var(--edge)]"
        : "px-3.5 py-2 text-sm font-sans border border-[var(--edge)]";

    return (
      <Component
        key={cIdx}
        scope={cell.scope}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan}
        style={cell.style}
        className={baseClass}
      >
        <MathText
          renderText={(text) =>
            text.split("\n").map((line, index) => (
              <span key={index}>
                {index > 0 && <br />}
                {line}
              </span>
            ))
          }
        >
          {cell.content}
        </MathText>
      </Component>
    );
  };

  return (
    <div
      role="region"
      aria-label="Tabel Soal"
      className="table-block-container my-3 overflow-x-auto rounded border border-[var(--edge)] bg-[var(--surface)] p-2 shadow-sm"
    >
      <table
        className="w-full min-w-[280px] border-collapse"
        role="table"
        style={parsed.tableStyle}
      >
        {parsed.caption !== undefined && (
          <caption>
            <MathText>{parsed.caption}</MathText>
          </caption>
        )}
        <tbody>
          {parsed.rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              style={row.style}
              className="transition-colors hover:bg-[var(--surface-muted)]/30"
            >
              {row.cells.map((cell, cIdx) => renderCell(cell, cIdx))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
