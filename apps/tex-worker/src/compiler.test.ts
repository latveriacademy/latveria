import { afterEach, describe, expect, it, vi } from "vitest";
import * as childProcess from "node:child_process";
import { assembleDocument, compileLatex, detectRequiredPackages } from "./compiler";
import { LATEX_TEST_CORPUS } from "./corpus";
import { app } from "./index";
import { sanitizeSvg } from "./sanitizer";
vi.mock("node:child_process", { spy: true });

describe("Universal LaTeX Worker Engine", () => {
  afterEach(() => vi.restoreAllMocks());
  it("returns a clear failure without a placeholder when the compiler cannot start", async () => {
    vi.mocked(childProcess.spawn).mockImplementationOnce(() => {
      throw new Error("Compiler unavailable");
    });
    const result = await compileLatex({
      source: String.raw`\begin{axis}\addplot {x^2};\end{axis}`,
    });
    expect(result).toMatchObject({ success: false, svg: "", status: 503 });
    expect(result.error).toContain("Compiler");
  });
  it("detects specialized LaTeX packages automatically", () => {
    expect(detectRequiredPackages("\\begin{circuitikz}\\draw (0,0);\\end{circuitikz}")).toContain(
      "circuitikz",
    );
    expect(detectRequiredPackages("\\chemfig{*6(-=-=-=)}")).toContain("chemfig");
    expect(detectRequiredPackages("\\begin{axis}\\addplot{x};\\end{axis}")).toContain("pgfplots");
    expect(detectRequiredPackages("\\begin{forest}[A[B]]\\end{forest}")).toContain("forest");
    expect(detectRequiredPackages("\\tkzDefPoint(0,0){A}")).toContain("tkz-euclide");
    expect(detectRequiredPackages("\\begin{pspicture}(0,0)(2,2)\\end{pspicture}")).toContain(
      "pstricks",
    );
  });

  it("renders a supported native bar chart when the compiler cannot start", async () => {
    vi.mocked(childProcess.spawn).mockImplementationOnce(() => {
      throw new Error("Compiler unavailable");
    });
    const result = await compileLatex({
      source: String.raw`\begin{axis}[ybar,xtick=data,symbolic x coords={A},grid style=dashed]\addplot coordinates {(A,5)};\end{axis}`,
    });
    expect(result.success).toBe(true);
    expect(result.svg).toContain("pgfplots-bar-chart");
    expect(result.svg).not.toContain("latex-fallback-svg");
  });

  it("assembles complete documents from snippets", () => {
    const doc = assembleDocument("\\begin{circuitikz}\\draw (0,0);\\end{circuitikz}", ["amsmath"]);
    expect(doc).toContain("\\documentclass[tikz,border=4pt]{standalone}");
    expect(doc).toContain("\\usepackage{circuitikz}");
    expect(doc).toContain("\\usepackage{amsmath}");
    expect(doc).toContain("\\begin{document}");
    expect(doc).toContain("\\end{document}");
  });

  it("does not re-wrap an already complete document", () => {
    const complete = "\\documentclass{article}\\begin{document}Hello\\end{document}";
    expect(assembleDocument(complete)).toBe(complete);
  });

  it("sanitizes dangerous SVG payloads effectively", () => {
    const unsafe = `<svg width="100" height="100" viewBox="0 0 100 100" onload="alert('XSS')">
      <script>alert(1);</script>
      <circle cx="50" cy="50" r="40" fill="red" onclick="evil()" />
      <a href="javascript:void(0)"><text x="10" y="20">Click</text></a>
    </svg>`;

    const res = sanitizeSvg(unsafe);
    expect(res.svg).not.toContain("<script");
    expect(res.svg).not.toContain("onload");
    expect(res.svg).not.toContain("onclick");
    expect(res.svg).not.toContain("javascript:");
    expect(res.svg).toContain("<circle");
    expect(res.width).toBe("100");
    expect(res.height).toBe("100");
  });

  it("serves health, corpus, and compilation endpoints", async () => {
    const healthRes = await app.request("/health");
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson).toMatchObject({ status: "ok", service: "latveria-tex-worker" });

    const corpusRes = await app.request("/corpus");
    expect(corpusRes.status).toBe(200);
    const corpusJson = (await corpusRes.json()) as { total: number };
    expect(corpusJson.total).toBe(LATEX_TEST_CORPUS.length);
    expect(corpusJson.total).toBeGreaterThanOrEqual(10);

    vi.mocked(childProcess.spawn).mockImplementationOnce(() => {
      throw new Error("Compiler unavailable");
    });
    const renderRes = await app.request("/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: LATEX_TEST_CORPUS[0]!.source,
      }),
    });
    const renderJson = await renderRes.json();
    expect(renderRes.status).toBe(503);
    expect(renderJson).toMatchObject({ success: false, svg: "", error: expect.any(String) });
  });

  it("reports compiler-unavailable errors honestly for corpus snippets", async () => {
    for (const item of LATEX_TEST_CORPUS.slice(0, 5)) {
      vi.mocked(childProcess.spawn).mockImplementationOnce(() => {
        throw new Error("Compiler unavailable");
      });
      const res = await compileLatex({
        source: item.source,
        compiler: item.recommendedCompiler,
        packages: item.requiredPackages,
      });
      expect(res).toMatchObject({
        success: false,
        svg: "",
        status: 503,
        error: expect.any(String),
      });
    }
  });
});
