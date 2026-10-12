import { Hono } from "hono";
import { compileLatex } from "./compiler";
import { LATEX_TEST_CORPUS } from "./corpus";

export const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "latveria-tex-worker",
    version: "1.0.0",
    engine: "TeX Live Universal",
  });
});

app.get("/corpus", (c) => {
  return c.json({
    total: LATEX_TEST_CORPUS.length,
    items: LATEX_TEST_CORPUS,
  });
});

app.post("/render", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    source?: string;
    compiler?: "pdflatex" | "xelatex" | "lualatex" | "latex";
    packages?: string[];
    timeoutMs?: number;
  } | null;

  if (!body || !body.source || typeof body.source !== "string" || !body.source.trim()) {
    return c.json({ success: false, error: "Parameter 'source' wajib diisi." }, 400);
  }

  try {
    const result = await compileLatex({
      source: body.source,
      compiler: body.compiler,
      packages: body.packages,
      timeoutMs: body.timeoutMs,
    });

    if (!result.success) {
      return c.json(result, 422);
    }

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan kompilasi.";
    return c.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});

const port = Number(process.env.PORT || 3002);
export default {
  port,
  fetch: app.fetch,
};

if (import.meta.main) {
  console.info(`[tex-worker] Universal LaTeX Engine listening on port ${port}`);
}
