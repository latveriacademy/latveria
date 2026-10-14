import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { computeLatexHash, getCachedLatex } from "./latex-renderer.service";

const { where } = vi.hoisted(() => ({ where: vi.fn() }));
vi.mock("../../lib/db", () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where }) }) }),
}));

it("refuses legacy SVG cache URLs but serves current renderer entries", async () => {
  const cached = { source: "\\begin{axis}...\\end{axis}", compiler: "pdflatex", packages: "[]" };
  where.mockResolvedValue([cached]);
  const legacyHash = createHash("sha256").update(`pdflatex||${cached.source}`).digest("hex");
  expect(await getCachedLatex(legacyHash)).toBeNull();
  expect(await getCachedLatex(computeLatexHash(cached.source))).toEqual(cached);
  where.mockResolvedValue([{ ...cached, packages: "invalid JSON" }]);
  expect(await getCachedLatex(computeLatexHash(cached.source))).toBeNull();
});
