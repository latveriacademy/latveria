import { z } from "zod";

export const sendChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(1000, "Pesan maksimal 1000 karakter"),
  recipientId: z.string().trim().min(1).optional().nullable(),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  senderRole: string;
  senderCodename?: string | null;
  recipientId: string | null;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface ChatConversationSummary {
  userId: string;
  name: string;
  image: string | null;
  role: string;
  codename?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export type ChatWsClientMessage =
  | { type: "chat:send"; recipientId?: string | null; message: string }
  | { type: "chat:typing"; recipientId?: string | null }
  | { type: "chat:read"; targetUserId: string };

export type ChatWsServerMessage =
  | { type: "chat:message"; message: ChatMessage }
  | { type: "chat:read"; readerId: string; targetUserId: string }
  | { type: "chat:error"; error: string };
