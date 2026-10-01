import { lazy, Suspense } from "react";

const MathFormulaLazy = lazy(() => import("./math-formula").then((module) => ({ default: module.MathFormula })));
const TikzDiagramLazy = lazy(() => import("./tikz-diagram").then((module) => ({ default: module.TikzDiagram })));

const mathPattern = /(\\begin\{tikzpicture\}[\s\S]*?(?:\\end\{tikzpicture\}|$)|\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?\$)/g;

export function MathText({ children }: { children?: string | null }) {
  if (!children) return null;
  const parts = String(children).split(mathPattern);
  return <>{parts.map((part, index) => {
    if (part.startsWith("\\begin{tikzpicture}")) return <Suspense fallback={<span className="tikz-pending">{part}</span>} key={index}><TikzDiagramLazy source={part} /></Suspense>;
    const displayMode = part.startsWith("$$") && part.endsWith("$$");
    const inline = part.startsWith("$") && part.endsWith("$");
    if (!displayMode && !inline) return part;
    return <Suspense fallback={<span className="math-pending">{part}</span>} key={index}><MathFormulaLazy source={part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1)} displayMode={displayMode} fallback={part} /></Suspense>;
  })}</>;
}
