import { Hono } from "hono";
import { compileLatex } from "./compiler";
import { LATEX_TEST_CORPUS } from "./corpus";
import { latexRenderRequestSchema } from "@latveria/shared";

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
  const parsed = latexRenderRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ success: false, error: "Payload request LaTeX tidak valid." }, 400);
  }

  try {
    const result = await compileLatex(parsed.data);

    if (!result.success) {
      return c.json(result, result.status ?? 422);
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
