import { Hono } from "hono";
import type { AppEnv } from "../types";
import {
  getLearnerHistory,
  getLearnerSummary,
  getPracticeQuestions,
  getResultDetail,
  submitPractice,
} from "../services/practice.service";

export const practiceHandler = new Hono<AppEnv>();

practiceHandler.get("/api/learner/summary", async (c) =>
  c.json(await getLearnerSummary(c.get("user").id)),
);

practiceHandler.get("/api/learner/history", async (c) =>
  c.json(await getLearnerHistory(c.get("user").id)),
);

practiceHandler.get("/api/learner/practice/:slug/:packageId", async (c) => {
  const result = await getPracticeQuestions(c.req.param("slug"), c.req.param("packageId"));
  return c.json(result);
});

practiceHandler.get("/api/learner/practice/:slug", async (c) => {
  const result = await getPracticeQuestions(c.req.param("slug"));
  return c.json(result);
});

async function handleSubmit(c: import("hono").Context<AppEnv>) {
  const body = await c.req.json().catch(() => null);
  const result = await submitPractice(
    c.get("user").id,
    c.req.param("slug")!,
    c.req.param("packageId"),
    body,
  );
  return c.json(result, 201);
}

practiceHandler.post("/api/learner/practice/:slug", handleSubmit);
practiceHandler.post("/api/learner/practice/:slug/:packageId", handleSubmit);

practiceHandler.get("/api/learner/results/:id", async (c) => {
  const result = await getResultDetail(c.get("user").id, c.req.param("id")!);
  return c.json(result);
});
