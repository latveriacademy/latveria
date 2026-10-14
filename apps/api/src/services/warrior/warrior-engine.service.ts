import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type {
  BattleActiveQuestion,
  BattleSummaryDto,
  QuestionResultDto,
  QuestionResultParticipant,
  SubmitBattleAnswerInput,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import { user } from "../../lib/db/auth-schema";
import {
  questions,
  warriorBattleAnswers,
  warriorBattleParticipants,
  warriorBattleQuestions,
  warriorBattles,
  warriorBattleTeams,
} from "../../lib/db/schema";
import { broadcastToBattle, clearRoomTimer, setRoomTimer } from "./warrior-room.manager";
import { calculateBattleScore } from "./warrior-scoring";
import { submitBattleAnswerSchema } from "@latveria/shared";
import { getBattleState } from "./warrior-battle.service";

export async function togglePlayerReady(battleId: string, userId: string, isReady: boolean) {
  const db = getDb();
  const [participant] = await db
    .select()
    .from(warriorBattleParticipants)
    .where(
      and(
        eq(warriorBattleParticipants.battleId, battleId),
        eq(warriorBattleParticipants.userId, userId),
      ),
    );

  if (!participant) {
    throw new HTTPException(404, { message: "Peserta tidak ditemukan." });
  }

  await db
    .update(warriorBattleParticipants)
    .set({ isReady, status: isReady ? "ready" : "joined" })
    .where(eq(warriorBattleParticipants.id, participant.id));

  broadcastToBattle(battleId, {
    type: "battle:player_ready",
    participantId: participant.id,
    isReady,
  });

  // Check if all slots filled and all ready
  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  const allParticipants = await db
    .select()
    .from(warriorBattleParticipants)
    .where(eq(warriorBattleParticipants.battleId, battleId));

  const requiredCount = battle.mode === "1v1" ? 2 : 4;
  const allReady =
    allParticipants.length === requiredCount &&
    allParticipants.every((p) => (p.id === participant.id ? isReady : p.isReady));

  if (allReady && battle.status === "waiting") {
    await startCountdown(battleId);
  }
}

async function startCountdown(battleId: string) {
  const db = getDb();
  await db
    .update(warriorBattles)
    .set({ status: "countdown" })
    .where(eq(warriorBattles.id, battleId));

  const countdownSeconds = 3;
  const countdownEndsAt = new Date(Date.now() + countdownSeconds * 1000).toISOString();

  broadcastToBattle(battleId, {
    type: "battle:countdown",
    countdownEndsAt,
    secondsRemaining: countdownSeconds,
  });

  const timer = setTimeout(async () => {
    try {
      await startQuestion(battleId, 1);
    } catch (err) {
      console.error(`[WarriorEngine] Failed to start round 1 for battle ${battleId}:`, err);
    }
  }, countdownSeconds * 1000);

  setRoomTimer(battleId, timer);
}

export async function startQuestion(battleId: string, position: number) {
  const db = getDb();
  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  if (!battle || battle.status === "completed" || battle.status === "cancelled") return;

  const [questionRow] = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      questionType: questions.questionType,
      options: questions.options,
      stimulus: questions.stimulus,
      passage: questions.passage,
      statements: questions.statements,
    })
    .from(warriorBattleQuestions)
    .innerJoin(questions, eq(warriorBattleQuestions.questionId, questions.id))
    .where(
      and(
        eq(warriorBattleQuestions.battleId, battleId),
        eq(warriorBattleQuestions.position, position),
      ),
    );

  if (!questionRow) {
    await completeBattle(battleId);
    return;
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + battle.timePerQuestionSeconds * 1000);

  await db
    .update(warriorBattles)
    .set({
      status: "active",
      currentQuestionIndex: position,
      questionStartedAt: now,
      questionDeadlineAt: deadline,
      startedAt: battle.startedAt ?? now,
    })
    .where(eq(warriorBattles.id, battleId));

  const activeQuestion: BattleActiveQuestion = {
    id: questionRow.id,
    position,
    prompt: questionRow.prompt,
    questionType: questionRow.questionType,
    options: questionRow.options,
    stimulus: questionRow.stimulus,
    passage: questionRow.passage,
    statements: questionRow.statements,
    startedAt: now.toISOString(),
    deadlineAt: deadline.toISOString(),
    durationSeconds: battle.timePerQuestionSeconds,
  };

  if (position === 1) {
    broadcastToBattle(battleId, { type: "battle:started", question: activeQuestion });
  } else {
    broadcastToBattle(battleId, { type: "battle:next_question", question: activeQuestion });
  }

  // Set authoritative question timeout
  const timeoutMs = battle.timePerQuestionSeconds * 1000 + 500; // 500ms network buffer
  const timer = setTimeout(async () => {
    try {
      await resolveQuestion(battleId, position);
    } catch (err) {
      console.error(`[WarriorEngine] Failed to resolve question ${position} on timeout:`, err);
    }
  }, timeoutMs);

  setRoomTimer(battleId, timer);
}

