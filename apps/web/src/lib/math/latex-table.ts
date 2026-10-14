export interface TableColSpec {
  align: "left" | "center" | "right";
  borderLeft: boolean;
  borderRight: boolean;
}

export interface TableCell {
  content: string;
  align: "left" | "center" | "right";
  borderLeft: boolean;
  borderRight: boolean;
  borderTop: boolean;
  borderBottom: boolean;
  isHeader: boolean;
}

export interface ParsedTable {
  environment: "array" | "tabular";
  columns: TableColSpec[];
  rows: TableCell[][];
}

export function parseLatexTable(source: string): ParsedTable | null {
  const trimmed = source.trim();
  const envMatch = trimmed.match(
    /^\\begin\{(array|tabular)\}(?:\[[^\]]*\])?\{([^}]*)\}([\s\S]*)\\end\{(?:array|tabular)\}$/,
  );
  if (!envMatch) {
    return null;
  }

  const env = envMatch[1] as "array" | "tabular";
  const rawSpec = envMatch[2] ?? "";
  const rawBody = envMatch[3] ?? "";

  // Parse column spec (e.g. "|c|c|c|", "lcr", "| l | r |")
  const columns: TableColSpec[] = [];
  let pendingBorderLeft = false;

  for (let i = 0; i < rawSpec.length; i++) {
    const char = rawSpec[i];
    if (char === "|") {
      if (columns.length === 0) {
        pendingBorderLeft = true;
      } else {
        const last = columns[columns.length - 1];
        if (last) {
          last.borderRight = true;
        }
      }
    } else if (char === "l" || char === "c" || char === "r" || char === "p") {
      // p{...} format: skip {width} if present
      if (char === "p" && rawSpec[i + 1] === "{") {
        const closeIdx = rawSpec.indexOf("}", i + 1);
        if (closeIdx !== -1) {
          i = closeIdx;
        }
      }
      columns.push({
        align: char === "c" ? "center" : char === "r" ? "right" : "left",
        borderLeft:
          columns.length === 0
            ? pendingBorderLeft
            : (columns[columns.length - 1]?.borderRight ?? false),
        borderRight: false,
      });
      pendingBorderLeft = false;
    }
  }

  // If spec was empty or contained no valid align letters, fallback to 1 left column
  if (columns.length === 0) {
    columns.push({ align: "left", borderLeft: false, borderRight: false });
  }

  // Parse body lines
  // Rows in LaTeX table are delimited by \\
  // \hline indicates horizontal border
  const rawTokens = rawBody.split(/\\\\/g);
  const rows: TableCell[][] = [];

  let nextRowHasTopBorder = false;

  for (let rIdx = 0; rIdx < rawTokens.length; rIdx++) {
    const rawChunk = rawTokens[rIdx]!.trim();
    if (!rawChunk) continue;

    // Count and strip leading \hline
    let rowContent = rawChunk;
    let hasTopBorder = nextRowHasTopBorder;
    nextRowHasTopBorder = false;

    while (rowContent.startsWith("\\hline")) {
      hasTopBorder = true;
      if (rows.length > 0) {
        const prevRow = rows[rows.length - 1];
        if (prevRow) {
          for (const cell of prevRow) {
            cell.borderBottom = true;
          }
        }
      }
      rowContent = rowContent.slice(6).trim();
    }

    // Check for trailing \hline(s)
    let hasBottomBorder = false;
    while (rowContent.endsWith("\\hline")) {
      hasBottomBorder = true;
      rowContent = rowContent.slice(0, -6).trim();
    }

    // Also check if \hline is embedded at end
    const trailingHlines = rowContent.match(/(?:\\hline\s*)+$/);
    if (trailingHlines) {
      hasBottomBorder = true;
      rowContent = rowContent.slice(0, -trailingHlines[0].length).trim();
    }

    if (!rowContent) {
      if (hasTopBorder || hasBottomBorder) {
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            for (const cell of lastRow) {
              cell.borderBottom = true;
            }
          }
        } else {
          nextRowHasTopBorder = true;
        }
      }
      continue;
    }

    // Split row into cells on & (not preceded by \)
    const cellStrings = rowContent.split(/(?<!\\)&/g);
    const cells: TableCell[] = [];

    const numCols = Math.max(columns.length, cellStrings.length);
    for (let cIdx = 0; cIdx < numCols; cIdx++) {
      const colSpec = columns[cIdx] ?? {
        align: "left",
        borderLeft: false,
        borderRight: false,
      };
      const text = (cellStrings[cIdx] ?? "").trim();
      cells.push({
        content: text,
        align: colSpec.align,
        borderLeft: colSpec.borderLeft,
        borderRight: colSpec.borderRight,
        borderTop: hasTopBorder,
        borderBottom: hasBottomBorder,
        isHeader: false,
      });
    }

    rows.push(cells);
  }

  // Determine headers: if row 0 has bottom border and there are subsequent rows, row 0 is header
  if (rows.length > 1 && rows[0]?.some((c) => c.borderBottom)) {
    for (const cell of rows[0]) {
      cell.isHeader = true;
    }
  }

  return {
    environment: env,
    columns,
    rows,
  };
}
