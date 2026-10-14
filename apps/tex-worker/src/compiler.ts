import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderPgfplotsSvg } from "@latveria/shared";
import { sanitizeSvg, type SanitizedSvgResult } from "./sanitizer";

export interface CompileOptions {
  source: string;
  compiler?: "pdflatex" | "xelatex" | "lualatex" | "latex";
  packages?: string[];
  timeoutMs?: number;
}

export interface CompileResult extends SanitizedSvgResult {
  success: boolean;
  compileTimeMs: number;
  compiler: string;
  error?: string;
  log?: string;
  status?: 503;
}

/**
 * Automatically inspects the source and detects required packages.
 */
export function detectRequiredPackages(source: string): string[] {
  const pkgs = new Set<string>();
  if (/\\begin\{circuitikz\}/.test(source)) pkgs.add("circuitikz");
  if (/\\chemfig\b/.test(source)) pkgs.add("chemfig");
  if (/\\begin\{axis\}|\\pgfplotsset\b/.test(source)) pkgs.add("pgfplots");
  if (/\\begin\{forest\}/.test(source)) pkgs.add("forest");
  if (/\\begin\{qtree\}/.test(source)) pkgs.add("qtree");
  if (/\\tkz[A-Za-z]+\b/.test(source)) pkgs.add("tkz-euclide");
  if (/\\begin\{pspicture\}|\\psline\b/.test(source)) pkgs.add("pstricks");
  return Array.from(pkgs);
}

/**
 * Wraps a LaTeX snippet into a standalone document if not already complete.
 */
export function assembleDocument(source: string, additionalPackages: string[] = []): string {
  let trimmed = source.trim();
  if (trimmed.startsWith("\\documentclass")) {
    return trimmed;
  }

  // Strip wrapping $$ or \[ if provided
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
    trimmed = trimmed.slice(2, -2).trim();
  } else if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
    trimmed = trimmed.slice(2, -2).trim();
  }

  // Wrap raw axis in tikzpicture if needed
  if (trimmed.startsWith("\\begin{axis}") && !trimmed.startsWith("\\begin{tikzpicture}")) {
    trimmed = `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
  }

  const detected = detectRequiredPackages(trimmed);
  const allPackages = Array.from(new Set([...detected, ...additionalPackages]));

  const packageImports = allPackages
    .map((p) => {
      if (p === "pgfplots") {
        return "\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}";
      }
      return `\\usepackage{${p}}`;
    })
    .join("\n");

  return `\\documentclass[tikz,border=4pt]{standalone}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{xcolor}
\\usepackage{graphicx}
${packageImports}
\\begin{document}
${trimmed}
\\end{document}
`;
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timer: NodeJS.Timeout | null = null;

    try {
      const child = spawn(command, args, { cwd });

      timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Proses kompilasi '${command}' timeout (${timeoutMs}ms).`));
      }, timeoutMs);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (timer) clearTimeout(timer);
        resolve({ code: code ?? 0, stdout, stderr });
      });

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      reject(err);
    }
  });
}

/**
 * Primary multi-pipeline LaTeX compilation engine.
 */
export async function compileLatex(options: CompileOptions): Promise<CompileResult> {
  const startTime = Date.now();
  const compiler = options.compiler || "pdflatex";
  const timeoutMs = options.timeoutMs || 15000;
  const docContent = assembleDocument(options.source, options.packages || []);

  const tempDir = path.join(os.tmpdir(), `tex-job-${crypto.randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const inputTex = path.join(tempDir, "document.tex");
  await fs.writeFile(inputTex, docContent, "utf8");

  try {
    // 1. Run Compiler with strict sandboxing (-no-shell-escape)
    const compileArgs = [
      "-no-shell-escape",
      "-interaction=nonstopmode",
      "-halt-on-error",
      "document.tex",
    ];

    let compileRes: { code: number; stdout: string; stderr: string };
    try {
      compileRes = await runProcess(compiler, compileArgs, tempDir, timeoutMs);
    } catch {
      const pgfSvg = renderPgfplotsSvg(options.source);
      if (!pgfSvg)
        return {
          success: false,
          svg: "",
          compileTimeMs: Date.now() - startTime,
          compiler,
          status: 503,
          error: "Compiler LaTeX belum tersedia atau gagal dijalankan.",
        };
      const sanitized = sanitizeSvg(pgfSvg);
      return {
        success: true,
        compileTimeMs: Date.now() - startTime,
        compiler,
        ...sanitized,
      };
    }

    if (compileRes.code !== 0) {
      return {
        success: false,
        svg: "",
        compileTimeMs: Date.now() - startTime,
        compiler,
        error: `Kompilasi LaTeX gagal dengan kode ${compileRes.code}.`,
        log: compileRes.stdout + "\n" + compileRes.stderr,
      };
    }

    // 2. Convert Output to SVG
    const outputPdf = path.join(tempDir, "document.pdf");
    const outputDvi = path.join(tempDir, "document.dvi");
    const outputSvg = path.join(tempDir, "document.svg");

    let convertSuccess = false;

    // Pipeline A: dvisvgm from PDF
    try {
      const dvisvgmArgs = ["--pdf", "--exact", "--bbox=papersize", outputPdf, "-o", outputSvg];
      const conv = await runProcess("dvisvgm", dvisvgmArgs, tempDir, 8000);
      if (conv.code === 0) convertSuccess = true;
    } catch {
      // ignore
    }

    // Pipeline B: pdftocairo fallback
    if (!convertSuccess) {
      try {
        const pdftocairoArgs = ["-svg", outputPdf, outputSvg];
        const conv = await runProcess("pdftocairo", pdftocairoArgs, tempDir, 8000);
        if (conv.code === 0) convertSuccess = true;
      } catch {
        // ignore
      }
    }

    // Pipeline C: dvisvgm from DVI
    if (!convertSuccess) {
      try {
        const dvisvgmArgs = ["-n", "-v", "0", outputDvi, "-o", outputSvg];
        const conv = await runProcess("dvisvgm", dvisvgmArgs, tempDir, 8000);
        if (conv.code === 0) convertSuccess = true;
      } catch {
        // ignore
      }
    }

    if (!convertSuccess) {
      throw new Error("Konversi PDF/DVI ke SVG gagal; dvisvgm atau pdftocairo tidak tersedia.");
    }

    const rawSvg = await fs.readFile(outputSvg, "utf8");
    const sanitized = sanitizeSvg(rawSvg);

    return {
      success: true,
      compileTimeMs: Date.now() - startTime,
      compiler,
      ...sanitized,
    };
  } finally {
    // Immediate cleanup of isolated scratch directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
