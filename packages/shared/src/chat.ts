import { z } from "zod";

export const sendChatMessageSchema = z
  .object({
    message: z.string().trim().max(1000, "Pesan maksimal 1000 karakter").default(""),
    recipientId: z.string().trim().min(1).optional().nullable(),
    mediaUrl: z.string().trim().min(1).optional().nullable(),
  })
  .refine((data) => data.message.length > 0 || !!data.mediaUrl, {
    message: "Pesan atau gambar tidak boleh kosong",
    path: ["message"],
  });

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const editChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(1000, "Pesan maksimal 1000 karakter"),
});

export type EditChatMessageInput = z.infer<typeof editChatMessageSchema>;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  senderRole: string;
  senderCodename?: string | null;
  recipientId: string | null;
  message: string;
  mediaUrl?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
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
  | { type: "chat:send"; recipientId?: string | null; message: string; mediaUrl?: string | null }
  | { type: "chat:typing"; recipientId?: string | null }
  | { type: "chat:read"; targetUserId: string }
  | { type: "chat:edit"; messageId: string; message: string }
  | { type: "chat:delete"; messageId: string };

export type ChatWsServerMessage =
  | { type: "chat:message"; message: ChatMessage }
  | { type: "chat:message_updated"; message: ChatMessage }
  | { type: "chat:message_deleted"; messageId: string; recipientId: string | null }
  | { type: "chat:read"; readerId: string; targetUserId: string }
  | { type: "chat:error"; error: string };
