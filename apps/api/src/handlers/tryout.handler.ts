import { Hono } from "hono";
import type { AppEnv } from "../types";
import {
  bulkRemoveQuestionsFromSection,
  createAdminTryout,
  createTryoutSection,
  deleteAdminTryout,
  deleteTryoutSection,
  getAdminTryout,
  importSectionQuestions,
  listAdminTryouts,
  removeQuestionFromSection,
  reorderSectionQuestions,
  updateAdminTryout,
  updateTryoutSection,
} from "../services/tryout/admin-tryout.service";
import { importTryoutBatch, importSectionBatch } from "../services/tryout/tryout-import.service";
import { HTTPException } from "hono/http-exception";

async function readImport(c: import("hono").Context) {
  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > 200_000)
    throw new HTTPException(413, { message: "JSON maksimal 200 KB." });
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HTTPException(400, { message: "Sintaks JSON tidak valid." });
  }
}
import {
  advanceTryoutSubtest,
  autosaveTryout,
  getTryoutSession,
  startTryout,
  submitTryoutSubtest,
} from "../services/tryout/tryout.service";
import { getTryoutHistory } from "../services/tryout/tryout-history.service";
import { generateTryoutCertificate } from "../services/tryout/tryout-certificate.service";
import {
  getAdminTryoutSection,
  updateTryoutQuestion,
  deleteScopedTryoutSection,
} from "../services/tryout/tryout-question.service";

export const tryoutHandler = new Hono<AppEnv>();

// ==========================================
// LEARNER TRYOUT (BATTLE WORLD) ENDPOINTS
// ==========================================

tryoutHandler.post("/api/learner/tryouts/start/:packageId", async (c) => {
  const result = await startTryout(c.get("user").id, c.req.param("packageId"));
  const { _status, ...session } = result;
  return c.json(session, _status);
});

tryoutHandler.get("/api/learner/tryouts/history", async (c) =>
  c.json(await getTryoutHistory(c.get("user").id)),
);
tryoutHandler.get("/api/learner/tryouts/:sessionId", async (c) => {
  const result = await getTryoutSession(c.get("user").id, c.req.param("sessionId"));
  return c.json(result);
});

tryoutHandler.get("/api/learner/tryouts/:sessionId/certificate.pdf", async (c) => {
  const { pdfBuffer, filename } = await generateTryoutCertificate(
    c.get("user").id,
    c.req.param("sessionId"),
  );
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  return c.body(pdfBuffer.buffer as ArrayBuffer, 200, {
    "Content-Type": "application/pdf",
  });
});

tryoutHandler.post("/api/learner/tryouts/:sessionId/autosave", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await autosaveTryout(c.get("user").id, c.req.param("sessionId"), body);
  return c.json(result);
});

tryoutHandler.post("/api/learner/tryouts/:sessionId/subtest-submit", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await submitTryoutSubtest(c.get("user").id, c.req.param("sessionId"), body);
  return c.json(result);
});

tryoutHandler.post("/api/learner/tryouts/:sessionId/advance", async (c) => {
  const result = await advanceTryoutSubtest(c.get("user").id, c.req.param("sessionId"));
  return c.json(result);
});

// ==========================================
// ADMIN TRYOUT BUILDER & MANAGEMENT
// ==========================================

tryoutHandler.get("/api/admin/tryouts", async (c) => {
  const result = await listAdminTryouts();
  return c.json(result);
});

tryoutHandler.post("/api/admin/tryouts", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await createAdminTryout(body);
  return c.json(result, 201);
});

tryoutHandler.get("/api/admin/tryouts/:id", async (c) => {
  const result = await getAdminTryout(c.req.param("id"));
  return c.json(result);
});
tryoutHandler.get("/api/admin/tryouts/:id/sections/:sectionId", async (c) =>
  c.json(await getAdminTryoutSection(c.req.param("id"), c.req.param("sectionId"))),
);
tryoutHandler.put("/api/admin/tryouts/:id/sections/:sectionId/questions/:questionId", async (c) =>
  c.json(
    await updateTryoutQuestion(
      c.req.param("id"),
      c.req.param("sectionId"),
      c.req.param("questionId"),
      await c.req.json().catch(() => null),
    ),
  ),
);
tryoutHandler.delete("/api/admin/tryouts/:id/sections/:sectionId", async (c) =>
  c.json(await deleteScopedTryoutSection(c.req.param("id"), c.req.param("sectionId"))),
);

tryoutHandler.put("/api/admin/tryouts/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await updateAdminTryout(c.req.param("id"), body);
  return c.json(result);
});

tryoutHandler.delete("/api/admin/tryouts/:id", async (c) => {
  const result = await deleteAdminTryout(c.req.param("id"));
  return c.json(result);
});

tryoutHandler.post("/api/admin/tryouts/:id/sections", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await createTryoutSection(c.req.param("id"), body);
  return c.json(result, 201);
});

tryoutHandler.put("/api/admin/tryouts/sections/:sectionId", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await updateTryoutSection(c.req.param("sectionId"), body);
  return c.json(result);
});

tryoutHandler.delete("/api/admin/tryouts/sections/:sectionId", async (c) => {
  const result = await deleteTryoutSection(c.req.param("sectionId"));
  return c.json(result);
});

tryoutHandler.post("/api/admin/tryouts/sections/:sectionId/import", async (c) => {
  const result = await importSectionBatch(c.req.param("sectionId"), await readImport(c));
  return c.json(result);
});
tryoutHandler.post("/api/admin/tryouts/:id/import", async (c) =>
  c.json(await importTryoutBatch(c.req.param("id"), await readImport(c)), 201),
);

tryoutHandler.post("/api/admin/tryouts/:id/sections/:sectionId/import", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await importSectionQuestions(c.req.param("sectionId"), body);
  return c.json(result);
});

tryoutHandler.post("/api/admin/tryouts/sections/:sectionId/questions/bulk-delete", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await bulkRemoveQuestionsFromSection(c.req.param("sectionId"), body);
  return c.json(result);
});

tryoutHandler.delete("/api/admin/tryouts/sections/:sectionId/questions/:questionId", async (c) => {
  const result = await removeQuestionFromSection(
    c.req.param("sectionId"),
    c.req.param("questionId"),
  );
  return c.json(result);
});

tryoutHandler.delete(
  "/api/admin/tryouts/:id/sections/:sectionId/questions/:questionId",
  async (c) => {
    const result = await removeQuestionFromSection(
      c.req.param("sectionId"),
      c.req.param("questionId"),
    );
    return c.json(result);
  },
);

tryoutHandler.put("/api/admin/tryouts/sections/:sectionId/reorder", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { questionIds?: string[] };
  const result = await reorderSectionQuestions(
    c.req.param("sectionId"),
    Array.isArray(body?.questionIds) ? body.questionIds : [],
  );
  return c.json(result);
});
