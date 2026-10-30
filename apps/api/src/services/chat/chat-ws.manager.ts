import type { ServerWebSocket } from "bun";
import type { ChatMessage, ChatWsServerMessage } from "@latveria/shared";

export interface ChatSocketData {
  userId: string;
  name: string;
  image?: string | null;
  role: string;
}

export type ChatWebSocket = ServerWebSocket<ChatSocketData>;

// In-memory active sockets per user
const userSockets = new Map<string, Set<ChatWebSocket>>();
// All connected sockets for broadcasting global chat
const allSockets = new Set<ChatWebSocket>();

export function registerChatSocket(ws: ChatWebSocket) {
  allSockets.add(ws);
  let sockets = userSockets.get(ws.data.userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(ws.data.userId, sockets);
  }
  sockets.add(ws);
}

export function unregisterChatSocket(ws: ChatWebSocket) {
  allSockets.delete(ws);
  const sockets = userSockets.get(ws.data.userId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      userSockets.delete(ws.data.userId);
    }
  }
}

export function broadcastGlobalMessage(message: ChatMessage) {
  const payload = JSON.stringify({
    type: "chat:message",
    message,
  } satisfies ChatWsServerMessage);

  for (const socket of allSockets) {
    try {
      socket.send(payload);
    } catch (err) {
      console.error(`[ChatWS] Failed to broadcast global message to ${socket.data.userId}:`, err);
    }
  }
}

export function broadcastDmMessage(senderId: string, recipientId: string, message: ChatMessage) {
  const payload = JSON.stringify({
    type: "chat:message",
    message,
  } satisfies ChatWsServerMessage);

  const targets = new Set<ChatWebSocket>();
  for (const ws of userSockets.get(senderId) ?? []) targets.add(ws);
  for (const ws of userSockets.get(recipientId) ?? []) targets.add(ws);

  for (const socket of targets) {
    try {
      socket.send(payload);
    } catch (err) {
      console.error(`[ChatWS] Failed to send DM to ${socket.data.userId}:`, err);
    }
  }
}

export function notifyDmRead(readerId: string, targetUserId: string) {
  const payload = JSON.stringify({
    type: "chat:read",
    readerId,
    targetUserId,
  } satisfies ChatWsServerMessage);

  const sockets = userSockets.get(targetUserId);
  if (!sockets) return;

  for (const socket of sockets) {
    try {
      socket.send(payload);
    } catch (err) {
      console.error(`[ChatWS] Failed to send read event to ${socket.data.userId}:`, err);
    }
  }
}
