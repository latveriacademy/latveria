import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { libraryItemInputSchema, type LibraryItemType } from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  createLibraryItem,
  deleteLibraryItem,
  getLibraryItemById,
  getLibraryItems,
  getPublishedLibraryItem,
  togglePublishLibraryItem,
  updateLibraryItem,
} from "../services/library.service";
import { getAvatarStream, uploadLibraryThumbnail } from "../services/storage/storage.service";

export const libraryHandler = new Hono<AppEnv>();

// Public media access for uploaded library thumbnails
libraryHandler.get("/api/library/media/:key", async (c) => {
  const result = await getAvatarStream(c.req.param("key"));
  if (!result) {
    return c.notFound();
  }
  return c.newResponse(result.stream, 200, {
    "Content-Type": result.type,
    "Cache-Control": "public, max-age=86400, immutable",
  });
});

// Learner endpoints
libraryHandler.get("/api/learner/library", async (c) => {
  const query = c.req.query();
  const cari = query.cari?.trim() || undefined;
  const type = (query.type as LibraryItemType) || undefined;
  const subtestSlug = query.subtestSlug?.trim() || undefined;
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 12;

  const result = await getLibraryItems({ cari, type, subtestSlug, isPublished: true, page, limit });
  return c.json(result);
});

libraryHandler.get("/api/learner/library/:slug", async (c) => {
  const result = await getPublishedLibraryItem(c.req.param("slug"));
  return c.json(result);
});

// Admin endpoints
libraryHandler.get("/api/admin/library", async (c) => {
  const query = c.req.query();
  const cari = query.cari?.trim() || undefined;
  const type = (query.type as LibraryItemType) || undefined;
  const subtestSlug = query.subtestSlug?.trim() || undefined;
  const isPublished = query.isPublished !== undefined ? query.isPublished === "true" : undefined;
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 12;

  const result = await getLibraryItems({ cari, type, subtestSlug, isPublished, page, limit });
  return c.json(result);
});

libraryHandler.post("/api/admin/library", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = libraryItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Data materi library tidak valid.", details: parsed.error.issues }, 400);
  }

  const result = await createLibraryItem(parsed.data, user.id);
  return c.json(result, 201);
});

libraryHandler.get("/api/admin/library/:id", async (c) => {
  const result = await getLibraryItemById(c.req.param("id"));
  return c.json(result);
});

libraryHandler.put("/api/admin/library/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = libraryItemInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Perubahan materi tidak valid.", details: parsed.error.issues }, 400);
  }

  const result = await updateLibraryItem(c.req.param("id"), parsed.data);
  return c.json(result);
});

libraryHandler.delete("/api/admin/library/:id", async (c) => {
  const result = await deleteLibraryItem(c.req.param("id"));
  return c.json(result);
});

libraryHandler.patch("/api/admin/library/:id/publish", async (c) => {
  const result = await togglePublishLibraryItem(c.req.param("id"));
  return c.json(result);
});

// Upload thumbnail media
libraryHandler.post("/api/admin/library/thumbnail", async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new HTTPException(400, { message: "Data form upload tidak valid." });
  }
  const file = formData.get("thumbnail") ?? formData.get("file");
  const result = await uploadLibraryThumbnail(file);
  return c.json(result);
});
