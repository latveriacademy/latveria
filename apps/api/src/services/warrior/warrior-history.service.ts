import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { HTTPException } from "hono/http-exception";
import type { BattleSummaryDto, BattleReviewDto } from "@latveria/shared";
import { getDb } from "../../lib/db";
import {
  questions,
  warriorBattleAnswers,
  warriorBattleQuestions,
  warriorBattleParticipants,
  warriorBattles,
} from "../../lib/db/schema";
import { createBattle, getBattleState } from "./warrior-battle.service";
import { broadcastToBattle } from "./warrior-room.manager";

export async function getUserBattleHistory(userId: string): Promise<BattleSummaryDto[]> {
  const db = getDb();
  // Find all battles where user participated
  const participations = await db
    .select({ battleId: warriorBattleParticipants.battleId })
    .from(warriorBattleParticipants)
    .where(eq(warriorBattleParticipants.userId, userId))
    .limit(50);

  if (participations.length === 0) return [];

  const battleIds = participations.map((p) => p.battleId);
  const battles = await db
    .select()
    .from(warriorBattles)
    .where(and(inArray(warriorBattles.id, battleIds), eq(warriorBattles.status, "completed")))
    .orderBy(desc(warriorBattles.endedAt))
    .limit(20);

  const summaries: BattleSummaryDto[] = [];
  for (const b of battles) {
    const state = await getBattleState(b.id, userId);
    const myP = state.participants.find((p) => p.userId === userId);
    const myTeamNumber = myP?.teamNumber ?? null;
    const isWinner =
      state.winnerTeamNumber && myTeamNumber ? state.winnerTeamNumber === myTeamNumber : false;

    summaries.push({
      id: state.id,
      code: state.code,
      mode: state.mode,
      questionCount: state.questionCount,
      winnerTeamNumber: state.winnerTeamNumber,
      myTeamNumber,
      isWinner,
      isDraw: state.winnerTeamNumber === null,
      teams: state.teams,
      participants: state.participants,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      createdAt: state.serverNow,
    });
  }

  return summaries;
}

export async function createRematch(oldBattleId: string, userId: string) {
  const db = getDb();
  const [oldBattle] = await db
    .select()
    .from(warriorBattles)
    .where(eq(warriorBattles.id, oldBattleId));

  if (!oldBattle) {
    throw new HTTPException(404, { message: "Battle lama tidak ditemukan." });
  }

  // Verify caller was participant
  const [participant] = await db
    .select()
    .from(warriorBattleParticipants)
    .where(
      and(
        eq(warriorBattleParticipants.battleId, oldBattleId),
        eq(warriorBattleParticipants.userId, userId),
      ),
    );

  if (!participant) {
    throw new HTTPException(403, { message: "Hanya peserta yang dapat membuat rematch." });
  }
  if (oldBattle.status !== "completed")
    throw new HTTPException(400, { message: "Battle harus selesai sebelum tanding ulang." });

  // Create brand new immutable battle instance
  const newBattleRes = await createBattle(userId, {
    mode: oldBattle.mode as "1v1" | "2v2",
    questionCount: oldBattle.questionCount,
    timePerQuestionSeconds: oldBattle.timePerQuestionSeconds,
    topicId: oldBattle.topicId,
  });

  // Broadcast to old room so opponents can click rematch link
  broadcastToBattle(oldBattleId, {
    type: "battle:rematch_created",
    newBattleId: newBattleRes.battle.id,
    code: newBattleRes.battle.code,
  });

  return newBattleRes;
}

export async function getBattleReview(battleId: string, userId: string): Promise<BattleReviewDto> {
  const db = getDb();
  const [participant] = await db
    .select({ id: warriorBattleParticipants.id })
    .from(warriorBattleParticipants)
    .where(
      and(
        eq(warriorBattleParticipants.battleId, battleId),
        eq(warriorBattleParticipants.userId, userId),
      ),
    );
  if (!participant) throw new HTTPException(403, { message: "Anda bukan peserta battle ini." });
  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));
  if (!battle || battle.status !== "completed")
    throw new HTTPException(409, { message: "Pembahasan tersedia setelah battle selesai." });
  const source = alias(questions, "battle_passage_source");
  const rows = await db
    .select({
      id: questions.id,
      position: warriorBattleQuestions.position,
      prompt: questions.prompt,
      options: questions.options,
      passage: questions.passage,
      stimulus: questions.stimulus,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      selectedAnswer: warriorBattleAnswers.selectedAnswer,
      isCorrect: warriorBattleAnswers.isCorrect,
      points: warriorBattleAnswers.points,
      sourcePassage: source.passage,
      sourceStimulus: source.stimulus,
    })
    .from(warriorBattleQuestions)
    .innerJoin(questions, eq(questions.id, warriorBattleQuestions.questionId))
    .leftJoin(source, eq(source.id, questions.passageId))
    .leftJoin(
      warriorBattleAnswers,
      and(
        eq(warriorBattleAnswers.battleId, battleId),
        eq(warriorBattleAnswers.questionId, questions.id),
        eq(warriorBattleAnswers.participantId, participant.id),
      ),
    )
    .where(eq(warriorBattleQuestions.battleId, battleId))
    .orderBy(asc(warriorBattleQuestions.position));
  if (rows.length !== battle.questionCount)
    throw new HTTPException(409, { message: "Riwayat soal battle belum lengkap." });
  return {
    id: battle.id,
    code: battle.code,
    mode: battle.mode as BattleReviewDto["mode"],
    items: rows.map(({ sourcePassage, sourceStimulus, ...row }) => ({
      ...row,
      passage:
        row.passage || row.stimulus?.passage || sourcePassage || sourceStimulus?.passage || null,
      stimulus: row.stimulus ?? null,
      selectedAnswer: row.selectedAnswer ?? null,
      isCorrect: row.isCorrect ?? false,
      points: row.points ?? 0,
    })),
  };
}
