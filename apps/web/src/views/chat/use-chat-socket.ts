import { useEffect, useRef } from "react";
import type { ChatMessage, ChatWsServerMessage } from "@latveria/shared";

export interface UseChatSocketProps {
  currentUserId: string;
  selectedContactId: string | null;
  onMessageReceived: (msg: ChatMessage) => void;
  onMessageUpdated: (msg: ChatMessage) => void;
  onMessageDeleted: (messageId: string, recipientId: string | null) => void;
  onReadReceived: (readerId: string, targetUserId: string) => void;
}

export function useChatSocket({
  currentUserId,
  selectedContactId,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
  onReadReceived,
}: UseChatSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const selectedContactIdRef = useRef<string | null>(selectedContactId);
  selectedContactIdRef.current = selectedContactId;

  const callbacksRef = useRef({
    onMessageReceived,
    onMessageUpdated,
    onMessageDeleted,
    onReadReceived,
  });
  callbacksRef.current = {
    onMessageReceived,
    onMessageUpdated,
    onMessageDeleted,
    onReadReceived,
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/chat/ws`;

    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      if (!isSubscribed) return;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ChatWsServerMessage;
            if (data.type === "chat:message") {
              callbacksRef.current.onMessageReceived(data.message);
            } else if (data.type === "chat:message_updated") {
              callbacksRef.current.onMessageUpdated(data.message);
            } else if (data.type === "chat:message_deleted") {
              callbacksRef.current.onMessageDeleted(data.messageId, data.recipientId);
            } else if (data.type === "chat:read") {
              callbacksRef.current.onReadReceived(data.readerId, data.targetUserId);
            }
          } catch (err) {
            console.error("[ChatWS] Parse error:", err);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error("[ChatWS] Init error:", err);
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [currentUserId]);

  return wsRef;
}
