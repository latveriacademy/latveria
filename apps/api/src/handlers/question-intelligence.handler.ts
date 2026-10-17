import { Hono } from "hono";
import { bulkActionSchema, checkDuplicateSchema, checkSimilaritySchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  checkQuestionDuplicate,
  duplicateAsNewQuestion,
  findSimilarQuestions,
  validateQuestionQuality,
} from "../services/question-intelligence.service";
import { processBulkAction } from "../services/question-search.service";
import { getQuestionPerformanceAnalytics } from "../services/question-analytics.service";
import {
  getQuestionVersionDiff,
  getQuestionVersionHistory,
  rollbackQuestionToVersion,
} from "../services/question-version.service";
import { getQuestionUsageMap, safeDeleteQuestion } from "../services/question-usage.service";

export const questionIntelligenceHandler = new Hono<AppEnv>();

questionIntelligenceHandler.post("/api/admin/questions/check-duplicate", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = checkDuplicateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Payload periksa duplikasi tidak valid." }, 400);
  }
  const result = await checkQuestionDuplicate(parsed.data);
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/check-similarity", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = checkSimilaritySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Payload periksa kemiripan tidak valid." }, 400);
  }
  const result = await findSimilarQuestions(parsed.data);
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/validate-quality", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Parameters<
    typeof validateQuestionQuality
  >[0];
  const result = validateQuestionQuality(body ?? {});
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/bulk-action", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Permintaan aksi massal tidak valid." }, 400);
  }
  const result = await processBulkAction(parsed.data, user.id);
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/:id/duplicate", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    targetTopicId?: string;
    targetPackageId?: string | null;
  };
  const result = await duplicateAsNewQuestion(id, user.id, body);
  return c.json(result, 201);
});

questionIntelligenceHandler.get("/api/admin/questions/:id/usage-map", async (c) => {
  const id = c.req.param("id");
  const result = await getQuestionUsageMap(id);
  return c.json(result);
});

questionIntelligenceHandler.delete("/api/admin/questions/:id/safe", async (c) => {
  const id = c.req.param("id");
  const result = await safeDeleteQuestion(id);
  return c.json(result);
});

questionIntelligenceHandler.get("/api/admin/questions/:id/versions", async (c) => {
  const id = c.req.param("id");
  const result = await getQuestionVersionHistory(id);
  return c.json(result);
});

questionIntelligenceHandler.get("/api/admin/questions/:id/versions/diff", async (c) => {
  const id = c.req.param("id");
  const query = c.req.query();
  const v1 = Number(query.v1 ?? 1);
  const v2 = Number(query.v2 ?? 2);
  const result = await getQuestionVersionDiff(id, v1, v2);
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/:id/versions/rollback", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    targetVersion?: number;
    reason?: string;
  };
  const targetVersion = Number(body.targetVersion);
  if (!targetVersion || targetVersion < 1) {
    return c.json({ error: "Nomor versi target tidak valid." }, 400);
  }
  const result = await rollbackQuestionToVersion(id, targetVersion, user.id, body.reason);
  return c.json(result);
});

questionIntelligenceHandler.get("/api/admin/questions/:id/analytics", async (c) => {
  const id = c.req.param("id");
  const result = await getQuestionPerformanceAnalytics(id);
  return c.json(result);
});

questionIntelligenceHandler.post("/api/admin/questions/import-dry-run", async (c) => {
  const text = await c.req.text();
  const { dryRunImportQuestions } = await import("../services/question-import-dryrun.service");
  const result = await dryRunImportQuestions(text);
  return c.json(result);
});
