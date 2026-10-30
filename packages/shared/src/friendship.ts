import { z } from "zod";

export const friendUserDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  codename: z.string().nullable().optional(),
  targetUniversity: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});
export type FriendUserDto = z.infer<typeof friendUserDtoSchema>;

export const friendshipStatusSchema = z.enum(["pending", "accepted", "declined"]);
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

export const friendshipDtoSchema = z.object({
  id: z.string().uuid(),
  friend: friendUserDtoSchema,
  status: friendshipStatusSchema,
  isSender: z.boolean(),
  createdAt: z.string(),
});
export type FriendshipDto = z.infer<typeof friendshipDtoSchema>;

export const sendFriendRequestSchema = z.object({
  targetUserId: z.string().min(1, "Target user tidak boleh kosong."),
});
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const respondFriendRequestSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;

export const battleInviteDtoSchema = z.object({
  id: z.string().uuid(),
  battleId: z.string().uuid(),
  battleCode: z.string(),
  mode: z.enum(["1v1", "2v2"]),
  subtestName: z.string().nullable().optional(),
  questionCount: z.number().int(),
  sender: friendUserDtoSchema,
  createdAt: z.string(),
});
export type BattleInviteDto = z.infer<typeof battleInviteDtoSchema>;

export const createBattleInviteSchema = z.object({
  battleId: z.string().uuid("ID battle tidak valid."),
  recipientId: z.string().min(1, "ID penerima tidak boleh kosong."),
});
export type CreateBattleInviteInput = z.infer<typeof createBattleInviteSchema>;

export const respondBattleInviteSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
export type RespondBattleInviteInput = z.infer<typeof respondBattleInviteSchema>;
