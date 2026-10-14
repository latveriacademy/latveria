import { z } from "zod";
import type { QuestionStimulus, TrueFalseStatementClient } from "./questions";

export const battleModeSchema = z.enum(["1v1", "2v2"]);
export type BattleMode = z.infer<typeof battleModeSchema>;

export const battleStatusSchema = z.enum([
  "waiting",
  "ready",
  "countdown",
  "active",
  "question_result",
  "completed",
  "cancelled",
]);
export type BattleStatus = z.infer<typeof battleStatusSchema>;

export const participantStatusSchema = z.enum([
  "joined",
  "ready",
  "playing",
  "disconnected",
  "finished",
]);
export type ParticipantStatus = z.infer<typeof participantStatusSchema>;

export const createBattleSchema = z.object({
  mode: battleModeSchema.default("1v1"),
  questionCount: z.coerce.number().int().min(1).max(10).default(5),
  timePerQuestionSeconds: z.coerce.number().int().min(10).max(60).default(20),
  topicId: z.string().uuid().optional().nullable(),
});
export type CreateBattleInput = z.infer<typeof createBattleSchema>;

export const joinBattleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(10)
    .transform((v) => v.toUpperCase()),
});
export type JoinBattleInput = z.infer<typeof joinBattleSchema>;

export const submitBattleAnswerSchema = z.object({
  battleId: z.string().uuid(),
  questionId: z.string().uuid(),
  position: z.number().int().min(1).max(10),
  selectedAnswer: z.number().int().min(0).max(4).optional(),
  responsePayload: z
    .union([z.record(z.string(), z.boolean()), z.string(), z.number(), z.null()])
    .optional(),
});
export type SubmitBattleAnswerInput = z.infer<typeof submitBattleAnswerSchema>;

// Public Question Payload during active round (NO answer key or explanation!)
export const battleActiveQuestionSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(1).max(10),
  prompt: z.string(),
  questionType: z.string().default("single_choice"),
  options: z.array(z.string()),
  stimulus: z.custom<QuestionStimulus | null>().optional().nullable(),
  passage: z.string().optional().nullable(),
  statements: z.custom<TrueFalseStatementClient[] | null>().optional().nullable(),
  startedAt: z.string(),
  deadlineAt: z.string(),
  durationSeconds: z.number().int(),
});
export type BattleActiveQuestion = z.infer<typeof battleActiveQuestionSchema>;

export const battleParticipantDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  teamId: z.string().uuid(),
  teamNumber: z.number().int(),
  isReady: z.boolean(),
  status: participantStatusSchema,
  score: z.number().int().default(0),
  isLocked: z.boolean().default(false),
  answeredAt: z.string().nullable().optional(),
  lastAnswerCorrect: z.boolean().nullable().optional(),
  lastAnswerPoints: z.number().int().default(0),
  isConnected: z.boolean().default(true),
});
export type BattleParticipantDto = z.infer<typeof battleParticipantDtoSchema>;

export const battleTeamDtoSchema = z.object({
  id: z.string().uuid(),
  teamNumber: z.number().int(),
  score: z.number().int().default(0),
});
export type BattleTeamDto = z.infer<typeof battleTeamDtoSchema>;

export const battleStateDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  mode: battleModeSchema,
  status: battleStatusSchema,
  questionCount: z.number().int(),
  timePerQuestionSeconds: z.number().int(),
  currentQuestionIndex: z.number().int(),
  currentQuestion: battleActiveQuestionSchema.nullable().optional(),
  countdownSeconds: z.number().int().nullable().optional(),
  countdownEndsAt: z.string().nullable().optional(),
  questionStartedAt: z.string().nullable().optional(),
  questionDeadlineAt: z.string().nullable().optional(),
  teams: z.array(battleTeamDtoSchema),
  participants: z.array(battleParticipantDtoSchema),
  myParticipantId: z.string().uuid().nullable().optional(),
  myTeamId: z.string().uuid().nullable().optional(),
  winnerTeamNumber: z.number().int().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdBy: z.string(),
  serverNow: z.string(),
});
export type BattleStateDto = z.infer<typeof battleStateDtoSchema>;

