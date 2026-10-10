import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { questions, topics } from "./schema";

export const warriorBattles = pgTable(
  "warrior_battles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    mode: text("mode").notNull().default("1v1"), // 1v1 | 2v2
    status: text("status").notNull().default("waiting"), // waiting, ready, countdown, active, question_result, completed, cancelled
    questionCount: integer("question_count").notNull().default(5),
    timePerQuestionSeconds: integer("time_per_question_seconds").notNull().default(20),
    currentQuestionIndex: integer("current_question_index").notNull().default(0),
    questionStartedAt: timestamp("question_started_at", { withTimezone: true }),
    questionDeadlineAt: timestamp("question_deadline_at", { withTimezone: true }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    winnerTeamNumber: integer("winner_team_number"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("warrior_battles_code_idx").on(table.code),
    index("warrior_battles_status_idx").on(table.status),
    index("warrior_battles_created_by_idx").on(table.createdBy),
  ],
).enableRLS();

export const warriorBattleTeams = pgTable(
  "warrior_battle_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => warriorBattles.id, { onDelete: "cascade" }),
    teamNumber: integer("team_number").notNull(), // 1 or 2
    score: integer("score").notNull().default(0),
  },
  (table) => [
    unique("warrior_battle_teams_battle_num_unique").on(table.battleId, table.teamNumber),
    index("warrior_battle_teams_battle_idx").on(table.battleId),
  ],
).enableRLS();

export const warriorBattleParticipants = pgTable(
  "warrior_battle_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => warriorBattles.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => warriorBattleTeams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isReady: boolean("is_ready").notNull().default(false),
    status: text("status").notNull().default("joined"), // joined, ready, playing, disconnected, finished
    score: integer("score").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
  },
  (table) => [
    unique("warrior_battle_participants_unique").on(table.battleId, table.userId),
    index("warrior_battle_participants_battle_idx").on(table.battleId),
    index("warrior_battle_participants_user_idx").on(table.userId),
  ],
).enableRLS();

export const warriorBattleQuestions = pgTable(
  "warrior_battle_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => warriorBattles.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(), // 1..10
  },
  (table) => [
    unique("warrior_battle_questions_battle_pos_unique").on(table.battleId, table.position),
    index("warrior_battle_questions_battle_idx").on(table.battleId),
  ],
).enableRLS();

export const warriorBattleAnswers = pgTable(
  "warrior_battle_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => warriorBattles.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => warriorBattleParticipants.id, { onDelete: "cascade" }),
    responsePayload: jsonb("response_payload"),
    selectedAnswer: integer("selected_answer"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    elapsedMs: integer("elapsed_ms").notNull().default(0),
    isCorrect: boolean("is_correct").notNull().default(false),
    points: integer("points").notNull().default(0),
  },
  (table) => [
    unique("warrior_battle_answers_unique").on(
      table.battleId,
      table.questionId,
      table.participantId,
    ),
    index("warrior_battle_answers_battle_idx").on(table.battleId),
    index("warrior_battle_answers_participant_idx").on(table.participantId),
  ],
).enableRLS();
