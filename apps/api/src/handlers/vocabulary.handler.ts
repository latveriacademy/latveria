import { Hono } from "hono";
import type { AppEnv } from "../types";
import {
  adminDeleteVocabulary,
  adminListVocabulary,
  createDirectVocabulary,
  deleteVocabulary,
  listVocabulary,
  saveVocabulary,
} from "../services/vocabulary.service";

export const vocabularyHandler = new Hono<AppEnv>();

// Learner endpoints
vocabularyHandler.get("/api/learner/vocabulary", async (c) =>
  c.json(await listVocabulary(c.get("user").id)),
);

vocabularyHandler.post("/api/learner/vocabulary", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body && typeof body === "object" && !("questionId" in body) && "term" in body) {
    return c.json(await createDirectVocabulary(c.get("user").id, body), 201);
  }
  return c.json(await saveVocabulary(c.get("user").id, body));
});

vocabularyHandler.post("/api/learner/vocabulary/custom", async (c) =>
  c.json(await createDirectVocabulary(c.get("user").id, await c.req.json().catch(() => null)), 201),
);

vocabularyHandler.delete("/api/learner/vocabulary/:id", async (c) =>
  c.json(await deleteVocabulary(c.get("user").id, c.req.param("id"))),
);

// Admin endpoints
vocabularyHandler.get("/api/admin/vocabulary", async (c) => {
  const query = c.req.query();
  return c.json(
    await adminListVocabulary({ limit: query.limit ? Number(query.limit) : undefined }),
  );
});

vocabularyHandler.post("/api/admin/vocabulary", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  return c.json(await createDirectVocabulary(user.id, body), 201);
});

vocabularyHandler.delete("/api/admin/vocabulary/:id", async (c) =>
  c.json(await adminDeleteVocabulary(c.req.param("id"))),
);
