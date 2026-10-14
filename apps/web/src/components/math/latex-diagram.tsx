import { useEffect, useState } from "react";
import {
  isComplexLatexDiagram,
  isLatexRenderPlaceholder,
  renderPgfplotsSvg,
} from "@latveria/shared";
import { parseTikz } from "../../lib/math/tikz";
import { TikzDiagram } from "./tikz-diagram";
import "./latex-diagram.css";

const memorySvgCache = new Map<string, string>();

export function LatexDiagram({ source }: { source: string }) {
  let cleanSource = source.trim();

  // Strip wrapping delimiters if present
  if (cleanSource.startsWith("$$") && cleanSource.endsWith("$$")) {
    cleanSource = cleanSource.slice(2, -2).trim();
  } else if (cleanSource.startsWith("\\[") && cleanSource.endsWith("\\]")) {
    cleanSource = cleanSource.slice(2, -2).trim();
  }

  // Wrap raw axis in tikzpicture if needed
  if (cleanSource.startsWith("\\begin{axis}") && !cleanSource.startsWith("\\begin{tikzpicture}")) {
    cleanSource = `\\begin{tikzpicture}\n${cleanSource}\n\\end{tikzpicture}`;
  }

  // 1. Fast-Path: Zero-latency client-side rendering for simple TikZ shapes
  let canUseLocalFastPath = false;
  if (!isComplexLatexDiagram(cleanSource)) {
    try {
      parseTikz(cleanSource);
      canUseLocalFastPath = true;
    } catch {
      canUseLocalFastPath = false;
    }
  }

  if (canUseLocalFastPath) {
    return <TikzDiagram source={cleanSource} />;
  }

  // 2. Fast-Path for PGFPlots native visualizer
  const pgfplotsSvg = renderPgfplotsSvg(cleanSource);
  if (pgfplotsSvg) {
    return (
      <span
        className="latex-diagram pgfplots-visual-diagram flex justify-center my-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: pgfplotsSvg }}
      />
    );
  }

  // 3. Full LaTeX Engine Path: Fetch from backend LaTeX rendering service / cache
  return <UniversalLatexEngineView source={cleanSource} />;
}

function UniversalLatexEngineView({ source }: { source: string }) {
  const [svg, setSvg] = useState<string | null>(() => memorySvgCache.get(source) || null);
  const [loading, setLoading] = useState<boolean>(() => !memorySvgCache.has(source));
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (memorySvgCache.has(source)) {
      setSvg(memorySvgCache.get(source)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/latex/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : `Kompilasi LaTeX gagal (HTTP ${res.status}).`,
          );
        }
        return res.json() as Promise<{ svg: string; hash: string }>;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.svg && !isLatexRenderPlaceholder(data.svg)) {
          memorySvgCache.set(source, data.svg);
          setSvg(data.svg);
        } else {
          throw new Error(
            "Diagram belum dapat dirender. Coba lagi nanti atau periksa kode sumber.",
          );
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Gagal mengompilasi diagram LaTeX.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [source]);

  if (loading) {
    return (
      <span className="latex-diagram-loading">
        <span>Menyiapkan ilustrasi LaTeX…</span>
      </span>
    );
  }

  if (error || !svg) {
    return (
      <span className="latex-diagram-error">
        <span>Diagram belum dapat ditampilkan: {error}</span>
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          className="text-xs text-[var(--gold)] underline cursor-pointer self-start"
        >
          {showSource ? "Sembunyikan kode sumber" : "Lihat kode sumber LaTeX"}
        </button>
        {showSource && <pre>{source}</pre>}
      </span>
    );
  }

  return <span className="latex-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