export async function submitAnswer(
  battleId: string,
  userId: string,
  input: SubmitBattleAnswerInput,
) {
  const parsed = submitBattleAnswerSchema.safeParse(input);
  if (!parsed.success || parsed.data.selectedAnswer === undefined)
    throw new HTTPException(400, { message: "Data jawaban tidak valid." });
  input = parsed.data;
  const db = getDb();
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [battle] = await tx
      .select()
      .from(warriorBattles)
      .where(eq(warriorBattles.id, battleId))
      .for("update");

    if (!battle) throw new HTTPException(404, { message: "Battle tidak ditemukan." });
    if (battle.status !== "active") {
      throw new HTTPException(400, { message: "Babak soal belum aktif atau sudah berakhir." });
    }
    if (battle.currentQuestionIndex !== input.position) {
      throw new HTTPException(400, { message: "Soal yang dijawab tidak sesuai ronde aktif." });
    }
    const [activeQuestion] = await tx
      .select({ id: warriorBattleQuestions.questionId })
      .from(warriorBattleQuestions)
      .where(
        and(
          eq(warriorBattleQuestions.battleId, battleId),
          eq(warriorBattleQuestions.position, input.position),
        ),
      );
    if (!activeQuestion || activeQuestion.id !== input.questionId)
      throw new HTTPException(400, { message: "Soal yang dijawab tidak sesuai ronde aktif." });

    // Server-authoritative deadline validation
    if (battle.questionDeadlineAt && now.getTime() > battle.questionDeadlineAt.getTime() + 1000) {
      throw new HTTPException(400, { message: "Waktu menjawab soal ini telah habis." });
    }

    const [participant] = await tx
      .select()
      .from(warriorBattleParticipants)
      .where(
        and(
          eq(warriorBattleParticipants.battleId, battleId),
          eq(warriorBattleParticipants.userId, userId),
        ),
      );

    if (!participant) {
      throw new HTTPException(403, { message: "Anda bukan peserta battle ini." });
    }

    // Idempotency: verify no previous answer for this round
    const existing = await tx
      .select()
      .from(warriorBattleAnswers)
      .where(
        and(
          eq(warriorBattleAnswers.battleId, battleId),
          eq(warriorBattleAnswers.questionId, input.questionId),
          eq(warriorBattleAnswers.participantId, participant.id),
        ),
      );

    if (existing.length > 0) {
      throw new HTTPException(409, { message: "Jawaban untuk soal ini sudah dikunci." });
    }

    // Fetch actual question to verify correctness
    const [questionRow] = await tx
      .select()
      .from(questions)
      .where(eq(questions.id, input.questionId))
      .for("update");

    if (!questionRow) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
    if (input.selectedAnswer === undefined || input.selectedAnswer >= questionRow.options.length)
      throw new HTTPException(400, { message: "Pilihan jawaban tidak valid." });

    const isCorrect = input.selectedAnswer === questionRow.correctAnswer;
    const elapsedMs = battle.questionStartedAt
      ? Math.max(0, now.getTime() - battle.questionStartedAt.getTime())
      : 0;

    const points = calculateBattleScore(isCorrect, elapsedMs, battle.timePerQuestionSeconds);

    // Save answer
    await tx.insert(warriorBattleAnswers).values({
      battleId,
      questionId: input.questionId,
      participantId: participant.id,
      selectedAnswer: input.selectedAnswer ?? null,
      responsePayload: input.responsePayload ?? null,
      submittedAt: now,
      elapsedMs,
      isCorrect,
      points,
    });

    // Update participant score
    await tx
      .update(warriorBattleParticipants)
      .set({ score: sql`${warriorBattleParticipants.score} + ${points}` })
      .where(eq(warriorBattleParticipants.id, participant.id));

    // Update team score
    await tx
      .update(warriorBattleTeams)
      .set({ score: sql`${warriorBattleTeams.score} + ${points}` })
      .where(eq(warriorBattleTeams.id, participant.teamId));

    const [userInfo] = await tx.select({ name: user.name }).from(user).where(eq(user.id, userId));
    const [team] = await tx
      .select({ teamNumber: warriorBattleTeams.teamNumber })
      .from(warriorBattleTeams)
      .where(eq(warriorBattleTeams.id, participant.teamId));

    // Broadcast that player has locked in (NO answer leak!)
    broadcastToBattle(battleId, {
      type: "battle:player_locked",
      participantId: participant.id,
      userId,
      name: userInfo?.name ?? "Peserta",
      teamNumber: team?.teamNumber ?? 1,
      position: input.position,
      elapsedMs,
    });

    // Check if ALL participants have answered
    const totalParticipants = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(warriorBattleParticipants)
      .where(eq(warriorBattleParticipants.battleId, battleId));

    const totalAnswers = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(warriorBattleAnswers)
      .where(
        and(
          eq(warriorBattleAnswers.battleId, battleId),
          eq(warriorBattleAnswers.questionId, input.questionId),
        ),
      );

    if (totalAnswers[0].count >= totalParticipants[0].count) {
      clearRoomTimer(battleId);
      // Trigger resolve slightly after last lock (300ms) for smoother UI transition
      setTimeout(async () => {
        try {
          await resolveQuestion(battleId, input.position);
        } catch (err) {
          console.error(`[WarriorEngine] Failed to resolve after all players locked:`, err);
        }
      }, 300);
    }

    return { isCorrect, points, elapsedMs };
  });
}

