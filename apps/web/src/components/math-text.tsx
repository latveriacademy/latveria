import { lazy, Suspense, type ReactNode } from "react";
import { mathSourcePattern } from "@latveria/shared";

const MathFormulaLazy = lazy(() =>
  import("./math-formula").then((module) => ({ default: module.MathFormula })),
);
const TikzDiagramLazy = lazy(() =>
  import("./tikz-diagram").then((module) => ({ default: module.TikzDiagram })),
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
        const displayMode = part.startsWith("$$") && part.endsWith("$$");
        const inline = part.startsWith("$") && part.endsWith("$");
        if (!displayMode && !inline)
          return renderText ? <span key={index}>{renderText(part, start)}</span> : part;
        return (
          <Suspense fallback={<span className="math-pending">{part}</span>} key={index}>
            <MathFormulaLazy
              source={part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1)}
              displayMode={displayMode}
              fallback={part}
            />
          </Suspense>
        );
      })}
    </>
  );
}
