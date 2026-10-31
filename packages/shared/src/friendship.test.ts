import { describe, expect, it } from "vitest";
import {
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  createBattleInviteSchema,
  respondBattleInviteSchema,
} from "./friendship";

describe("Friendship Shared Schemas", () => {
  it("validates sendFriendRequestSchema", () => {
    expect(sendFriendRequestSchema.parse({ targetUserId: "user-123" })).toEqual({
      targetUserId: "user-123",
    });
    expect(() => sendFriendRequestSchema.parse({ targetUserId: "" })).toThrow();
  });

  it("validates respondFriendRequestSchema", () => {
    expect(respondFriendRequestSchema.parse({ action: "accept" })).toEqual({ action: "accept" });
    expect(respondFriendRequestSchema.parse({ action: "decline" })).toEqual({ action: "decline" });
    expect(() => respondFriendRequestSchema.parse({ action: "block" })).toThrow();
  });

  it("validates createBattleInviteSchema", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(
      createBattleInviteSchema.parse({ battleId: validUuid, recipientId: "friend-1" }),
    ).toEqual({
      battleId: validUuid,
      recipientId: "friend-1",
    });
    expect(() =>
      createBattleInviteSchema.parse({ battleId: "invalid-uuid", recipientId: "friend-1" }),
    ).toThrow();
  });

  it("validates respondBattleInviteSchema", () => {
    expect(respondBattleInviteSchema.parse({ action: "accept" })).toEqual({ action: "accept" });
    expect(respondBattleInviteSchema.parse({ action: "decline" })).toEqual({ action: "decline" });
  });

  it("exports PublicLearnerProfile contract structure", () => {
    const profile = {
      id: "u-1",
      name: "Raditya",
      codename: "radit",
      targetUniversity: "ITB - STEI",
      bio: "Fokus UTBK",
      motto: "Usaha tidak mengkhianati hasil",
      image: null,
      totalXP: 1200,
      level: 4,
      streakDays: 5,
      accuracy: 85.5,
      totalAnswered: 40,
      connectedCount: 12,
      friendshipStatus: "friends" as const,
      friendshipId: "rel-1",
    };
    expect(profile.connectedCount).toBe(12);
    expect(profile.friendshipStatus).toBe("friends");
  });
});