export async function resolveQuestion(battleId: string, position: number) {
  clearRoomTimer(battleId);
  const db = getDb();

  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  if (!battle || battle.status !== "active") return;

  await db
    .update(warriorBattles)
    .set({ status: "question_result" })
    .where(eq(warriorBattles.id, battleId));

  const [qRelation] = await db
    .select({ questionId: warriorBattleQuestions.questionId })
    .from(warriorBattleQuestions)
    .where(
      and(
        eq(warriorBattleQuestions.battleId, battleId),
        eq(warriorBattleQuestions.position, position),
      ),
    );

  if (!qRelation) return;

  const participants = await db
    .select({
      id: warriorBattleParticipants.id,
      userId: warriorBattleParticipants.userId,
      name: user.name,
      teamId: warriorBattleParticipants.teamId,
    })
    .from(warriorBattleParticipants)
    .innerJoin(user, eq(warriorBattleParticipants.userId, user.id))
    .where(eq(warriorBattleParticipants.battleId, battleId));

  const teams = await db
    .select()
    .from(warriorBattleTeams)
    .where(eq(warriorBattleTeams.battleId, battleId));

  const answers = await db
    .select()
    .from(warriorBattleAnswers)
    .where(
      and(
        eq(warriorBattleAnswers.battleId, battleId),
        eq(warriorBattleAnswers.questionId, qRelation.questionId),
      ),
    );

  const participantResults: QuestionResultParticipant[] = participants.map((p) => {
    const ans = answers.find((a) => a.participantId === p.id);
    const team = teams.find((t) => t.id === p.teamId);
    return {
      participantId: p.id,
      userId: p.userId,
      name: p.name ?? "Peserta",
      teamNumber: team ? team.teamNumber : 1,
      isCorrect: ans ? ans.isCorrect : false,
      points: ans ? ans.points : 0,
      elapsedMs: ans ? ans.elapsedMs : null,
    };
  });

  const teamScores: Record<string, number> = {};
  for (const t of teams) {
    teamScores[`team${t.teamNumber}`] = t.score;
  }

  const revealDurationSeconds = 2.5; // Short, punchy reveal window
  const nextTransitionEndsAt = new Date(Date.now() + revealDurationSeconds * 1000).toISOString();

  const resultDto: QuestionResultDto = {
    questionId: qRelation.questionId,
    position,
    participants: participantResults,
    teamScores,
    nextTransitionEndsAt,
  };

  broadcastToBattle(battleId, { type: "battle:question_result", result: resultDto });

  // Transition to next round or finish battle
  const timer = setTimeout(async () => {
    try {
      if (position >= battle.questionCount) {
        await completeBattle(battleId);
      } else {
        await startQuestion(battleId, position + 1);
      }
    } catch (err) {
      console.error(`[WarriorEngine] Transition error after round ${position}:`, err);
    }
  }, revealDurationSeconds * 1000);

  setRoomTimer(battleId, timer);
}

export async function completeBattle(battleId: string) {
  clearRoomTimer(battleId);
  const db = getDb();
  const now = new Date();

  const teams = await db
    .select()
    .from(warriorBattleTeams)
    .where(eq(warriorBattleTeams.battleId, battleId))
    .orderBy(warriorBattleTeams.teamNumber);

  const team1 = teams.find((t) => t.teamNumber === 1);
  const team2 = teams.find((t) => t.teamNumber === 2);

  let winnerTeamNumber: number | null = null;
  if (team1 && team2) {
    if (team1.score > team2.score) {
      winnerTeamNumber = 1;
    } else if (team2.score > team1.score) {
      winnerTeamNumber = 2;
    }
  }

  await db
    .update(warriorBattles)
    .set({
      status: "completed",
      winnerTeamNumber,
      endedAt: now,
    })
    .where(eq(warriorBattles.id, battleId));

  const state = await getBattleState(battleId);
  const summary: BattleSummaryDto = {
    id: state.id,
    code: state.code,
    mode: state.mode,
    questionCount: state.questionCount,
    winnerTeamNumber,
    isDraw: winnerTeamNumber === null,
    teams: state.teams,
    participants: state.participants,
    startedAt: state.startedAt,
    endedAt: now.toISOString(),
    createdAt: state.serverNow,
  };

  broadcastToBattle(battleId, { type: "battle:completed", summary });
}
