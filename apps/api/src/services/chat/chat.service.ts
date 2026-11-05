import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { ChatConversationSummary, ChatMessage } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { user } from "../../lib/db/auth-schema";
import { chatMessages, friendships } from "../../lib/db/schema";
import {
  broadcastDmMessage,
  broadcastGlobalMessage,
  broadcastMessageDeleted,
  broadcastMessageUpdated,
  notifyDmRead,
} from "./chat-ws.manager";
import {
  decryptDmText,
  decryptDmTextOptional,
  encryptDmText,
  encryptDmTextOptional,
} from "./chat-crypto.service";

export async function getGlobalMessages(limit = 50, before?: string): Promise<ChatMessage[]> {
  const db = getDb();
  const conditions = [isNull(chatMessages.recipientId)];
  if (before) {
    const beforeDate = new Date(before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(chatMessages.createdAt, beforeDate));
    }
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderName: user.name,
      senderImage: user.image,
      senderRole: user.role,
      senderCodename: user.codename,
      recipientId: chatMessages.recipientId,
      message: chatMessages.message,
      mediaUrl: chatMessages.mediaUrl,
      isEdited: chatMessages.isEdited,
      editedAt: chatMessages.editedAt,
      isDeleted: chatMessages.isDeleted,
      createdAt: chatMessages.createdAt,
      readAt: chatMessages.readAt,
    })
    .from(chatMessages)
    .innerJoin(user, eq(chatMessages.senderId, user.id))
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(Math.min(limit, 100));

  return rows.reverse().map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt ? r.editedAt.toISOString() : null,
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

export async function sendGlobalMessage(
  senderId: string,
  messageText: string,
  mediaUrl?: string | null,
): Promise<ChatMessage> {
  const db = getDb();
  const [sender] = await db.select().from(user).where(eq(user.id, senderId));
  if (!sender) {
    throw new HTTPException(404, { message: "Pengguna tidak ditemukan." });
  }

  const trimmed = messageText.trim();
  const trimmedMedia = mediaUrl?.trim() || null;
  if (!trimmed && !trimmedMedia) {
    throw new HTTPException(400, { message: "Pesan atau gambar tidak boleh kosong." });
  }

  const [row] = await db
    .insert(chatMessages)
    .values({
      senderId,
      recipientId: null,
      message: trimmed,
      mediaUrl: trimmedMedia,
    })
    .returning();

  const chatMessage: ChatMessage = {
    id: row.id,
    senderId,
    senderName: sender.name,
    senderImage: sender.image,
    senderRole: sender.role,
    senderCodename: sender.codename,
    recipientId: null,
    message: row.message,
    mediaUrl: row.mediaUrl,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: row.createdAt.toISOString(),
    readAt: null,
  };

  broadcastGlobalMessage(chatMessage);
  return chatMessage;
}

