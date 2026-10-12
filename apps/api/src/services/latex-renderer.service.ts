import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { renderPgfplotsSvg } from "@latveria/shared";
import { getDb } from "../lib/db";
import { latexRenders } from "../lib/db/latex-schema";

export interface RenderLatexOptions {
  source: string;
  compiler?: "pdflatex" | "xelatex" | "lualatex" | "latex";
  packages?: string[];
  timeoutMs?: number;
}

export interface RenderLatexResult {
  hash: string;
  svg: string;
  cached: boolean;
  compileTimeMs: number;
  width?: string;
  height?: string;
}

export function computeLatexHash(
  source: string,
  compiler = "pdflatex",
  packages: string[] = [],
): string {
  const normSource = source.trim();
  const normPkgs = [...packages].sort().join(",");
  const payload = `${compiler}|${normPkgs}|${normSource}`;
  return createHash("sha256").update(payload).digest("hex");
}

function generateFallbackSvg(source: string, reason: string): string {
  const safeSource = source.slice(0, 100).replace(/[<>&"']/g, (m) => `&#${m.charCodeAt(0)};`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 140" width="450" height="140" role="img" class="latex-placeholder-svg">
  <rect width="100%" height="100%" fill="#faf7f0" stroke="#c9a347" stroke-width="1.5" rx="6"/>
  <text x="20" y="35" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="13" fill="#143d2b">UNIVERSAL LATEX ENGINE</text>
  <text x="20" y="60" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#666">${reason}</text>
  <rect x="20" y="75" width="410" height="45" fill="#ffffff" stroke="#e2d9c2" rx="4"/>
  <text x="30" y="102" font-family="monospace" font-size="10" fill="#2d3748">${safeSource}...</text>
</svg>`;
}

export async function renderLatex(options: RenderLatexOptions): Promise<RenderLatexResult> {
  const source = options.source.trim();
  const compiler = options.compiler || "pdflatex";
  const packages = options.packages || [];
  const hash = computeLatexHash(source, compiler, packages);

  const db = getDb();

  // 1. Check persistent database cache (instant <5ms hit)
  try {
    const [cached] = await db.select().from(latexRenders).where(eq(latexRenders.hash, hash));

    if (cached) {
      return {
        hash,
        svg: cached.svg,
        cached: true,
        compileTimeMs: 0,
        width: cached.width ?? undefined,
        height: cached.height ?? undefined,
      };
    }
  } catch {
    // Database offline or query skipped; continue with compilation
  }

  // 2. Request compilation from isolated TeX Worker microservice
  const workerUrl = process.env.TEX_WORKER_URL || "http://127.0.0.1:3002";
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

    const res = await fetch(`${workerUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        compiler,
        packages,
        timeoutMs: options.timeoutMs || 15000,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const data = (await res.json()) as {
        success: boolean;
        svg: string;
        compileTimeMs?: number;
        width?: string;
        height?: string;
      };

      if (data.success && data.svg) {
        const compileTimeMs = data.compileTimeMs || Date.now() - startTime;

        // Persist to database cache
        try {
          await db
            .insert(latexRenders)
            .values({
              hash,
              source,
              compiler,
              packages: JSON.stringify(packages),
              svg: data.svg,
              width: data.width,
              height: data.height,
              compileTimeMs,
            })
            .onConflictDoNothing();
        } catch {
          // Ignore cache write error if DB is unavailable
        }

        return {
          hash,
          svg: data.svg,
          cached: false,
          compileTimeMs,
          width: data.width,
          height: data.height,
        };
      }
    }
  } catch (err) {
    console.warn(`[latex-renderer] TeX Worker tidak dapat dihubungi di ${workerUrl}:`, err);
  }

  // 3. Graceful fallback when TeX Worker container is offline
  const pgfSvg = renderPgfplotsSvg(source);
  const fallbackSvg =
    pgfSvg ||
    generateFallbackSvg(source, "Diagram LaTeX akademik siap dikompilasi oleh TeX Live Worker.");

  return {
    hash,
    svg: fallbackSvg,
    cached: false,
    compileTimeMs: Date.now() - startTime,
  };
}

export async function getCachedLatex(hash: string) {
  try {
    const db = getDb();
    const [cached] = await db.select().from(latexRenders).where(eq(latexRenders.hash, hash));

    return cached || null;
  } catch {
    return null;
  }
}
