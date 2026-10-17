import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import type {
  LexiconAnnotation,
  QuestionStimulus,
  TrueFalseStatement,
  ScoringConfig,
  UtbkScoreReport,
  SectionCalibration,
  IrtDatasetItem,
  IrtParameter,
  IrtDiagnostics,
} from "@latveria/shared";

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
    targetYear: integer("target_year"),
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
    questionType: text("question_type").notNull().default("single_choice"),
    schemaVersion: integer("schema_version").notNull().default(1),
    prompt: text("prompt").notNull(),
    stimulus: jsonb("stimulus").$type<QuestionStimulus>(),
    passage: text("passage"),
    passageId: uuid("passage_id").references((): AnyPgColumn => questions.id, {
      onDelete: "set null",
    }),
    statements: jsonb("statements").$type<TrueFalseStatement[]>(),
    scoringConfig: jsonb("scoring_config").$type<ScoringConfig>(),
    annotations: jsonb("annotations").$type<LexiconAnnotation[]>().notNull().default([]),
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
    contentFingerprint: text("content_fingerprint"),
    workflowStatus: text("workflow_status").notNull().default("published"),
    difficulty: text("difficulty").notNull().default("medium"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceQuestionId: uuid("source_question_id").references((): AnyPgColumn => questions.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    reviewerNotes: text("reviewer_notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("questions_fingerprint_idx").on(table.contentFingerprint),
    index("questions_workflow_status_idx").on(table.workflowStatus),
    index("questions_difficulty_idx").on(table.difficulty),
    index("questions_source_idx").on(table.sourceQuestionId),
    check(
      "questions_five_options",
      sql`${table.questionType} != 'single_choice' or (array_ndims(${table.options}) = 1 and cardinality(${table.options}) = 5 and array_position(${table.options}, null) is null)`,
    ),
    check(
      "questions_valid_answer",
      sql`${table.questionType} != 'single_choice' or (${table.correctAnswer} between 0 and 4)`,
    ),
    foreignKey({
      columns: [table.packageId, table.topicId],
      foreignColumns: [questionPackages.id, questionPackages.topicId],
      name: "questions_package_topic_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

export const learnerVocabulary = pgTable(
  "learner_vocabulary",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
    annotationId: uuid("annotation_id").notNull(),
    annotation: jsonb("annotation").$type<LexiconAnnotation>().notNull(),
    source: text("source").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("vocabulary_user_question_annotation_unique").on(
      table.userId,
      table.questionId,
      table.annotationId,
    ),
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
      .references(() => questions.id, { onDelete: "cascade" }),
    selectedAnswer: integer("selected_answer").notNull(),
    responsePayload: jsonb("response_payload"),
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
    check(
      "answer_valid_selected",
      sql`${table.selectedAnswer} between 0 and 4 or ${table.selectedAnswer} = -1`,
    ),
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
  subtestConfig: text("subtest_config").notNull().default("[]"),
  questionTimes: text("question_times").notNull().default("{}"),
  scoreBreakdown: text("score_breakdown").notNull().default("[]"),
  scoringVersion: text("scoring_version").notNull().default("legacy"),
  revisionSets: jsonb("revision_sets").$type<Record<string, string>>().notNull().default({}),
  scoringPlan: jsonb("scoring_plan")
    .$type<Record<string, SectionCalibration>>()
    .notNull()
    .default({}),
  scoreReport: jsonb("score_report").$type<UtbkScoreReport>(),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  subtestStartedAt: timestamp("subtest_started_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalScore: integer("total_score"),
}).enableRLS();

export const tryoutSections = pgTable(
  "tryout_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => questionPackages.id, { onDelete: "cascade" }),
    subtestCode: text("subtest_code").notNull(),
    title: text("title").notNull(),
    sectionOrder: integer("section_order").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(1800),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("tryout_sections_package_code_unique").on(table.packageId, table.subtestCode),
    unique("tryout_sections_package_order_unique").on(table.packageId, table.sectionOrder),
    index("tryout_sections_package_idx").on(table.packageId),
  ],
).enableRLS();

export const tryoutPackageQuestions = pgTable(
  "tryout_package_questions",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => questionPackages.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => tryoutSections.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    unique("tryout_package_questions_unique").on(table.packageId, table.questionId),
    index("tryout_package_questions_section_idx").on(table.sectionId),
  ],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_admin_idx").on(table.adminId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
).enableRLS();

export const questionRevisions = pgTable(
  "question_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Logical ID survives deletion of mutable bank content.
    questionId: uuid("question_id").notNull(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    contentHash: text("content_hash").notNull(),
    snapshot: jsonb("snapshot").$type<typeof questions.$inferSelect>().notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    changeSummary: text("change_summary"),
    changeReason: text("change_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("question_revision_hash_unique").on(table.questionId, table.contentHash),
    index("question_revisions_question_idx").on(table.questionId, table.createdAt),
  ],
).enableRLS();

export const tryoutResponses = pgTable(
  "tryout_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tryoutSessions.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => questionRevisions.id),
    questionId: uuid("question_id").notNull(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    answer: jsonb("answer").$type<unknown>(),
    isAnswered: boolean("is_answered").notNull(),
    scoreFraction: doublePrecision("score_fraction").notNull(),
    maxPoints: integer("max_points").notNull(),
    timeSpentSeconds: integer("time_spent_seconds").notNull(),
    irtEligible: boolean("irt_eligible").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("tryout_response_session_question_unique").on(table.sessionId, table.questionId),
    check(
      "tryout_response_valid_score",
      sql`${table.scoreFraction} between 0 and 1 and ${table.maxPoints} > 0 and ${table.timeSpentSeconds} >= 0`,
    ),
    index("tryout_response_topic_idx").on(table.topicId),
  ],
).enableRLS();

export const irtDatasets = pgTable("irt_datasets", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id),
  datasetHash: text("dataset_hash").notNull().unique(),
  sampleSize: integer("sample_size").notNull(),
  items: jsonb("items").$type<IrtDatasetItem[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const irtCalibrations = pgTable(
  "irt_calibrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => irtDatasets.id),
    version: text("version").notNull(),
    active: boolean("active").notNull().default(false),
    parameters: jsonb("parameters").$type<IrtParameter[]>().notNull(),
    diagnostics: jsonb("diagnostics").$type<IrtDiagnostics>().notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("irt_calibration_topic_version_unique").on(table.topicId, table.version),
    uniqueIndex("irt_calibration_active_topic_unique")
      .on(table.topicId)
      .where(sql`${table.active} = true`),
  ],
).enableRLS();

export * from "./warrior-schema";
export * from "./latex-schema";
export * from "./question-intelligence-schema";
