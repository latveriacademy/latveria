import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sendChatMessageSchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  getConversations,
  getDmMessages,
  getGlobalMessages,
  markDmAsRead,
  sendDmMessage,
  sendGlobalMessage,
} from "../services/chat/chat.service";

export const chatHandler = new Hono<AppEnv>();

// Ambil pesan global room
chatHandler.get("/api/learner/chat/global", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const before = c.req.query("before") ?? undefined;
  const messages = await getGlobalMessages(limit, before);
  return c.json({ messages });
});

// Kirim pesan ke global room
chatHandler.post("/api/learner/chat/global", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = sendChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    });
  }

  const message = await sendGlobalMessage(user.id, parsed.data.message);
  return c.json({ message }, 201);
});

// Ambil daftar percakapan DM
chatHandler.get("/api/learner/chat/conversations", async (c) => {
  const user = c.get("user");
  const conversations = await getConversations(user.id);
  return c.json({ conversations });
});

// Ambil riwayat chat DM dengan user tertentu
chatHandler.get("/api/learner/chat/dm/:userId", async (c) => {
  const user = c.get("user");
  const targetUserId = c.req.param("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const before = c.req.query("before") ?? undefined;

  const messages = await getDmMessages(user.id, targetUserId, limit, before);
  return c.json({ messages });
});

// Kirim pesan DM ke user tertentu
chatHandler.post("/api/learner/chat/dm/:userId", async (c) => {
  const user = c.get("user");
  const targetUserId = c.req.param("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = sendChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    });
  }

  const message = await sendDmMessage(user.id, targetUserId, parsed.data.message);
  return c.json({ message }, 201);
});

// Tandai pesan DM sebagai dibaca
chatHandler.put("/api/learner/chat/dm/:userId/read", async (c) => {
  const user = c.get("user");
  const targetUserId = c.req.param("userId");
  await markDmAsRead(user.id, targetUserId);
  return c.json({ success: true });
});
