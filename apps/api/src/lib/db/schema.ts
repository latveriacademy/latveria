import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
}).enableRLS();

export const questionPackages = pgTable("question_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("question_packages_id_topic_unique").on(table.id, table.topicId),
  unique("question_packages_topic_name_unique").on(table.topicId, table.name),
]).enableRLS();

// ponytail: bank soal draft dengan empat opsi; versi immutable ditambahkan saat sesi latihan dibangun.
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id),
  packageId: uuid("package_id").references(() => questionPackages.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  source: text("source").notNull(),
  category: text("category"),
}, (table) => [
  check("questions_four_options", sql`array_ndims(${table.options}) = 1 and cardinality(${table.options}) = 4 and array_position(${table.options}, null) is null`),
  check("questions_valid_answer", sql`${table.correctAnswer} between 0 and 3`),
  foreignKey({
    columns: [table.packageId, table.topicId],
    foreignColumns: [questionPackages.id, questionPackages.topicId],
    name: "questions_package_topic_fk",
  }).onDelete("set null"),
]).enableRLS();

export const practiceAttempts = pgTable("practice_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id),
  packageId: uuid("package_id").references(() => questionPackages.id, { onDelete: "set null" }),
  correctCount: integer("correct_count").notNull(),
  totalCount: integer("total_count").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("attempt_valid_score", sql`${table.correctCount} >= 0 and ${table.correctCount} <= ${table.totalCount} and ${table.totalCount} > 0`),
  index("practice_attempts_user_submitted_idx").on(table.userId, table.submittedAt),
  index("practice_attempts_submitted_idx").on(table.submittedAt),
  foreignKey({
    columns: [table.packageId, table.topicId],
    foreignColumns: [questionPackages.id, questionPackages.topicId],
    name: "practice_attempts_package_topic_fk",
  }).onDelete("set null"),
]).enableRLS();

export const practiceAnswers = pgTable("practice_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id").notNull().references(() => practiceAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id),
  selectedAnswer: integer("selected_answer").notNull(),
  isCorrect: integer("is_correct").notNull(),
  isFirstAttempt: boolean("is_first_attempt").default(true).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("answer_attempt_question_unique").on(table.attemptId, table.questionId),
  check("answer_valid_selected", sql`${table.selectedAnswer} between 0 and 3`),
  check("answer_valid_correct", sql`${table.isCorrect} in (0, 1)`),
]).enableRLS();
