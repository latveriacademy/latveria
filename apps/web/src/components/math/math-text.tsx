import { lazy, Suspense, type ReactNode } from "react";
import { isLatexDiagramEnvironment, mathSourcePattern } from "@latveria/shared";

const MathFormulaLazy = lazy(() =>
  import("./math-formula").then((module) => ({ default: module.MathFormula })),
);
const LatexDiagramLazy = lazy(() =>
  import("./latex-diagram").then((module) => ({ default: module.LatexDiagram })),
);
const LatexTableLazy = lazy(() =>
  import("./latex-table").then((module) => ({ default: module.LatexTable })),
);
const HtmlTableLazy = lazy(() =>
  import("./html-table").then((module) => ({ default: module.HtmlTable })),
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
        if (/^<table\b/i.test(part.trim()))
          return (
            <Suspense fallback={<span className="table-pending">{part}</span>} key={index}>
              <HtmlTableLazy source={part} />
            </Suspense>
          );
        if (isLatexDiagramEnvironment(part))
          return (
            <Suspense fallback={<span className="tikz-pending">{part}</span>} key={index}>
              <LatexDiagramLazy source={part} />
            </Suspense>
          );
        if (part.startsWith("\\begin{tabular}") || part.startsWith("\\begin{array}"))
          return (
            <Suspense fallback={<span className="table-pending">{part}</span>} key={index}>
              <LatexTableLazy source={part} />
            </Suspense>
          );
        const bracketMode = part.startsWith("\\[") && part.endsWith("\\]");
        const displayMode = bracketMode || (part.startsWith("$$") && part.endsWith("$$"));
        const inline = part.startsWith("$") && part.endsWith("$");
        if (!displayMode && !inline)
          return renderText ? <span key={index}>{renderText(part, start)}</span> : part;

        const inner = part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1).trim();
        if (isLatexDiagramEnvironment(inner)) {
          return (
            <Suspense fallback={<span className="tikz-pending">{part}</span>} key={index}>
              <LatexDiagramLazy source={inner} />
            </Suspense>
          );
        }
        if (/^<table\b/i.test(inner)) {
          return (
            <Suspense fallback={<span className="table-pending">{part}</span>} key={index}>
              <HtmlTableLazy source={inner} />
            </Suspense>
          );
        }
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
