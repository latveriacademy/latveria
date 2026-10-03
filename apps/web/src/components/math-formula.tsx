import katex from "katex";

export function MathFormula({
  source,
  displayMode = false,
  fallback = source,
}: {
  source: string;
  displayMode?: boolean;
  fallback?: string;
}) {
  try {
    const html = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      trust: false,
      strict: "error",
    });
    return (
      <span
        className={displayMode ? "math-display" : "math-inline"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return (
      <span className="math-error" title="Sintaks LaTeX tidak valid">
        {fallback}
      </span>
    );
  }
}
