import { Hono } from "hono";
import type { AppEnv } from "../types";
import { deleteVocabulary, listVocabulary, saveVocabulary } from "../services/vocabulary.service";

export const vocabularyHandler = new Hono<AppEnv>();
vocabularyHandler.get("/api/learner/vocabulary", async (c) =>
  c.json(await listVocabulary(c.get("user").id)),
);
vocabularyHandler.post("/api/learner/vocabulary", async (c) =>
  c.json(await saveVocabulary(c.get("user").id, await c.req.json().catch(() => null))),
);
vocabularyHandler.delete("/api/learner/vocabulary/:id", async (c) =>
  c.json(await deleteVocabulary(c.get("user").id, c.req.param("id"))),
);
