import { Hono } from "hono";
import { passageLibraryItemSchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  createPassage,
  deletePassage,
  getPassageDetail,
  getPassageLibrary,
  updatePassage,
} from "../services/passage-library.service";

export const passageHandler = new Hono<AppEnv>();

passageHandler.get("/api/admin/passages", async (c) => {
  const query = c.req.query();
  const cari = query.cari;
  const isArchived = query.isArchived !== undefined ? query.isArchived === "true" : undefined;
  const page = query.halaman ? Number(query.halaman) : 1;
  const limit = query.limit ? Number(query.limit) : 15;

  const result = await getPassageLibrary({ cari, isArchived, page, limit });
  return c.json(result);
});

passageHandler.post("/api/admin/passages", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = passageLibraryItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Data stimulus passage tidak valid." }, 400);
  }

  const result = await createPassage(parsed.data, user.id);
  return c.json(result, 201);
});

passageHandler.get("/api/admin/passages/:id", async (c) => {
  const result = await getPassageDetail(c.req.param("id"));
  return c.json(result);
});

passageHandler.put("/api/admin/passages/:id", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = passageLibraryItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Perubahan passage tidak valid." }, 400);
  }

  const result = await updatePassage(c.req.param("id"), parsed.data, user.id);
  return c.json(result);
});

passageHandler.delete("/api/admin/passages/:id", async (c) => {
  const result = await deletePassage(c.req.param("id"));
  return c.json(result);
});
