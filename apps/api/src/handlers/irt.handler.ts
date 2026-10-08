import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { idSchema, utbkSubtests } from "@latveria/shared";
import {
  activateIrtCalibration,
  exportIrtDataset,
  importIrtCalibration,
  irtOverview,
  listIrtCalibrations,
} from "../services/irt-calibration.service";

export const irtHandler = new Hono();
irtHandler.get("/api/admin/irt/calibrations", async (c) => c.json(await listIrtCalibrations()));
irtHandler.get("/api/admin/irt/overview", async (c) => c.json(await irtOverview()));
irtHandler.post("/api/admin/irt/datasets", async (c) => {
  const parsed = z
    .object({
      topicSlug: z.string().refine((slug) => utbkSubtests.some((s) => s.slug === slug)),
      revisionIds: z.array(z.uuid()).min(10).max(1000).optional(),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(400, { message: "Pilih subtes UTBK." });
  return c.json(await exportIrtDataset(parsed.data.topicSlug, parsed.data.revisionIds));
});
irtHandler.post("/api/admin/irt/calibrations", async (c) => {
  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > 200_000)
    throw new HTTPException(413, { message: "Artefak maksimal 200 KB." });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HTTPException(400, { message: "JSON tidak valid." });
  }
  return c.json(await importIrtCalibration(body), 201);
});
irtHandler.put("/api/admin/irt/calibrations/:id/activation", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  const body = z
    .object({ active: z.boolean() })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success)
    throw new HTTPException(400, { message: "Status kalibrasi tidak valid." });
  return c.json(await activateIrtCalibration(id.data, body.data.active));
});
