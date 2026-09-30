import katex from "katex";

const mathPattern = /(\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?\$)/g;

export function MathText({ children }: { children: string }) {
  const parts = children.split(mathPattern);
  return <>{parts.map((part, index) => {
    const displayMode = part.startsWith("$$") && part.endsWith("$$");
    const inline = part.startsWith("$") && part.endsWith("$");
    if (!displayMode && !inline) return part;
    const source = part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1);
    try {
      const html = katex.renderToString(source, { displayMode, throwOnError: true, trust: false, strict: "error" });
      return <span className={displayMode ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: html }} key={index} />;
    } catch {
      return <span className="math-error" title="Sintaks LaTeX tidak valid" key={index}>{part}</span>;
    }
  })}</>;
}
