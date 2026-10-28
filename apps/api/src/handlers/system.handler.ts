import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types";
import { getAuth } from "../lib/auth";
import {
  createAffirmation,
  createReport,
  deleteAffirmation,
  getAdminConfigs,
  getAffirmations,
  getLearnerConfigs,
  getLearnerLinkedAccounts,
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

systemHandler.get("/api/learner/linked-accounts", async (c) =>
  c.json(await getLearnerLinkedAccounts(c.get("user").id)),
);

systemHandler.post("/api/learner/set-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const newPassword = body?.newPassword;
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new HTTPException(400, { message: "Kata sandi baru minimal 8 karakter." });
  }

  try {
    await getAuth().api.setPassword({
      body: { newPassword },
      headers: c.req.raw.headers,
    });
    return c.json({ status: true, message: "Kata sandi berhasil dibuat." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat kata sandi.";
    throw new HTTPException(400, { message });
  }
});

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
