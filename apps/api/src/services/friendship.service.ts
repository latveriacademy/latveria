import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type {
  BattleInviteDto,
  FriendshipDto,
  FriendUserDto,
  RespondBattleInviteInput,
  RespondFriendRequestInput,
  SendFriendRequestInput,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import { user } from "../lib/db/auth-schema";
import { friendships, topics, warriorBattleInvites, warriorBattles } from "../lib/db/schema";
import { joinBattleByCode } from "./warrior/warrior-battle.service";

export async function listFriendsAndRequests(userId: string) {
  const db = getDb();

  // 1. Get accepted friendships
  const acceptedRows = await db
    .select({
      id: friendships.id,
      userId: friendships.userId,
      friendId: friendships.friendId,
      createdAt: friendships.createdAt,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
      ),
    );

  const friendUserIds = acceptedRows.map((row) =>
    row.userId === userId ? row.friendId : row.userId,
  );

  let friends: FriendUserDto[] = [];
  if (friendUserIds.length > 0) {
    const friendUsers = await db
      .select({
        id: user.id,
        name: user.name,
        codename: user.codename,
        targetUniversity: user.targetUniversity,
        image: user.image,
      })
      .from(user)
      .where(inArray(user.id, friendUserIds));

    friends = friendUsers;
  }

  // 2. Pending incoming requests (friendId = userId)
  const incomingRows = await db
    .select({
      id: friendships.id,
      userId: friendships.userId,
      friendId: friendships.friendId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      senderId: user.id,
      senderName: user.name,
      senderCodename: user.codename,
      senderTargetUniversity: user.targetUniversity,
      senderImage: user.image,
    })
    .from(friendships)
    .innerJoin(user, eq(friendships.userId, user.id))
    .where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));

  const pendingIncoming: FriendshipDto[] = incomingRows.map((row) => ({
    id: row.id,
    friend: {
      id: row.senderId,
      name: row.senderName,
      codename: row.senderCodename,
      targetUniversity: row.senderTargetUniversity,
      image: row.senderImage,
    },
    status: "pending",
    isSender: false,
    createdAt: row.createdAt.toISOString(),
  }));

  // 3. Pending outgoing requests (userId = userId)
  const outgoingRows = await db
    .select({
      id: friendships.id,
      userId: friendships.userId,
      friendId: friendships.friendId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      targetId: user.id,
      targetName: user.name,
      targetCodename: user.codename,
      targetTargetUniversity: user.targetUniversity,
      targetImage: user.image,
    })
    .from(friendships)
    .innerJoin(user, eq(friendships.friendId, user.id))
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));

  const pendingOutgoing: FriendshipDto[] = outgoingRows.map((row) => ({
    id: row.id,
    friend: {
      id: row.targetId,
      name: row.targetName,
      codename: row.targetCodename,
      targetUniversity: row.targetTargetUniversity,
      image: row.targetImage,
    },
    status: "pending",
    isSender: true,
    createdAt: row.createdAt.toISOString(),
  }));

  return { friends, pendingIncoming, pendingOutgoing };
}

export async function searchPotentialFriends(userId: string, query: string) {
  const db = getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matchedUsers = await db
    .select({
      id: user.id,
      name: user.name,
      codename: user.codename,
      targetUniversity: user.targetUniversity,
      image: user.image,
    })
    .from(user)
    .where(
      and(
        ne(user.id, userId),
        eq(user.isDeactivated, false),
        eq(user.isDemo, false),
        eq(user.role, "user"),
        or(
          ilike(user.name, `%${trimmed}%`),
          ilike(user.codename, `%${trimmed}%`),
          ilike(user.email, `%${trimmed}%`),
        ),
      ),
    )
    .limit(20);

  if (matchedUsers.length === 0) return [];

  const userIds = matchedUsers.map((u) => u.id);
  const existingRelations = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), inArray(friendships.friendId, userIds)),
        and(eq(friendships.friendId, userId), inArray(friendships.userId, userIds)),
      ),
    );

  return matchedUsers.map((u) => {
    const rel = existingRelations.find(
      (r) =>
        (r.userId === userId && r.friendId === u.id) ||
        (r.friendId === userId && r.userId === u.id),
    );

    let friendshipStatus: "none" | "pending_incoming" | "pending_outgoing" | "friends" = "none";
    if (rel) {
      if (rel.status === "accepted") {
        friendshipStatus = "friends";
      } else if (rel.status === "pending") {
        friendshipStatus = rel.userId === userId ? "pending_outgoing" : "pending_incoming";
      }
    }

    return {
      ...u,
      friendshipStatus,
    };
  });
}

