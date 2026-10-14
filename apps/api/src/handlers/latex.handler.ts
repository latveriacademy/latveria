import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { latexRenderRequestSchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import { getCachedLatex, renderLatex } from "../services/latex/latex-renderer.service";

export const latexHandler = new Hono<AppEnv>();

latexHandler.post("/api/latex/render", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = latexRenderRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Payload request LaTeX tidak valid." });
  }

  const result = await renderLatex(parsed.data);
  return c.json(result);
});

latexHandler.get("/api/latex/render/:hash", async (c) => {
  const hash = c.req.param("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    throw new HTTPException(400, { message: "Format hash tidak valid." });
  }

  const cached = await getCachedLatex(hash);
  if (!cached) {
    throw new HTTPException(404, { message: "Hasil kompilasi LaTeX tidak ditemukan." });
  }

  c.header("Content-Type", "image/svg+xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(cached.svg, 200);
});

latexHandler.get("/api/latex/health", async (c) => {
  const workerUrl = process.env.TEX_WORKER_URL || "http://127.0.0.1:3002";
  let workerOnline = false;

  try {
    const res = await fetch(`${workerUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    workerOnline = res.ok;
  } catch {
    workerOnline = false;
  }

  return c.json({
    status: "ok",
    workerUrl,
    workerOnline,
  });
});
