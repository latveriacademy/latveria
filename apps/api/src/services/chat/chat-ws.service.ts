import type { ChatWsClientMessage } from "@latveria/shared";
import type { ChatWebSocket } from "./chat-ws.manager";
import { registerChatSocket, unregisterChatSocket } from "./chat-ws.manager";
import { markDmAsRead, sendDmMessage, sendGlobalMessage } from "./chat.service";

export function onChatSocketOpen(ws: ChatWebSocket) {
  registerChatSocket(ws);
}

export function onChatSocketClose(ws: ChatWebSocket) {
  unregisterChatSocket(ws);
}

export async function onChatSocketMessage(ws: ChatWebSocket, rawMessage: string | Buffer) {
  try {
    const text = typeof rawMessage === "string" ? rawMessage : rawMessage.toString("utf8");
    const payload = JSON.parse(text) as ChatWsClientMessage;

    if (payload.type === "chat:send") {
      const msgText = payload.message?.trim();
      if (!msgText) return;

      if (payload.recipientId) {
        await sendDmMessage(ws.data.userId, payload.recipientId, msgText);
      } else {
        await sendGlobalMessage(ws.data.userId, msgText);
      }
    } else if (payload.type === "chat:read") {
      if (payload.targetUserId) {
        await markDmAsRead(ws.data.userId, payload.targetUserId);
      }
    }
  } catch (err) {
    console.error("[ChatWS] Error handling socket message:", err);
  }
}
