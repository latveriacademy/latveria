import { Hono } from "hono";
import { utbkSubtests } from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  catalog,
  createAdminTopic,
  deleteAdminTopic,
  updateAdminTopic,
} from "../services/topic.service";

export const topicHandler = new Hono<AppEnv>();

topicHandler.get("/api/learner/topics", async (c) => {
  const all = c.req.query("all") === "true";
  const cat = await catalog(true);
  if (!all) {
    return c.json(cat.filter((t) => utbkSubtests.some((u) => u.slug === t.slug)));
  }
  return c.json(cat);
});

topicHandler.get("/api/admin/topics", async (c) => c.json(await catalog(false)));

topicHandler.post("/api/admin/topics", async (c) => {
  const body = await c.req.json().catch(() => null);
  const created = await createAdminTopic(body);
  return c.json(created, 201);
});

topicHandler.put("/api/admin/topics/:id", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const updated = await updateAdminTopic(c.req.param("id"), body);
  return c.json(updated);
});

topicHandler.delete("/api/admin/topics/:id", async (c) => {
  const result = await deleteAdminTopic(c.req.param("id"));
  return c.json(result);
});
