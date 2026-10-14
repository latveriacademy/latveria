import { and, eq, inArray, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type {
  BattleActiveQuestion,
  BattleParticipantDto,
  BattleStateDto,
  BattleTeamDto,
  CreateBattleInput,
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

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createBattle(userId: string, input: CreateBattleInput) {
  const db = getDb();
  const code = generateRoomCode();

  return await db.transaction(async (tx) => {
    // 1. Create battle record
    const [battle] = await tx
      .insert(warriorBattles)
      .values({
        code,
        mode: input.mode,
        status: "waiting",
        questionCount: input.questionCount,
        timePerQuestionSeconds: input.timePerQuestionSeconds,
        topicId: input.topicId ?? null,
        createdBy: userId,
      })
      .returning();

    // 2. Create Team 1 and Team 2
    const [team1] = await tx
      .insert(warriorBattleTeams)
      .values({ battleId: battle.id, teamNumber: 1, score: 0 })
      .returning();
    await tx
      .insert(warriorBattleTeams)
      .values({ battleId: battle.id, teamNumber: 2, score: 0 })
      .returning();

    // 3. Creator joins Team 1
    const [participant] = await tx
      .insert(warriorBattleParticipants)
      .values({
        battleId: battle.id,
        teamId: team1.id,
        userId,
        isReady: false,
        status: "joined",
      })
      .returning();

    // 4. Select questions from questions bank
    const questionConditions = [eq(questions.questionType, "single_choice")];
    if (input.topicId) {
      questionConditions.push(eq(questions.topicId, input.topicId));
    }

    const availableQuestions = await tx
      .select({ id: questions.id })
      .from(questions)
      .where(and(...questionConditions))
      .orderBy(sql`RANDOM()`)
      .limit(input.questionCount);

    if (availableQuestions.length < input.questionCount) {
      // Fallback: pick any questions regardless of topic if not enough
      const fallbackQuestions = await tx
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.questionType, "single_choice"))
        .orderBy(sql`RANDOM()`)
        .limit(input.questionCount);

      if (fallbackQuestions.length < input.questionCount) {
        throw new HTTPException(400, {
          message: `Jumlah soal di bank soal tidak mencukupi (tersedia: ${fallbackQuestions.length}).`,
        });
      }
      for (let i = 0; i < fallbackQuestions.length; i++) {
        await tx.insert(warriorBattleQuestions).values({
          battleId: battle.id,
          questionId: fallbackQuestions[i].id,
          position: i + 1,
        });
      }
    } else {
      for (let i = 0; i < availableQuestions.length; i++) {
        await tx.insert(warriorBattleQuestions).values({
          battleId: battle.id,
          questionId: availableQuestions[i].id,
          position: i + 1,
        });
      }
    }

    return { battle, participant };
  });
}

export async function joinBattleByCode(userId: string, code: string) {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [battle] = await tx
      .select()
      .from(warriorBattles)
      .where(eq(warriorBattles.code, code))
      .for("update");

    if (!battle) {
      throw new HTTPException(404, { message: "Battle room tidak ditemukan." });
    }

    if (battle.status !== "waiting" && battle.status !== "ready") {
      throw new HTTPException(400, { message: "Battle sudah dimulai atau telah berakhir." });
    }

    // Check existing participant
    const existing = await tx
      .select()
      .from(warriorBattleParticipants)
      .where(
        and(
          eq(warriorBattleParticipants.battleId, battle.id),
          eq(warriorBattleParticipants.userId, userId),
        ),
      );

    if (existing.length > 0) {
      return { battle, participant: existing[0] };
    }

    const teams = await tx
      .select()
      .from(warriorBattleTeams)
      .where(eq(warriorBattleTeams.battleId, battle.id))
      .orderBy(warriorBattleTeams.teamNumber);

    const participants = await tx
      .select()
      .from(warriorBattleParticipants)
      .where(eq(warriorBattleParticipants.battleId, battle.id));

    const maxPlayers = battle.mode === "1v1" ? 2 : 4;
    if (participants.length >= maxPlayers) {
      throw new HTTPException(400, { message: "Slot battle room sudah penuh." });
    }

    // Team assignment:
    // 1v1: Player 1 -> Team 1, Player 2 -> Team 2
    // 2v2: balance players between Team 1 and Team 2 (max 2 per team)
    const team1 = teams.find((t) => t.teamNumber === 1)!;
    const team2 = teams.find((t) => t.teamNumber === 2)!;

    const team1Count = participants.filter((p) => p.teamId === team1.id).length;
    const team2Count = participants.filter((p) => p.teamId === team2.id).length;

    let targetTeam = team1;
    if (battle.mode === "1v1") {
      targetTeam = team1Count === 0 ? team1 : team2;
    } else {
      targetTeam = team1Count <= team2Count ? team1 : team2;
    }

    const [participant] = await tx
      .insert(warriorBattleParticipants)
      .values({
        battleId: battle.id,
        teamId: targetTeam.id,
        userId,
        isReady: false,
        status: "joined",
      })
      .returning();

    return { battle, participant };
  });
}

