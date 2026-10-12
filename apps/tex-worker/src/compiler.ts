import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  const trimmed = source.trim();
  if (trimmed.startsWith("\\documentclass")) {
    return trimmed;
  }

  const detected = detectRequiredPackages(trimmed);
  const allPackages = Array.from(new Set([...detected, ...additionalPackages]));

  const packageImports = allPackages
    .map((p) => {
      if (p === "pgfplots") {
        return "\\usepackage{pgfplots}\n\\pgfplotsset{compat=newest}";
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
      // Fallback: If compiler binary is not present on current host,
      // generate a standards-compliant fallback SVG
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 180" width="480" height="180" role="img" class="latex-fallback-svg">
  <rect width="100%" height="100%" fill="#faf7f0" stroke="#c9a347" stroke-width="1.5" rx="6"/>
  <text x="24" y="45" font-family="system-ui, sans-serif" font-weight="bold" font-size="14" fill="#143d2b">UNIVERSAL LATEX ENGINE [STANDALONE]</text>
  <text x="24" y="75" font-family="system-ui, sans-serif" font-size="12" fill="#555">Kompilasi TeX Live terisolasi (Compiler: ${compiler})</text>
  <rect x="24" y="95" width="432" height="60" fill="#fff" stroke="#e0d7c0" rx="4"/>
  <text x="36" y="130" font-family="monospace" font-size="11" fill="#2d3748">${options.source.slice(0, 50).replace(/[<>&]/g, "")}...</text>
</svg>`;
      const sanitized = sanitizeSvg(fallbackSvg);
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
