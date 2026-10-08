export function toCsv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = value == null ? "" : String(value);
          if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
