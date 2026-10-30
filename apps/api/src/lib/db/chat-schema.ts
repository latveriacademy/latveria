import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").references(() => user.id, { onDelete: "cascade" }), // null = global room, non-null = DM
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("chat_messages_sender_idx").on(table.senderId),
    index("chat_messages_recipient_idx").on(table.recipientId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ],
).enableRLS();