export const questionResultParticipantSchema = z.object({
  participantId: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  teamNumber: z.number().int(),
  isCorrect: z.boolean(),
  points: z.number().int(),
  elapsedMs: z.number().int().nullable().optional(),
  selectedAnswer: z.union([z.number(), z.record(z.string(), z.boolean()), z.null()]).optional(),
});
export type QuestionResultParticipant = z.infer<typeof questionResultParticipantSchema>;

export const questionResultDtoSchema = z.object({
  questionId: z.string().uuid(),
  position: z.number().int(),
  correctAnswer: z.union([z.number(), z.record(z.string(), z.boolean())]).optional(),
  explanation: z.string().optional(),
  participants: z.array(questionResultParticipantSchema),
  teamScores: z.record(z.string(), z.number()), // "team1" -> score, "team2" -> score
  nextTransitionEndsAt: z.string(),
});
export type QuestionResultDto = z.infer<typeof questionResultDtoSchema>;

export const battleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  mode: battleModeSchema,
  questionCount: z.number().int(),
  winnerTeamNumber: z.number().int().nullable().optional(),
  myTeamNumber: z.number().int().nullable().optional(),
  isWinner: z.boolean().nullable().optional(),
  isDraw: z.boolean().default(false),
  teams: z.array(battleTeamDtoSchema),
  participants: z.array(battleParticipantDtoSchema),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type BattleSummaryDto = z.infer<typeof battleSummaryDtoSchema>;

export type BattleReviewQuestion = {
  id: string;
  position: number;
  prompt: string;
  options: string[];
  passage: string | null;
  stimulus: QuestionStimulus | null;
  correctAnswer: number;
  explanation: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
  points: number;
};
export type BattleReviewDto = {
  id: string;
  code: string;
  mode: BattleMode;
  items: BattleReviewQuestion[];
};

// Client -> Server WS message
export const clientWsMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("battle:ready"), isReady: z.boolean() }),
  z.object({
    type: z.literal("battle:answer"),
    questionId: z.string().uuid(),
    position: z.number().int(),
    selectedAnswer: z.number().int().min(0).max(4).optional(),
    responsePayload: z
      .union([z.record(z.string(), z.boolean()), z.string(), z.number(), z.null()])
      .optional(),
  }),
  z.object({ type: z.literal("battle:heartbeat") }),
  z.object({ type: z.literal("battle:rematch") }),
]);
export type ClientWsMessage = z.infer<typeof clientWsMessageSchema>;

// Server -> Client WS message
export const serverWsMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("battle:state"), state: battleStateDtoSchema }),
  z.object({
    type: z.literal("battle:player_joined"),
    participant: battleParticipantDtoSchema,
  }),
  z.object({
    type: z.literal("battle:player_left"),
    participantId: z.string().uuid(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("battle:player_ready"),
    participantId: z.string().uuid(),
    isReady: z.boolean(),
  }),
  z.object({
    type: z.literal("battle:countdown"),
    countdownEndsAt: z.string(),
    secondsRemaining: z.number().int(),
  }),
  z.object({
    type: z.literal("battle:started"),
    question: battleActiveQuestionSchema,
  }),
  z.object({
    type: z.literal("battle:player_locked"),
    participantId: z.string().uuid(),
    userId: z.string(),
    name: z.string(),
    teamNumber: z.number().int(),
    position: z.number().int(),
    elapsedMs: z.number().int(),
  }),
  z.object({
    type: z.literal("battle:question_result"),
    result: questionResultDtoSchema,
  }),
  z.object({
    type: z.literal("battle:next_question"),
    question: battleActiveQuestionSchema,
  }),
  z.object({
    type: z.literal("battle:completed"),
    summary: battleSummaryDtoSchema,
  }),
  z.object({
    type: z.literal("battle:rematch_created"),
    newBattleId: z.string().uuid(),
    code: z.string(),
  }),
  z.object({
    type: z.literal("battle:error"),
    message: z.string(),
  }),
]);
export type ServerWsMessage = z.infer<typeof serverWsMessageSchema>;
