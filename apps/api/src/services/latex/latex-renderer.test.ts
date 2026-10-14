import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { app } from "../../app";
import { computeLatexHash, renderLatex } from "./latex-renderer.service";

describe("LaTeX Renderer Service", () => {
  const chart = String.raw`\begin{axis}[ybar,xtick=data,symbolic x coords={A},grid style=dashed]\addplot coordinates {(A,5)};\end{axis}`;
  afterEach(() => vi.unstubAllGlobals());
  it("computes deterministic SHA-256 hashes for LaTeX snippets", () => {
    const src = "\\begin{circuitikz}\\draw (0,0) to[R] (2,0);\\end{circuitikz}";
    const hash1 = computeLatexHash(src, "pdflatex", ["circuitikz", "amsmath"]);
    const hash2 = computeLatexHash(src, "pdflatex", ["amsmath", "circuitikz"]);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).not.toBe(
      createHash("sha256").update(`pdflatex|amsmath,circuitikz|${src}`).digest("hex"),
    );
  });

  it("produces an actual native SVG when the worker is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Worker offline")));
    const result = await renderLatex({
      source: chart,
      compiler: "pdflatex",
      packages: ["tikz"],
      timeoutMs: 1000,
    });

    expect(result.hash).toBeDefined();
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("pgfplots-bar-chart");
    expect(result.svg).not.toContain("UNIVERSAL LATEX ENGINE");
  }, 15000);

  it("exposes /api/latex/health and /api/latex/render endpoints via app", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Worker offline")));
    const health = await app.request("/api/latex/health");
    expect(health.status).toBe(200);
    const healthJson = await health.json();
    expect(healthJson).toHaveProperty("status", "ok");
    expect(healthJson).toHaveProperty("workerUrl");

    const render = await app.request("/api/latex/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: chart,
        compiler: "pdflatex",
      }),
    });
    expect(render.status).toBe(200);
    const renderJson = (await render.json()) as { hash: string; svg: string };
    expect(renderJson.hash).toBeDefined();
    expect(renderJson.svg).toContain("<svg");
  });

  it("rejects invalid render requests with 400", async () => {
    const invalid = await app.request("/api/latex/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "" }),
    });
    expect(invalid.status).toBe(400);
  });
});
