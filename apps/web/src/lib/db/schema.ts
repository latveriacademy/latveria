import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
}).enableRLS();
