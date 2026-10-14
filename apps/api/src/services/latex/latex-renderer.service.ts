import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { isLatexRenderPlaceholder, renderPgfplotsSvg } from "@latveria/shared";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../../lib/db";
import { latexRenders } from "../../lib/db/latex-schema";

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
  // Invalidate earlier entries that may contain a success-shaped error placeholder.
  const payload = `svg-v3|${compiler}|${normPkgs}|${normSource}`;
  return createHash("sha256").update(payload).digest("hex");
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

    if (cached && !isLatexRenderPlaceholder(cached.svg)) {
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
  let failureStatus: 422 | 503 = 503;

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

      if (data.success && data.svg && !isLatexRenderPlaceholder(data.svg)) {
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
    } else if (res.status === 422) {
      failureStatus = 422;
    }
  } catch (err) {
    console.warn(`[latex-renderer] TeX Worker tidak dapat dihubungi di ${workerUrl}:`, err);
  }

  // Native rendering is a real diagram; a placeholder must never count as success.
  const pgfSvg = renderPgfplotsSvg(source);
  if (!pgfSvg)
    throw new HTTPException(failureStatus, {
      message:
        failureStatus === 422
          ? "Diagram LaTeX tidak dapat dikompilasi. Periksa kode sumber."
          : "Layanan render LaTeX belum tersedia. Coba lagi nanti.",
    });

  return {
    hash,
    svg: pgfSvg,
    cached: false,
    compileTimeMs: Date.now() - startTime,
  };
}

export async function getCachedLatex(hash: string) {
  try {
    const db = getDb();
    const [cached] = await db.select().from(latexRenders).where(eq(latexRenders.hash, hash));

    if (
      !cached ||
      isLatexRenderPlaceholder(cached.svg) ||
      computeLatexHash(cached.source, cached.compiler, JSON.parse(cached.packages)) !== hash
    )
      return null;
    return cached;
  } catch {
    return null;
  }
}
