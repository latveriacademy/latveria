import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types";
import {
  createAffirmation,
  createReport,
  deleteAffirmation,
  getAdminConfigs,
  getAffirmations,
  getLearnerConfigs,
  getLearnerProfile,
  getReports,
  updateAdminConfig,
  updateAffirmation,
  updateLearnerProfile,
  updateReportStatus,
} from "../services/system.service";

export const systemHandler = new Hono<AppEnv>();

systemHandler.get("/api/learner/profile", async (c) =>
  c.json(await getLearnerProfile(c.get("user").id)),
);

systemHandler.put("/api/learner/profile", async (c) => {
  const body = await c.req.json().catch(() => null);
  return c.json(await updateLearnerProfile(c.get("user").id, body));
});

systemHandler.get("/api/learner/config", async (c) => c.json(await getLearnerConfigs()));

systemHandler.get("/api/admin/config", async (c) => c.json(await getAdminConfigs()));

systemHandler.put("/api/admin/config/:key", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.value !== "string") {
    throw new HTTPException(400, { message: "Nilai konfigurasi harus berupa string." });
  }
  return c.json(await updateAdminConfig(c.req.param("key"), body.value));
});

systemHandler.get("/api/learner/affirmations", async (c) => c.json(await getAffirmations(true)));

systemHandler.get("/api/admin/affirmations", async (c) => c.json(await getAffirmations(false)));

systemHandler.post("/api/admin/affirmations", async (c) => {
  const body = await c.req.json().catch(() => null);
  return c.json(await createAffirmation(body), 201);
});

systemHandler.put("/api/admin/affirmations/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  return c.json(await updateAffirmation(c.req.param("id"), body));
});

systemHandler.delete("/api/admin/affirmations/:id", async (c) =>
  c.json(await deleteAffirmation(c.req.param("id"))),
);

systemHandler.post("/api/learner/reports", async (c) => {
  const body = await c.req.json().catch(() => null);
  return c.json(await createReport(c.get("user").id, body), 201);
});

systemHandler.get("/api/admin/reports", async (c) => c.json(await getReports()));

systemHandler.put("/api/admin/reports/:id", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json(await updateReportStatus(c.req.param("id"), body.status));
});