export async function sendFriendRequest(userId: string, input: SendFriendRequestInput) {
  const db = getDb();
  const { targetUserId } = input;

  if (userId === targetUserId) {
    throw new HTTPException(400, { message: "Tidak dapat menambahkan diri sendiri." });
  }

  const [targetUser] = await db
    .select({ id: user.id, isDeactivated: user.isDeactivated })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!targetUser || targetUser.isDeactivated) {
    throw new HTTPException(404, { message: "Pengguna tidak ditemukan." });
  }

  // Check existing relations
  const [existing] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, targetUserId)),
        and(eq(friendships.userId, targetUserId), eq(friendships.friendId, userId)),
      ),
    );

  if (existing) {
    if (existing.status === "accepted") {
      throw new HTTPException(400, { message: "Kalian sudah berteman." });
    }
    if (existing.status === "pending") {
      if (existing.userId === userId) {
        throw new HTTPException(400, {
          message: "Permintaan pertemanan sudah dikirim sebelumnya.",
        });
      } else {
        // Target previously sent request to current user: auto-accept!
        const [updated] = await db
          .update(friendships)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(friendships.id, existing.id))
          .returning();
        return { success: true, status: "accepted", friendship: updated };
      }
    }
    // If declined or other, update to pending with current user as sender
    const [updated] = await db
      .update(friendships)
      .set({
        userId,
        friendId: targetUserId,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, existing.id))
      .returning();
    return { success: true, status: "pending", friendship: updated };
  }

  const [created] = await db
    .insert(friendships)
    .values({
      userId,
      friendId: targetUserId,
      status: "pending",
    })
    .returning();

  return { success: true, status: "pending", friendship: created };
}

export async function respondFriendRequest(
  userId: string,
  friendshipId: string,
  input: RespondFriendRequestInput,
) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.friendId, userId),
        eq(friendships.status, "pending"),
      ),
    );

  if (!request) {
    throw new HTTPException(404, { message: "Permintaan pertemanan tidak ditemukan." });
  }

  if (input.action === "accept") {
    const [updated] = await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendships.id, request.id))
      .returning();
    return { success: true, status: "accepted", friendship: updated };
  } else {
    // Delete row on decline to allow future requests cleanly
    await db.delete(friendships).where(eq(friendships.id, request.id));
    return { success: true, status: "declined" };
  }
}

export async function removeFriend(userId: string, targetUserId: string) {
  const db = getDb();
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, targetUserId)),
        and(eq(friendships.userId, targetUserId), eq(friendships.friendId, userId)),
      ),
    );
  return { success: true };
}

// ----------------- Warrior Battle Invites -----------------

export async function createBattleInvite(senderId: string, battleId: string, recipientId: string) {
  const db = getDb();

  if (senderId === recipientId) {
    throw new HTTPException(400, { message: "Tidak dapat mengundang diri sendiri." });
  }

  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  if (!battle) {
    throw new HTTPException(404, { message: "Battle room tidak ditemukan." });
  }

  if (battle.status !== "waiting" && battle.status !== "ready") {
    throw new HTTPException(400, { message: "Battle sudah tidak menerima peserta baru." });
  }

  // Check existing invite
  const [existingInvite] = await db
    .select()
    .from(warriorBattleInvites)
    .where(
      and(
        eq(warriorBattleInvites.battleId, battleId),
        eq(warriorBattleInvites.recipientId, recipientId),
        eq(warriorBattleInvites.status, "pending"),
      ),
    );

  if (existingInvite) {
    return { success: true, invite: existingInvite };
  }

  const [invite] = await db
    .insert(warriorBattleInvites)
    .values({
      battleId,
      senderId,
      recipientId,
      status: "pending",
    })
    .returning();

  return { success: true, invite };
}

