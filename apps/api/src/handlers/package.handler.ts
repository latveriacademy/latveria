import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  assignQuestionToPackageSchema,
  idSchema,
  moveQuestionPackageSchema,
} from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  addQuestionToPackage,
  createSubtestPackage,
  deletePackage,
  duplicatePackage,
  getAllLearnerPackages,
  getLearnerPackagesByTopic,
  getPackageDetail,
  getSubtestPackages,
  moveQuestionPackage,
  removeQuestionFromPackage,
  updatePackage,
} from "../services/package.service";

export const packageHandler = new Hono<AppEnv>();

packageHandler.get("/api/admin/subtests/:subtestId/packages", async (c) =>
  c.json(await getSubtestPackages(c.req.param("subtestId"))),
);
packageHandler.get("/api/admin/topics/:subtestId/packages", async (c) =>
  c.json(await getSubtestPackages(c.req.param("subtestId"))),
);

packageHandler.post("/api/admin/subtests/:subtestId/packages", async (c) => {
  const body = await c.req.json().catch(() => null);
  const created = await createSubtestPackage(c.req.param("subtestId"), body);
  return c.json(created, 201);
});
packageHandler.post("/api/admin/topics/:subtestId/packages", async (c) => {
  const body = await c.req.json().catch(() => null);
  const created = await createSubtestPackage(c.req.param("subtestId"), body);
  return c.json(created, 201);
});

packageHandler.get("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  return c.json(await getPackageDetail(id.data));
});

packageHandler.put("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const body = await c.req.json().catch(() => null);
  return c.json(await updatePackage(id.data, body));
});

packageHandler.delete("/api/admin/packages/:packageId", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  return c.json(await deletePackage(id.data));
});

packageHandler.post("/api/admin/packages/:packageId/questions", async (c) => {
  const pId = idSchema.safeParse(c.req.param("packageId"));
  if (!pId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  const parsed = assignQuestionToPackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data soal tidak valid.",
    });
  return c.json(await addQuestionToPackage(pId.data, parsed.data.questionId));
});

async function handleMove(c: import("hono").Context) {
  const qId = idSchema.safeParse(c.req.param("questionId"));
  if (!qId.success) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
  const parsed = moveQuestionPackageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data paket tujuan tidak valid.",
    });
  return c.json(await moveQuestionPackage(qId.data, parsed.data.packageId));
}

packageHandler.put("/api/admin/questions/:questionId/package", handleMove);
packageHandler.post("/api/admin/questions/:questionId/package", handleMove);

packageHandler.delete("/api/admin/packages/:packageId/questions/:questionId", async (c) => {
  const pId = idSchema.safeParse(c.req.param("packageId"));
  const qId = idSchema.safeParse(c.req.param("questionId"));
  if (!pId.success || !qId.success)
    throw new HTTPException(404, { message: "Paket atau soal tidak ditemukan." });
  return c.json(await removeQuestionFromPackage(pId.data, qId.data));
});

packageHandler.get("/api/learner/subtests/:subtestId/packages", async (c) => {
  const idOrSlug = c.req.param("subtestId");
  return c.json(await getLearnerPackagesByTopic(idOrSlug));
});
packageHandler.get("/api/learner/topics/:slug/packages", async (c) => {
  const idOrSlug = c.req.param("slug");
  return c.json(await getLearnerPackagesByTopic(idOrSlug));
});

packageHandler.get("/api/learner/packages", async (c) => c.json(await getAllLearnerPackages()));

packageHandler.post("/api/admin/packages/:packageId/duplicate", async (c) => {
  const id = idSchema.safeParse(c.req.param("packageId"));
  if (!id.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });
  return c.json(await duplicatePackage(id.data), 201);
});