export async function getConversations(userId: string): Promise<ChatConversationSummary[]> {
  const db = getDb();

  // 1. Dapatkan semua pesan DM yang melibatkan user ini
  const dmMessages = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      recipientId: chatMessages.recipientId,
      message: chatMessages.message,
      mediaUrl: chatMessages.mediaUrl,
      createdAt: chatMessages.createdAt,
      readAt: chatMessages.readAt,
    })
    .from(chatMessages)
    .where(
      and(
        or(eq(chatMessages.senderId, userId), eq(chatMessages.recipientId, userId)),
        // DM only (recipientId is not null)
      ),
    )
    .orderBy(desc(chatMessages.createdAt));

  // 2. Kumpulkan daftar teman
  const acceptedFriendships = await db
    .select({
      userId: friendships.userId,
      friendId: friendships.friendId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
      ),
    );

  const contactUserIds = new Set<string>();
  for (const m of dmMessages) {
    if (m.recipientId) {
      contactUserIds.add(m.senderId === userId ? m.recipientId : m.senderId);
    }
  }
  for (const f of acceptedFriendships) {
    contactUserIds.add(f.userId === userId ? f.friendId : f.userId);
  }

  contactUserIds.delete(userId);
  if (contactUserIds.size === 0) return [];

  const contactIdsArray = Array.from(contactUserIds);
  const contactUsers = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      role: user.role,
      codename: user.codename,
    })
    .from(user)
    .where(inArray(user.id, contactIdsArray));

  const userMap = new Map(contactUsers.map((u) => [u.id, u]));

  // Hitung unread count dan temukan pesan terakhir per lawan bicara
  const unreadCountMap = new Map<string, number>();
  const lastMessageMap = new Map<string, { message: string; createdAt: Date }>();

  for (const m of dmMessages) {
    if (!m.recipientId) continue;
    const counterpartId = m.senderId === userId ? m.recipientId : m.senderId;

    if (!lastMessageMap.has(counterpartId)) {
      const decryptedMsg = decryptDmText(m.message, userId, counterpartId);
      const decryptedMedia = decryptDmTextOptional(m.mediaUrl, userId, counterpartId);
      const displayMsg = decryptedMsg || (decryptedMedia ? "📷 [Gambar]" : "");
      lastMessageMap.set(counterpartId, {
        message: displayMsg,
        createdAt: m.createdAt,
      });
    }

    if (m.recipientId === userId && !m.readAt) {
      unreadCountMap.set(counterpartId, (unreadCountMap.get(counterpartId) ?? 0) + 1);
    }
  }

  const summaries: ChatConversationSummary[] = [];

  for (const contactId of contactIdsArray) {
    const contact = userMap.get(contactId);
    if (!contact) continue;

    const last = lastMessageMap.get(contactId);
    summaries.push({
      userId: contact.id,
      name: contact.name,
      image: contact.image,
      role: contact.role,
      codename: contact.codename,
      lastMessage: last?.message ?? "",
      lastMessageAt: last?.createdAt ? last.createdAt.toISOString() : "",
      unreadCount: unreadCountMap.get(contactId) ?? 0,
    });
  }

  // Urutkan: percakapan yang punya pesan terbaru paling atas, sisanya di bawah
  summaries.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return a.name.localeCompare(b.name);
  });

  return summaries;
}

