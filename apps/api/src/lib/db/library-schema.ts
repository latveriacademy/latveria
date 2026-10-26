import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import type { LibraryItemMetadata, LibraryItemType } from "@latveria/shared";

export const libraryItems = pgTable(
  "library_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    type: text("type").$type<LibraryItemType>().notNull().default("article"),
    subtestSlug: text("subtest_slug"),
    content: text("content"),
    url: text("url"),
    thumbnailUrl: text("thumbnail_url"),
    metadata: jsonb("metadata").$type<LibraryItemMetadata>(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isPublished: boolean("is_published").notNull().default(true),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("library_items_type_idx").on(table.type),
    index("library_items_subtest_idx").on(table.subtestSlug),
    index("library_items_published_idx").on(table.isPublished),
    index("library_items_created_idx").on(table.createdAt),
    index("library_items_title_idx").on(table.title),
  ],
).enableRLS();
