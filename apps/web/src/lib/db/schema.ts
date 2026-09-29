import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
}).enableRLS();

// ponytail: bank soal draft dengan empat opsi; versi immutable ditambahkan saat sesi latihan dibangun.
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id),
  prompt: text("prompt").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  source: text("source").notNull(),
}, (table) => [
  check("questions_four_options", sql`array_ndims(${table.options}) = 1 and cardinality(${table.options}) = 4 and array_position(${table.options}, null) is null`),
  check("questions_valid_answer", sql`${table.correctAnswer} between 0 and 3`),
]).enableRLS();