export async function getDmMessages(
  userId: string,
  targetUserId: string,
  limit = 50,
  before?: string,
): Promise<ChatMessage[]> {
  const db = getDb();

  const conditions = [
    or(
      and(eq(chatMessages.senderId, userId), eq(chatMessages.recipientId, targetUserId)),
      and(eq(chatMessages.senderId, targetUserId), eq(chatMessages.recipientId, userId)),
    ),
  ];

  if (before) {
    const beforeDate = new Date(before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(chatMessages.createdAt, beforeDate));
    }
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderName: user.name,
      senderImage: user.image,
      senderRole: user.role,
      senderCodename: user.codename,
      recipientId: chatMessages.recipientId,
      message: chatMessages.message,
      mediaUrl: chatMessages.mediaUrl,
      isEdited: chatMessages.isEdited,
      editedAt: chatMessages.editedAt,
      isDeleted: chatMessages.isDeleted,
      createdAt: chatMessages.createdAt,
      readAt: chatMessages.readAt,
    })
    .from(chatMessages)
    .innerJoin(user, eq(chatMessages.senderId, user.id))
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(Math.min(limit, 100));

  // Tandai pesan dari targetUserId yang belum dibaca sebagai dibaca
  await markDmAsRead(userId, targetUserId);

  return rows.reverse().map((r) => ({
    ...r,
    message: decryptDmText(r.message, userId, targetUserId),
    mediaUrl: decryptDmTextOptional(r.mediaUrl, userId, targetUserId),
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt ? r.editedAt.toISOString() : null,
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

export async function sendDmMessage(
  senderId: string,
  recipientId: string,
  messageText: string,
  mediaUrl?: string | null,
): Promise<ChatMessage> {
  const db = getDb();
  if (senderId === recipientId) {
    throw new HTTPException(400, { message: "Tidak dapat mengirim pesan ke diri sendiri." });
  }

  const [sender] = await db.select().from(user).where(eq(user.id, senderId));
  if (!sender) {
    throw new HTTPException(404, { message: "Pengirim tidak ditemukan." });
  }

  const [recipient] = await db.select().from(user).where(eq(user.id, recipientId));
  if (!recipient) {
    throw new HTTPException(404, { message: "Penerima tidak ditemukan." });
  }

  const trimmed = messageText.trim();
  const trimmedMedia = mediaUrl?.trim() || null;
  if (!trimmed && !trimmedMedia) {
    throw new HTTPException(400, { message: "Pesan atau gambar tidak boleh kosong." });
  }

  const encryptedMessage = encryptDmText(trimmed, senderId, recipientId);
  const encryptedMedia = encryptDmTextOptional(trimmedMedia, senderId, recipientId);

  const [row] = await db
    .insert(chatMessages)
    .values({
      senderId,
      recipientId,
      message: encryptedMessage,
      mediaUrl: encryptedMedia,
    })
    .returning();

  const chatMessage: ChatMessage = {
    id: row.id,
    senderId,
    senderName: sender.name,
    senderImage: sender.image,
    senderRole: sender.role,
    senderCodename: sender.codename,
    recipientId,
    message: trimmed,
    mediaUrl: trimmedMedia,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: row.createdAt.toISOString(),
    readAt: null,
  };

  broadcastDmMessage(senderId, recipientId, chatMessage);
  return chatMessage;
}

export async function editMessage(
  userId: string,
  messageId: string,
  newText: string,
): Promise<ChatMessage> {
  const db = getDb();
  const trimmed = newText.trim();
  if (!trimmed) {
    throw new HTTPException(400, { message: "Pesan tidak boleh kosong." });
  }

  const [existing] = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      recipientId: chatMessages.recipientId,
      message: chatMessages.message,
      mediaUrl: chatMessages.mediaUrl,
      isDeleted: chatMessages.isDeleted,
      createdAt: chatMessages.createdAt,
      readAt: chatMessages.readAt,
      senderName: user.name,
      senderImage: user.image,
      senderRole: user.role,
      senderCodename: user.codename,
    })
    .from(chatMessages)
    .innerJoin(user, eq(chatMessages.senderId, user.id))
    .where(eq(chatMessages.id, messageId));

  if (!existing) {
    throw new HTTPException(404, { message: "Pesan tidak ditemukan." });
  }
  if (existing.senderId !== userId) {
    throw new HTTPException(403, { message: "Hanya pengirim yang dapat mengedit pesan." });
  }
  if (existing.isDeleted) {
    throw new HTTPException(400, { message: "Pesan yang telah dihapus tidak dapat diedit." });
  }

  const now = new Date();
  const encryptedMessage = existing.recipientId
    ? encryptDmText(trimmed, existing.senderId, existing.recipientId)
    : trimmed;

  await db
    .update(chatMessages)
    .set({
      message: encryptedMessage,
      isEdited: true,
      editedAt: now,
    })
    .where(eq(chatMessages.id, messageId));

  const decryptedMedia = existing.recipientId
    ? decryptDmTextOptional(existing.mediaUrl, existing.senderId, existing.recipientId)
    : existing.mediaUrl;

  const updatedMessage: ChatMessage = {
    id: existing.id,
    senderId: existing.senderId,
    senderName: existing.senderName,
    senderImage: existing.senderImage,
    senderRole: existing.senderRole,
    senderCodename: existing.senderCodename,
    recipientId: existing.recipientId,
    message: trimmed,
    mediaUrl: decryptedMedia ?? null,
    isEdited: true,
    editedAt: now.toISOString(),
    isDeleted: false,
    createdAt: existing.createdAt.toISOString(),
    readAt: existing.readAt ? existing.readAt.toISOString() : null,
  };

  broadcastMessageUpdated(updatedMessage);
  return updatedMessage;
}

export async function deleteMessage(
  userId: string,
  messageId: string,
): Promise<{ success: boolean; messageId: string }> {
  const db = getDb();
  const [existing] = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      recipientId: chatMessages.recipientId,
      isDeleted: chatMessages.isDeleted,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId));

  if (!existing) {
    throw new HTTPException(404, { message: "Pesan tidak ditemukan." });
  }
  if (existing.senderId !== userId) {
    throw new HTTPException(403, { message: "Hanya pengirim yang dapat menghapus pesan." });
  }

  await db
    .update(chatMessages)
    .set({
      isDeleted: true,
      message: "Pesan ini telah dihapus",
      mediaUrl: null,
    })
    .where(eq(chatMessages.id, messageId));

  broadcastMessageDeleted(messageId, existing.recipientId, existing.senderId);
  return { success: true, messageId };
}

export async function markDmAsRead(userId: string, targetUserId: string) {
  const db = getDb();
  await db
    .update(chatMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(chatMessages.senderId, targetUserId),
        eq(chatMessages.recipientId, userId),
        isNull(chatMessages.readAt),
      ),
    );

  notifyDmRead(userId, targetUserId);
}
