import { Hono } from "hono";
import type { AppEnv } from "../types";
import {
  autosaveTryout,
  createAdminTryout,
  getTryoutSession,
  startTryout,
  submitTryoutSubtest,
} from "../services/tryout.service";

export const tryoutHandler = new Hono<AppEnv>();

tryoutHandler.post("/api/learner/tryouts/start/:packageId", async (c) => {
  const result = await startTryout(c.get("user").id, c.req.param("packageId"));
  const { _status, ...session } = result;
  return c.json(session, _status);
});

tryoutHandler.get("/api/learner/tryouts/:sessionId", async (c) => {
  const result = await getTryoutSession(c.get("user").id, c.req.param("sessionId"));
  return c.json(result);
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

tryoutHandler.post("/api/admin/tryouts", async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await createAdminTryout(body);
  return c.json(result, 201);
});
