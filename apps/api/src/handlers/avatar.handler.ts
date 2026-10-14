import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types";
import { deleteAvatar, getAvatarStream, uploadAvatar } from "../services/storage/storage.service";

export const publicAvatarHandler = new Hono<AppEnv>();

publicAvatarHandler.get("/api/avatar/:key", async (c) => {
  const result = await getAvatarStream(c.req.param("key"));
  if (!result) {
    return c.notFound();
  }
  return c.newResponse(result.stream, 200, {
    "Content-Type": result.type,
    "Cache-Control": "public, max-age=86400, immutable",
  });
});

export const learnerAvatarHandler = new Hono<AppEnv>();

learnerAvatarHandler.post("/api/learner/profile/avatar", async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new HTTPException(400, { message: "Data form upload tidak valid." });
  }
  const file = formData.get("avatar") ?? formData.get("file");
  const result = await uploadAvatar(c.get("user").id, file);
  return c.json(result);
});

learnerAvatarHandler.delete("/api/learner/profile/avatar", async (c) => {
  const result = await deleteAvatar(c.get("user").id);
  return c.json(result);
});
