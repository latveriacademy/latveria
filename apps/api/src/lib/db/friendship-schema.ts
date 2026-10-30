import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { warriorBattles } from "./warrior-schema";

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    friendId: text("friend_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | accepted | declined
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("friendships_user_friend_unique").on(table.userId, table.friendId),
    index("friendships_user_id_idx").on(table.userId),
    index("friendships_friend_id_idx").on(table.friendId),
    index("friendships_status_idx").on(table.status),
  ],
).enableRLS();

export const warriorBattleInvites = pgTable(
  "warrior_battle_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => warriorBattles.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | accepted | declined | expired
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("warrior_battle_invites_battle_idx").on(table.battleId),
    index("warrior_battle_invites_recipient_idx").on(table.recipientId),
    index("warrior_battle_invites_status_idx").on(table.status),
  ],
).enableRLS();
