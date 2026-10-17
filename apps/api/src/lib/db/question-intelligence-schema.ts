import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import type { QuestionStimulus } from "@latveria/shared";

export const passages = pgTable(
  "passages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    content: text("content"),
    stimulus: jsonb("stimulus").$type<QuestionStimulus>(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isArchived: boolean("is_archived").notNull().default(false),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("passages_title_idx").on(table.title),
    index("passages_created_idx").on(table.createdAt),
    index("passages_archived_idx").on(table.isArchived),
  ],
).enableRLS();
