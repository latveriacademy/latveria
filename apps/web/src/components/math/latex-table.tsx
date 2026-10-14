import { useMemo } from "react";
import { parseLatexTable, type TableCell } from "../../lib/math/latex-table";
import { MathText } from "./math-text";

function formatCellContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  // If the cell contains LaTeX commands like \frac, \sqrt, etc. and not already wrapped in $
  if (/^\\[a-zA-Z]/.test(trimmed) && !trimmed.startsWith("$")) {
    return `$${trimmed}$`;
  }
  return trimmed;
}

export function LatexTable({ source }: { source: string }) {
  const parsed = useMemo(() => parseLatexTable(source), [source]);

  if (!parsed || parsed.rows.length === 0) {
    return (
      <div className="table-fallback my-3 rounded border border-[var(--edge)] bg-[var(--surface-muted)]/50 p-3 font-mono text-xs text-[var(--soft-ink)]">
        <span className="block font-semibold text-[var(--crimson)] mb-1">
          Tabel belum dapat ditampilkan dengan format ini:
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap">{source}</pre>
      </div>
    );
  }

  const hasHeader = parsed.rows.some((row) => row.some((c) => c.isHeader));
  const headerRows = hasHeader ? parsed.rows.filter((r) => r.some((c) => c.isHeader)) : [];
  const bodyRows = hasHeader ? parsed.rows.filter((r) => !r.some((c) => c.isHeader)) : parsed.rows;

  const renderCell = (cell: TableCell, cellIdx: number) => {
    const Component = cell.isHeader ? "th" : "td";
    const alignClass =
      cell.align === "center" ? "text-center" : cell.align === "right" ? "text-right" : "text-left";

    const borders = [
      cell.borderLeft ? "border-l border-[var(--edge)]" : "",
      cell.borderRight ? "border-r border-[var(--edge)]" : "",
      cell.borderTop ? "border-t border-[var(--edge)]" : "",
      cell.borderBottom ? "border-b border-[var(--edge)]" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component
        key={cellIdx}
        scope={cell.isHeader ? "col" : undefined}
        className={`px-3.5 py-2 text-sm ${alignClass} ${borders} ${
          cell.isHeader
            ? "font-mono font-semibold text-[var(--ink)] bg-[var(--surface-muted)]"
            : "font-sans text-[var(--ink)]"
        }`}
      >
        <MathText>{formatCellContent(cell.content)}</MathText>
      </Component>
    );
  };

  return (
    <div
      role="region"
      aria-label="Tabel Soal"
      className="table-block-container my-3 overflow-x-auto rounded border border-[var(--edge)] bg-[var(--surface)] p-2 shadow-sm"
    >
      <table className="w-full min-w-[280px] border-collapse" role="table">
        {headerRows.length > 0 && (
          <thead>
            {headerRows.map((row, rIdx) => (
              <tr key={rIdx}>{row.map((cell, cIdx) => renderCell(cell, cIdx))}</tr>
            ))}
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`transition-colors hover:bg-[var(--surface-muted)]/40 ${
                rIdx % 2 === 1 ? "bg-[var(--surface-muted)]/20" : ""
              }`}
            >
              {row.map((cell, cIdx) => renderCell(cell, cIdx))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
