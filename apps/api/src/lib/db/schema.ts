import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("utbk"),
  section: text("section").notNull().default("tps"),
  order: integer("order").notNull().default(0),
}).enableRLS();

export const questionPackages = pgTable(
  "question_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    packageType: text("package_type").notNull().default("Tryout"),
    duration: integer("duration").notNull().default(30),
    category: text("category").notNull().default("utbk"),
    isFullTryout: boolean("is_full_tryout").notNull().default(false),
    targetQuestions: integer("target_questions").notNull().default(30),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("question_packages_id_topic_unique").on(table.id, table.topicId),
    unique("question_packages_topic_name_unique").on(table.topicId, table.name),
  ],
).enableRLS();

// bank soal draft dengan empat opsi; versi immutable ditambahkan saat sesi latihan dibangun.
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    packageId: uuid("package_id").references(() => questionPackages.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull(),
    options: text("options").array().notNull(),
    correctAnswer: integer("correct_answer").notNull(),
    explanation: text("explanation").notNull(),
    source: text("source").notNull(),
    category: text("category"),
    itemWeight: integer("item_weight").notNull().default(100),
    calculatorAllowed: boolean("calculator_allowed").notNull().default(false),
    imageUrl: text("image_url"),
    order: integer("order").notNull().default(0),
    subtestOrder: integer("subtest_order").notNull().default(0),
  },
  (table) => [
    check(
      "questions_four_options",
      sql`array_ndims(${table.options}) = 1 and cardinality(${table.options}) = 4 and array_position(${table.options}, null) is null`,
    ),
    check("questions_valid_answer", sql`${table.correctAnswer} between 0 and 3`),
    foreignKey({
      columns: [table.packageId, table.topicId],
      foreignColumns: [questionPackages.id, questionPackages.topicId],
      name: "questions_package_topic_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

export const practiceAttempts = pgTable(
  "practice_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    packageId: uuid("package_id").references(() => questionPackages.id, { onDelete: "set null" }),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    score: integer("score"),
    rawScore: integer("raw_score"),
    timeSpentSeconds: integer("time_spent_seconds"),
    scoreBreakdown: text("score_breakdown"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "attempt_valid_score",
      sql`${table.correctCount} >= 0 and ${table.correctCount} <= ${table.totalCount} and ${table.totalCount} > 0`,
    ),
    index("practice_attempts_user_submitted_idx").on(table.userId, table.submittedAt),
    index("practice_attempts_submitted_idx").on(table.submittedAt),
    foreignKey({
      columns: [table.packageId, table.topicId],
      foreignColumns: [questionPackages.id, questionPackages.topicId],
      name: "practice_attempts_package_topic_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

export const practiceAnswers = pgTable(
  "practice_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => practiceAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    selectedAnswer: integer("selected_answer").notNull(),
    isCorrect: integer("is_correct").notNull(),
    isFirstAttempt: boolean("is_first_attempt").default(true).notNull(),
    timeSpentSeconds: integer("time_spent_seconds"),
    itemWeight: integer("item_weight"),
    timeFactor: integer("time_factor"),
    itemScore: integer("item_score"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("answer_attempt_question_unique").on(table.attemptId, table.questionId),
    index("practice_answers_submitted_idx").on(table.submittedAt),
    check("answer_valid_selected", sql`${table.selectedAnswer} between 0 and 3`),
    check("answer_valid_correct", sql`${table.isCorrect} in (0, 1)`),
  ],
).enableRLS();

export const affirmations = pgTable("affirmations", {
  id: uuid("id").defaultRandom().primaryKey(),
  affirmation: text("affirmation").notNull(),
  author: text("author"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const questionReports = pgTable("question_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  packageId: uuid("package_id").references(() => questionPackages.id, { onDelete: "set null" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const tryoutSessions = pgTable("tryout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  packageId: uuid("package_id")
    .notNull()
    .references(() => questionPackages.id, { onDelete: "cascade" }),
  currentSubtestIndex: integer("current_subtest_index").notNull().default(0),
  state: text("state").notNull().default("active"),
  breakEndsAt: timestamp("break_ends_at", { withTimezone: true }),
  answers: text("answers").notNull().default("{}"),
  flags: text("flags").notNull().default("{}"),
  questionSets: text("question_sets").notNull().default("{}"),
  questionTimes: text("question_times").notNull().default("{}"),
  scoreBreakdown: text("score_breakdown").notNull().default("[]"),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  subtestStartedAt: timestamp("subtest_started_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalScore: integer("total_score"),
}).enableRLS();

export const tryoutPackageQuestions = pgTable(
  "tryout_package_questions",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => questionPackages.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
  },
  (table) => [unique("tryout_package_questions_unique").on(table.packageId, table.questionId)],
).enableRLS();
