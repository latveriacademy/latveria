import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createBattleInviteSchema,
  idSchema,
  respondBattleInviteSchema,
  respondFriendRequestSchema,
  sendFriendRequestSchema,
} from "@latveria/shared";
import type { AppEnv } from "../types";
import {
  createBattleInvite,
  listFriendsAndRequests,
  listPendingBattleInvites,
  removeFriend,
  respondBattleInvite,
  respondFriendRequest,
  searchPotentialFriends,
  sendFriendRequest,
} from "../services/friendship.service";

export const friendshipHandler = new Hono<AppEnv>();

// Get current user's friends and requests
friendshipHandler.get("/api/friends", async (c) => {
  const user = c.get("user");
  const data = await listFriendsAndRequests(user.id);
  return c.json(data);
});

// Search users to add as friends
friendshipHandler.get("/api/friends/search", async (c) => {
  const user = c.get("user");
  const q = c.req.query("q") ?? "";
  const users = await searchPotentialFriends(user.id, q);
  return c.json({ users });
});

// Send a friend request
friendshipHandler.post("/api/friends/request", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = sendFriendRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "ID target tidak valid." });
  }

  const result = await sendFriendRequest(user.id, parsed.data);
  return c.json(result, 201);
});

// Respond to friend request (accept or decline)
friendshipHandler.post("/api/friends/request/:id/respond", async (c) => {
  const user = c.get("user");
  const friendshipId = c.req.param("id");
  if (!idSchema.safeParse(friendshipId).success) {
    throw new HTTPException(400, { message: "ID permintaan tidak valid." });
  }

  const body = await c.req.json().catch(() => null);
  const parsed = respondFriendRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Aksi tidak valid." });
  }

  const result = await respondFriendRequest(user.id, friendshipId, parsed.data);
  return c.json(result);
});

// Remove a friend
friendshipHandler.delete("/api/friends/:targetUserId", async (c) => {
  const user = c.get("user");
  const targetUserId = c.req.param("targetUserId");
  if (!targetUserId) {
    throw new HTTPException(400, { message: "Target user tidak valid." });
  }

  const result = await removeFriend(user.id, targetUserId);
  return c.json(result);
});

// ----------------- Warrior Battle Invites -----------------

// Create / send battle invite to friend
friendshipHandler.post("/api/warrior/invites", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createBattleInviteSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Data undangan tidak valid." });
  }

  const result = await createBattleInvite(user.id, parsed.data.battleId, parsed.data.recipientId);
  return c.json(result, 201);
});

// List pending battle invites for current user
friendshipHandler.get("/api/warrior/invites", async (c) => {
  const user = c.get("user");
  const invites = await listPendingBattleInvites(user.id);
  return c.json({ invites });
});

// Respond to battle invite (accept or decline)
friendshipHandler.post("/api/warrior/invites/:id/respond", async (c) => {
  const user = c.get("user");
  const inviteId = c.req.param("id");
  if (!idSchema.safeParse(inviteId).success) {
    throw new HTTPException(400, { message: "ID undangan tidak valid." });
  }

  const body = await c.req.json().catch(() => null);
  const parsed = respondBattleInviteSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Aksi tidak valid." });
  }

  const result = await respondBattleInvite(user.id, inviteId, parsed.data);
  return c.json(result);
});
