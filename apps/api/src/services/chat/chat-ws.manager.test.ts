import { describe, expect, it, vi } from "vitest";
import {
  broadcastDmMessage,
  broadcastGlobalMessage,
  notifyDmRead,
  registerChatSocket,
  unregisterChatSocket,
  type ChatWebSocket,
} from "./chat-ws.manager";

describe("Chat WebSocket Manager", () => {
  it("registers, broadcasts global, and unregisters chat sockets", () => {
    const sendFn1 = vi.fn();
    const sendFn2 = vi.fn();

    const socket1 = {
      data: { userId: "user-1", name: "User 1", role: "user" },
      send: sendFn1,
    } as unknown as ChatWebSocket;

    const socket2 = {
      data: { userId: "user-2", name: "User 2", role: "user" },
      send: sendFn2,
    } as unknown as ChatWebSocket;

    registerChatSocket(socket1);
    registerChatSocket(socket2);

    const dummyMsg = {
      id: "msg-1",
      senderId: "user-1",
      senderName: "User 1",
      senderImage: null,
      senderRole: "user",
      recipientId: null,
      message: "Hello world!",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    broadcastGlobalMessage(dummyMsg);

    expect(sendFn1).toHaveBeenCalledOnce();
    expect(sendFn2).toHaveBeenCalledOnce();
    const parsed = JSON.parse(sendFn1.mock.calls[0][0]);
    expect(parsed.type).toBe("chat:message");
    expect(parsed.message.message).toBe("Hello world!");

    // Unregister
    unregisterChatSocket(socket1);
    unregisterChatSocket(socket2);

    sendFn1.mockClear();
    sendFn2.mockClear();
    broadcastGlobalMessage(dummyMsg);
    expect(sendFn1).not.toHaveBeenCalled();
    expect(sendFn2).not.toHaveBeenCalled();
  });

  it("broadcasts DM only to sender and recipient", () => {
    const send1 = vi.fn();
    const send2 = vi.fn();
    const send3 = vi.fn();

    const socket1 = {
      data: { userId: "user-1", name: "User 1", role: "user" },
      send: send1,
    } as unknown as ChatWebSocket;

    const socket2 = {
      data: { userId: "user-2", name: "User 2", role: "user" },
      send: send2,
    } as unknown as ChatWebSocket;

    const socket3 = {
      data: { userId: "user-3", name: "User 3", role: "user" },
      send: send3,
    } as unknown as ChatWebSocket;

    registerChatSocket(socket1);
    registerChatSocket(socket2);
    registerChatSocket(socket3);

    const dmMsg = {
      id: "dm-1",
      senderId: "user-1",
      senderName: "User 1",
      senderImage: null,
      senderRole: "user",
      recipientId: "user-2",
      message: "Private hi",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    broadcastDmMessage("user-1", "user-2", dmMsg);

    expect(send1).toHaveBeenCalledOnce();
    expect(send2).toHaveBeenCalledOnce();
    expect(send3).not.toHaveBeenCalled();

    // Test notify read
    notifyDmRead("user-2", "user-1");
    expect(send1).toHaveBeenCalledTimes(2);
    const readPayload = JSON.parse(send1.mock.calls[1][0]);
    expect(readPayload.type).toBe("chat:read");
    expect(readPayload.readerId).toBe("user-2");

    unregisterChatSocket(socket1);
    unregisterChatSocket(socket2);
    unregisterChatSocket(socket3);
  });
});
