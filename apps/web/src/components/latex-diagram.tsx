import { useEffect, useState } from "react";
import { isComplexLatexDiagram } from "@latveria/shared";
import { parseTikz } from "../lib/tikz";
import { TikzDiagram } from "./tikz-diagram";
import "./latex-diagram.css";

const memorySvgCache = new Map<string, string>();

export function LatexDiagram({ source }: { source: string }) {
  const trimmed = source.trim();

  // 1. Fast-Path: Zero-latency client-side rendering for simple TikZ shapes
  let canUseLocalFastPath = false;
  if (!isComplexLatexDiagram(trimmed)) {
    try {
      parseTikz(trimmed);
      canUseLocalFastPath = true;
    } catch {
      canUseLocalFastPath = false;
    }
  }

  if (canUseLocalFastPath) {
    return <TikzDiagram source={trimmed} />;
  }

  // 2. Full LaTeX Engine Path: Fetch from backend LaTeX rendering service / cache
  return <UniversalLatexEngineView source={trimmed} />;
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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Kompilasi LaTeX gagal (HTTP ${res.status}).`);
        }
        return res.json() as Promise<{ svg: string; hash: string }>;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.svg) {
          memorySvgCache.set(source, data.svg);
          setSvg(data.svg);
        } else {
          throw new Error("SVG output tidak ditemukan.");
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
        <span>Ilustrasi akademik belum dapat ditampilkan: {error}</span>
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
