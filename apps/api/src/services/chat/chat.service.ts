import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { ChatConversationSummary, ChatMessage } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { user } from "../../lib/db/auth-schema";
import { chatMessages, friendships } from "../../lib/db/schema";
import { broadcastDmMessage, broadcastGlobalMessage, notifyDmRead } from "./chat-ws.manager";

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
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

export async function sendGlobalMessage(
  senderId: string,
  messageText: string,
): Promise<ChatMessage> {
  const db = getDb();
  const [sender] = await db.select().from(user).where(eq(user.id, senderId));
  if (!sender) {
    throw new HTTPException(404, { message: "Pengguna tidak ditemukan." });
  }

  const trimmed = messageText.trim();
  if (!trimmed) {
    throw new HTTPException(400, { message: "Pesan tidak boleh kosong." });
  }

  const [row] = await db
    .insert(chatMessages)
    .values({
      senderId,
      recipientId: null,
      message: trimmed,
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
      lastMessageMap.set(counterpartId, {
        message: m.message,
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
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

export async function sendDmMessage(
  senderId: string,
  recipientId: string,
  messageText: string,
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
  if (!trimmed) {
    throw new HTTPException(400, { message: "Pesan tidak boleh kosong." });
  }

  const [row] = await db
    .insert(chatMessages)
    .values({
      senderId,
      recipientId,
      message: trimmed,
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
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    readAt: null,
  };

  broadcastDmMessage(senderId, recipientId, chatMessage);
  return chatMessage;
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
