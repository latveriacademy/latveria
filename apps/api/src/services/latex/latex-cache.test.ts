import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { computeLatexHash, getCachedLatex } from "./latex-renderer.service";
import { latexHandler } from "../../handlers/latex.handler";

const { where } = vi.hoisted(() => ({ where: vi.fn() }));
vi.mock("../../lib/db", () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where }) }) }),
}));

afterEach(() => vi.unstubAllGlobals());

it("does not report an offline worker or legacy worker placeholder as a successful diagram", async () => {
  where.mockResolvedValue([]);
  for (const response of [null, { success: true, svg: '<svg class="latex-fallback-svg" />' }]) {
    vi.stubGlobal(
      "fetch",
      response === null
        ? vi.fn().mockRejectedValue(new Error("Worker offline"))
        : vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 })),
    );
    const result = await latexHandler.request("/api/latex/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: String.raw`\begin{axis}\addplot {x^2};\end{axis}` }),
    });
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("<svg");
  }
});

it("invalidates placeholder entries saved under the previous renderer version", async () => {
  const cached = {
    source: String.raw`\chemfig{A=B}`,
    compiler: "pdflatex",
    packages: "[]",
    svg: '<svg class="latex-fallback-svg" />',
  };
  where.mockResolvedValue([cached]);
  const oldHash = createHash("sha256").update(`svg-v2|pdflatex||${cached.source}`).digest("hex");
  expect(await getCachedLatex(oldHash)).toBeNull();
});

it("refuses legacy SVG cache URLs but serves current renderer entries", async () => {
  const cached = { source: "\\begin{axis}...\\end{axis}", compiler: "pdflatex", packages: "[]" };
  where.mockResolvedValue([cached]);
  const legacyHash = createHash("sha256").update(`pdflatex||${cached.source}`).digest("hex");
  expect(await getCachedLatex(legacyHash)).toBeNull();
  expect(await getCachedLatex(computeLatexHash(cached.source))).toEqual(cached);
  where.mockResolvedValue([{ ...cached, packages: "invalid JSON" }]);
  expect(await getCachedLatex(computeLatexHash(cached.source))).toBeNull();
});