export async function getBattleState(
  battleId: string,
  forUserId?: string,
): Promise<BattleStateDto> {
  const db = getDb();
  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  if (!battle) {
    throw new HTTPException(404, { message: "Battle tidak ditemukan." });
  }

  const teams = await db
    .select()
    .from(warriorBattleTeams)
    .where(eq(warriorBattleTeams.battleId, battleId))
    .orderBy(warriorBattleTeams.teamNumber);

  const rawParticipants = await db
    .select({
      id: warriorBattleParticipants.id,
      userId: warriorBattleParticipants.userId,
      name: user.name,
      image: user.image,
      teamId: warriorBattleParticipants.teamId,
      isReady: warriorBattleParticipants.isReady,
      status: warriorBattleParticipants.status,
      score: warriorBattleParticipants.score,
      connectedAt: warriorBattleParticipants.connectedAt,
      disconnectedAt: warriorBattleParticipants.disconnectedAt,
    })
    .from(warriorBattleParticipants)
    .innerJoin(user, eq(warriorBattleParticipants.userId, user.id))
    .where(eq(warriorBattleParticipants.battleId, battleId));

  if (forUserId && !rawParticipants.some((participant) => participant.userId === forUserId))
    throw new HTTPException(403, { message: "Anda bukan peserta battle ini." });

  // Check which participants answered current question
  const currentAnswers =
    battle.currentQuestionIndex > 0
      ? await db
          .select()
          .from(warriorBattleAnswers)
          .where(
            and(
              eq(warriorBattleAnswers.battleId, battleId),
              inArray(
                warriorBattleAnswers.participantId,
                rawParticipants.map((p) => p.id),
              ),
            ),
          )
      : [];

  const participantsDto: BattleParticipantDto[] = rawParticipants.map((p) => {
    const team = teams.find((t) => t.id === p.teamId);
    const answersForP = currentAnswers.filter((a) => a.participantId === p.id);
    const lastAns = answersForP[answersForP.length - 1];

    return {
      id: p.id,
      userId: p.userId,
      name: p.name ?? "Peserta",
      image: p.image,
      teamId: p.teamId,
      teamNumber: team ? team.teamNumber : 1,
      isReady: p.isReady,
      status: p.status as BattleParticipantDto["status"],
      score: p.score,
      isLocked:
        answersForP.length >= battle.currentQuestionIndex && battle.currentQuestionIndex > 0,
      answeredAt: lastAns ? lastAns.submittedAt.toISOString() : null,
      lastAnswerCorrect: battle.status === "question_result" && lastAns ? lastAns.isCorrect : null,
      lastAnswerPoints: lastAns ? lastAns.points : 0,
      isConnected: !p.disconnectedAt,
    };
  });

  const teamsDto: BattleTeamDto[] = teams.map((t) => ({
    id: t.id,
    teamNumber: t.teamNumber,
    score: t.score,
  }));

  // Active question payload without answers/explanations
  let currentQuestion: BattleActiveQuestion | null = null;
  if (
    (battle.status === "active" || battle.status === "question_result") &&
    battle.currentQuestionIndex > 0
  ) {
    const [battleQ] = await db
      .select({
        questionId: warriorBattleQuestions.questionId,
        position: warriorBattleQuestions.position,
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
          eq(warriorBattleQuestions.position, battle.currentQuestionIndex),
        ),
      );

    if (battleQ) {
      currentQuestion = {
        id: battleQ.questionId,
        position: battleQ.position,
        prompt: battleQ.prompt,
        questionType: battleQ.questionType,
        options: battleQ.options,
        stimulus: battleQ.stimulus,
        passage: battleQ.passage,
        statements: battleQ.statements,
        startedAt: battle.questionStartedAt ? battle.questionStartedAt.toISOString() : "",
        deadlineAt: battle.questionDeadlineAt ? battle.questionDeadlineAt.toISOString() : "",
        durationSeconds: battle.timePerQuestionSeconds,
      };
    }
  }

  const myParticipant = rawParticipants.find((p) => p.userId === forUserId);

  return {
    id: battle.id,
    code: battle.code,
    mode: battle.mode as "1v1" | "2v2",
    status: battle.status as BattleStateDto["status"],
    questionCount: battle.questionCount,
    timePerQuestionSeconds: battle.timePerQuestionSeconds,
    currentQuestionIndex: battle.currentQuestionIndex,
    currentQuestion,
    questionStartedAt: battle.questionStartedAt ? battle.questionStartedAt.toISOString() : null,
    questionDeadlineAt: battle.questionDeadlineAt ? battle.questionDeadlineAt.toISOString() : null,
    teams: teamsDto,
    participants: participantsDto,
    myParticipantId: myParticipant ? myParticipant.id : null,
    myTeamId: myParticipant ? myParticipant.teamId : null,
    winnerTeamNumber: battle.winnerTeamNumber,
    startedAt: battle.startedAt ? battle.startedAt.toISOString() : null,
    endedAt: battle.endedAt ? battle.endedAt.toISOString() : null,
    createdBy: battle.createdBy,
    serverNow: new Date().toISOString(),
  };
}
