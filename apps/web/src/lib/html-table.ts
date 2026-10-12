import type React from "react";

export interface HtmlTableCell {
  kind: "th" | "td";
  content: string;
  colSpan?: number;
  rowSpan?: number;
  style: React.CSSProperties;
  scope?: "col" | "row";
}

export interface HtmlTableRow {
  cells: HtmlTableCell[];
  style: React.CSSProperties;
}

export interface HtmlTableData {
  rows: HtmlTableRow[];
  tableStyle: React.CSSProperties;
}

const ALLOWED_STYLES: Record<string, keyof React.CSSProperties> = {
  "background-color": "backgroundColor",
  background: "backgroundColor",
  color: "color",
  "text-align": "textAlign",
  "border-collapse": "borderCollapse",
  border: "border",
  "border-color": "borderColor",
  "border-width": "borderWidth",
  "border-style": "borderStyle",
  "border-left": "borderLeft",
  "border-right": "borderRight",
  "border-top": "borderTop",
  "border-bottom": "borderBottom",
  width: "width",
  "min-width": "minWidth",
  "max-width": "maxWidth",
  padding: "padding",
  margin: "margin",
};

export function parseSafeStyle(styleStr?: string | null): React.CSSProperties {
  if (!styleStr || typeof styleStr !== "string") return {};
  const result: Record<string, string> = {};

  const declarations = styleStr.split(";");
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();

    if (/url\(|javascript:|expression\(|behavior:/i.test(val)) continue;

    const reactKey = ALLOWED_STYLES[prop];
    if (reactKey) {
      result[reactKey as string] = val;
    }
  }

  return result as React.CSSProperties;
}

export function isHtmlTable(source: string): boolean {
  const trimmed = source.trim();
  return /^<table\b[\s\S]*?<\/table>$/i.test(trimmed);
}

export function parseHtmlTable(html: string): HtmlTableData | null {
  const tableMatch = html.match(/<table\b([^>]*)>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableAttrs = tableMatch[1];
  const tableContent = tableMatch[2];

  const tableStyleMatch = tableAttrs.match(/style=["']([^"']*)["']/i);
  const tableStyle = parseSafeStyle(tableStyleMatch ? tableStyleMatch[1] : "");

  const rowRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  const rows: HtmlTableRow[] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    const rowAttrs = rowMatch[1];
    const rowContent = rowMatch[2];
    const rowStyleMatch = rowAttrs.match(/style=["']([^"']*)["']/i);
    const rowStyle = parseSafeStyle(rowStyleMatch ? rowStyleMatch[1] : "");

    const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    const cells: HtmlTableCell[] = [];
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const kind = cellMatch[1].toLowerCase() as "th" | "td";
      const cellAttrs = cellMatch[2];
      const cellText = cellMatch[3].trim();

      const cellStyleMatch = cellAttrs.match(/style=["']([^"']*)["']/i);
      const cellStyle = parseSafeStyle(cellStyleMatch ? cellStyleMatch[1] : "");

      const colSpanMatch = cellAttrs.match(/colspan=["']?(\d+)["']?/i);
      const rowSpanMatch = cellAttrs.match(/rowspan=["']?(\d+)["']?/i);

      cells.push({
        kind,
        content: cellText,
        style: cellStyle,
        colSpan: colSpanMatch ? Number(colSpanMatch[1]) : undefined,
        rowSpan: rowSpanMatch ? Number(rowSpanMatch[1]) : undefined,
        scope: kind === "th" ? "col" : undefined,
      });
    }

    if (cells.length > 0) {
      rows.push({ cells, style: rowStyle });
    }
  }

  return { tableStyle, rows };
}
