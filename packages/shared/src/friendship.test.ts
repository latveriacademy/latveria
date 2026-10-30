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
});
