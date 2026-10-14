import { Hono } from "hono";
import type { AppEnv } from "../types";
import {
  bulkDeleteQuestions,
  createQuestion,
  deleteQuestion,
  getAdminQuestions,
  getQuestionDetail,
  importQuestions,
  updateQuestion,
} from "../services/question/question.service";

export const questionHandler = new Hono<AppEnv>();

questionHandler.get("/api/admin/questions", async (c) => {
  const result = await getAdminQuestions(c.req.query());
  return c.json(result);
});

questionHandler.post("/api/admin/questions", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await createQuestion(body);
  return c.json(result, 201);
});

questionHandler.post("/api/admin/questions/import", async (c) => {
  const text = await c.req.text();
  const result = await importQuestions(text);
  return c.json(result, 201);
});

questionHandler.get("/api/admin/questions/:id", async (c) => {
  const result = await getQuestionDetail(c.req.param("id"));
  return c.json(result);
});

questionHandler.put("/api/admin/questions/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await updateQuestion(c.req.param("id"), body);
  return c.json(result);
});

questionHandler.post("/api/admin/questions/bulk-delete", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await bulkDeleteQuestions(body);
  return c.json(result);
});

questionHandler.delete("/api/admin/questions/:id", async (c) => {
  const result = await deleteQuestion(c.req.param("id"));
  return c.json(result);
});
