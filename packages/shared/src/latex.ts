import { z } from "zod";

export const latexCompilerSchema = z.enum(["pdflatex", "xelatex", "lualatex", "latex"]);
export type LatexCompiler = z.infer<typeof latexCompilerSchema>;

export const latexRenderRequestSchema = z.object({
  source: z.string().trim().min(1).max(50000),
  compiler: latexCompilerSchema.optional().default("pdflatex"),
  packages: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  timeoutMs: z.number().int().min(1000).max(30000).optional().default(15000),
});
export type LatexRenderRequest = z.infer<typeof latexRenderRequestSchema>;

export const latexRenderResponseSchema = z.object({
  hash: z.string(),
  svg: z.string(),
  cached: z.boolean(),
  compileTimeMs: z.number().int(),
  compiler: latexCompilerSchema,
  width: z.string().optional(),
  height: z.string().optional(),
});
export type LatexRenderResponse = z.infer<typeof latexRenderResponseSchema>;

export function isLatexRenderPlaceholder(svg: string): boolean {
  return /class=["'][^"']*\blatex-(?:placeholder|fallback)-svg\b/.test(svg);
}

export const LATEX_DIAGRAM_ENVIRONMENTS = [
  "tikzpicture",
  "circuitikz",
  "pspicture",
  "forest",
  "qtree",
  "axis",
] as const;

export function isComplexLatexDiagram(source: string): boolean {
  const s = source.trim();
  // Explicitly advanced packages/environments
  if (
    /\\begin\{(?:circuitikz|pspicture|forest|qtree|axis)\}/.test(s) ||
    /\\chemfig\{/.test(s) ||
    /\\(pgfplotsset|tkz[A-Za-z]+|psline|pspolygon|pscircle|shade|shadedraw)\b/.test(s)
  ) {
    return true;
  }

  // If it's a tikzpicture, check if it contains advanced syntax unsupported by local parser
  if (/\\begin\{tikzpicture\}/.test(s)) {
    if (
      /\\(?:foreach|clip|shade|shadedraw|path|matrix|graph|datavisualization)\b/.test(s) ||
      /\b(?:controls|arc|plot|grid)\b/.test(s) ||
      /\[[^\]]*\b(?:red|green|blue|yellow|cyan|magenta|black|white|gray|darkgray|lightgray|brown|lime|olive|orange|pink|purple|teal|violet)\b[^\]]*\]/.test(
        s,
      )
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function isLatexDiagramEnvironment(text: string): boolean {
  const s = text.trim();
  return (
    s.startsWith("\\begin{tikzpicture}") ||
    s.startsWith("\\begin{axis}") ||
    s.startsWith("\\begin{circuitikz}") ||
    s.startsWith("\\begin{forest}") ||
    s.startsWith("\\begin{pspicture}") ||
    s.startsWith("\\chemfig")
  );
}

export * from "./pgfplots-svg";