export async function listPendingBattleInvites(userId: string): Promise<BattleInviteDto[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: warriorBattleInvites.id,
      battleId: warriorBattleInvites.battleId,
      status: warriorBattleInvites.status,
      createdAt: warriorBattleInvites.createdAt,
      battleCode: warriorBattles.code,
      battleMode: warriorBattles.mode,
      battleStatus: warriorBattles.status,
      questionCount: warriorBattles.questionCount,
      topicId: warriorBattles.topicId,
      senderId: user.id,
      senderName: user.name,
      senderCodename: user.codename,
      senderTargetUniversity: user.targetUniversity,
      senderImage: user.image,
    })
    .from(warriorBattleInvites)
    .innerJoin(warriorBattles, eq(warriorBattleInvites.battleId, warriorBattles.id))
    .innerJoin(user, eq(warriorBattleInvites.senderId, user.id))
    .where(
      and(
        eq(warriorBattleInvites.recipientId, userId),
        eq(warriorBattleInvites.status, "pending"),
        eq(warriorBattles.status, "waiting"),
      ),
    )
    .orderBy(desc(warriorBattleInvites.createdAt));

  if (rows.length === 0) return [];

  // Fetch topics for subtest names
  const topicIds = rows.map((r) => r.topicId).filter((t): t is string => Boolean(t));
  let topicMap = new Map<string, string>();
  if (topicIds.length > 0) {
    const topicList = await db
      .select({ id: topics.id, name: topics.name })
      .from(topics)
      .where(inArray(topics.id, topicIds));
    topicMap = new Map(topicList.map((t) => [t.id, t.name]));
  }

  return rows.map((r) => ({
    id: r.id,
    battleId: r.battleId,
    battleCode: r.battleCode,
    mode: r.battleMode as "1v1" | "2v2",
    subtestName: r.topicId ? (topicMap.get(r.topicId) ?? null) : null,
    questionCount: r.questionCount,
    sender: {
      id: r.senderId,
      name: r.senderName,
      codename: r.senderCodename,
      targetUniversity: r.senderTargetUniversity,
      image: r.senderImage,
    },
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function respondBattleInvite(
  userId: string,
  inviteId: string,
  input: RespondBattleInviteInput,
) {
  const db = getDb();

  const [invite] = await db
    .select({
      id: warriorBattleInvites.id,
      battleId: warriorBattleInvites.battleId,
      status: warriorBattleInvites.status,
      battleCode: warriorBattles.code,
      battleStatus: warriorBattles.status,
    })
    .from(warriorBattleInvites)
    .innerJoin(warriorBattles, eq(warriorBattleInvites.battleId, warriorBattles.id))
    .where(
      and(eq(warriorBattleInvites.id, inviteId), eq(warriorBattleInvites.recipientId, userId)),
    );

  if (!invite) {
    throw new HTTPException(404, {
      message: "Undangan battle tidak ditemukan atau telah kedaluwarsa.",
    });
  }

  if (input.action === "decline") {
    await db
      .update(warriorBattleInvites)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(warriorBattleInvites.id, inviteId));
    return { success: true, action: "declined" };
  }

  // Accept action:
  await db
    .update(warriorBattleInvites)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(warriorBattleInvites.id, inviteId));

  const result = await joinBattleByCode(userId, invite.battleCode);
  return {
    success: true,
    action: "accepted",
    battle: { id: result.battle.id },
    code: invite.battleCode,
  };
}
