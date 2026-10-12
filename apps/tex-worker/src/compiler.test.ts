import { describe, expect, it } from "vitest";
import { assembleDocument, compileLatex, detectRequiredPackages } from "./compiler";
import { LATEX_TEST_CORPUS } from "./corpus";
import { app } from "./index";
import { sanitizeSvg } from "./sanitizer";

describe("Universal LaTeX Worker Engine", () => {
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

    const renderRes = await app.request("/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: LATEX_TEST_CORPUS[0]!.source,
      }),
    });
    expect(renderRes.status).toBe(200);
    const renderJson = (await renderRes.json()) as { success: boolean; svg: string };
    expect(renderJson.success).toBe(true);
    expect(renderJson.svg).toContain("<svg");
  });

  it("compiles each item in the visual test corpus without runtime errors", async () => {
    for (const item of LATEX_TEST_CORPUS.slice(0, 5)) {
      const res = await compileLatex({
        source: item.source,
        compiler: item.recommendedCompiler,
        packages: item.requiredPackages,
      });
      expect(res.success).toBe(true);
      expect(res.svg).toContain("<svg");
    }
  });
});
