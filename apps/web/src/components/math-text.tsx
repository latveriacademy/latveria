import { lazy, Suspense, type ReactNode } from "react";
import { mathSourcePattern } from "@latveria/shared";

const MathFormulaLazy = lazy(() =>
  import("./math-formula").then((module) => ({ default: module.MathFormula })),
);
const TikzDiagramLazy = lazy(() =>
  import("./tikz-diagram").then((module) => ({ default: module.TikzDiagram })),
);
const LatexTableLazy = lazy(() =>
  import("./latex-table").then((module) => ({ default: module.LatexTable })),
);

export function MathText({
  children,
  renderText,
}: {
  children?: string | null;
  renderText?: (text: string, offset: number) => ReactNode;
}) {
  if (!children) return null;
  const parts = String(children).split(mathSourcePattern);
  let offset = 0;
  return (
    <>
      {parts.map((part, index) => {
        const start = offset;
        offset += part.length;
        if (part.startsWith("\\begin{tikzpicture}"))
          return (
            <Suspense fallback={<span className="tikz-pending">{part}</span>} key={index}>
              <TikzDiagramLazy source={part} />
            </Suspense>
          );
        if (part.startsWith("\\begin{tabular}") || part.startsWith("\\begin{array}"))
          return (
            <Suspense fallback={<span className="table-pending">{part}</span>} key={index}>
              <LatexTableLazy source={part} />
            </Suspense>
          );
        const displayMode = part.startsWith("$$") && part.endsWith("$$");
        const inline = part.startsWith("$") && part.endsWith("$");
        if (!displayMode && !inline)
          return renderText ? <span key={index}>{renderText(part, start)}</span> : part;

        const inner = part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1).trim();
        if (inner.startsWith("\\begin{tabular}") || inner.startsWith("\\begin{array}")) {
          return (
            <Suspense fallback={<span className="table-pending">{part}</span>} key={index}>
              <LatexTableLazy source={inner} />
            </Suspense>
          );
        }

        return (
          <Suspense fallback={<span className="math-pending">{part}</span>} key={index}>
            <MathFormulaLazy source={inner} displayMode={displayMode} fallback={part} />
          </Suspense>
        );
      })}
    </>
  );
}
