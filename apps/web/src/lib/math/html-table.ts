import type React from "react";
import { mathSourcePattern } from "@latveria/shared";

export interface HtmlTableCell {
  kind: "th" | "td";
  content: string;
  colSpan?: number;
  rowSpan?: number;
  style: React.CSSProperties;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
}

export interface HtmlTableRow {
  cells: HtmlTableCell[];
  style: React.CSSProperties;
}

export interface HtmlTableData {
  caption?: string;
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

function attribute(attrs: string, name: string): string | undefined {
  const match = attrs.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function tableText(html: string): string {
  const text = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .split(mathSourcePattern)
    .map((part, index) =>
      index % 2
        ? part
        : part
            .replace(/<br\b[^>]*>/gi, "\n")
            .replace(/<\/?[a-z][\w:-]*(?:\s+[^<>]*)?\s*\/?>/gi, ""),
    )
    .join("");
  if (typeof document !== "undefined") {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value.trim();
  }
  // ponytail: SSR tests decode common/numeric entities; the SPA uses the browser's full decoder.
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00a0",
    times: "×",
    deg: "°",
    le: "≤",
    ge: "≥",
    minus: "−",
  };
  return text
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
      if (!key.startsWith("#")) return entities[key] ?? entity;
      const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "\ufffd";
    })
    .trim();
}

function spanAttribute(attrs: string, name: "colspan" | "rowspan"): number | undefined {
  const value = attribute(attrs, name);
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const span = Number(value);
  if (!Number.isFinite(span) || (name === "colspan" && span === 0)) return undefined;
  return Math.min(span, name === "colspan" ? 1000 : 65534);
}

export function parseHtmlTable(html: string): HtmlTableData | null {
  const tableMatch = html.match(/<table\b([^>]*)>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableAttrs = tableMatch[1];
  const tableContent = tableMatch[2];

  const tableStyle = parseSafeStyle(attribute(tableAttrs, "style"));
  const captionMatch = tableContent.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);

  const rowRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  const rows: HtmlTableRow[] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    const rowAttrs = rowMatch[1];
    const rowContent = rowMatch[2];
    const rowStyle = parseSafeStyle(attribute(rowAttrs, "style"));

    const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    const cells: HtmlTableCell[] = [];
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const kind = cellMatch[1].toLowerCase() as "th" | "td";
      const cellAttrs = cellMatch[2];
      const cellText = tableText(cellMatch[3]);

      const cellStyle = parseSafeStyle(attribute(cellAttrs, "style"));
      const scope = attribute(cellAttrs, "scope");

      cells.push({
        kind,
        content: cellText,
        style: cellStyle,
        colSpan: spanAttribute(cellAttrs, "colspan"),
        rowSpan: spanAttribute(cellAttrs, "rowspan"),
        scope:
          kind === "th" &&
          (scope === "col" || scope === "row" || scope === "colgroup" || scope === "rowgroup")
            ? scope
            : undefined,
      });
    }

    if (cells.length > 0) {
      rows.push({ cells, style: rowStyle });
    }
  }

  return { tableStyle, rows, caption: captionMatch ? tableText(captionMatch[1]) : undefined };
}
