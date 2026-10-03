import { and, eq, inArray, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { calculateLatveriaScore, idSchema, utbkSubtests } from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  questionPackages,
  questions,
  systemConfig,
  topics,
  tryoutPackageQuestions,
  tryoutSessions,
} from "../lib/db/schema";
import { catalog, invalidateCatalogCache } from "./topic.service";

export async function startTryout(userId: string, packageId: string) {
  const pkgId = idSchema.safeParse(packageId);
  if (!pkgId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const officialSubtests = (await catalog(true)).filter((topic) =>
    utbkSubtests.some((subtest) => subtest.slug === topic.slug),
  );

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(
        and(
          eq(questionPackages.id, pkgId.data),
          eq(questionPackages.isActive, true),
          eq(questionPackages.published, true),
          or(
            eq(questionPackages.isFullTryout, true),
            eq(questionPackages.packageType, "Simulasi"),
            eq(questionPackages.packageType, "Simulasi Akbar"),
          ),
        ),
      );
    if (!pkg) throw new HTTPException(404, { message: "Tryout tidak tersedia." });

    const tryoutTopics = pkg.isFullTryout
      ? officialSubtests
      : officialSubtests.filter((topic) => topic.id === pkg.topicId);
    if (!tryoutTopics.length)
      throw new HTTPException(409, { message: "Tryout belum memiliki subtes aktif." });

    const [existingSession] = await tx
      .select()
      .from(tryoutSessions)
      .where(
        and(
          eq(tryoutSessions.userId, userId),
          eq(tryoutSessions.packageId, pkg.id),
          inArray(tryoutSessions.state, ["active", "break"]),
        ),
      );
    if (existingSession && existingSession.questionSets !== "{}")
      return { session: existingSession, status: 200 as const };

    const questionSets: Record<string, string[]> = {};
    const baseCount = Math.floor(pkg.targetQuestions / tryoutTopics.length);
    const extraCount = pkg.targetQuestions % tryoutTopics.length;
    for (const [topicIndex, topic] of tryoutTopics.entries()) {
      const targetPerSubtest = Math.max(1, baseCount + (topicIndex < extraCount ? 1 : 0));
      const tryoutQuestions = await tx
        .select({ id: questions.id })
        .from(tryoutPackageQuestions)
        .innerJoin(questions, eq(tryoutPackageQuestions.questionId, questions.id))
        .where(and(eq(tryoutPackageQuestions.packageId, pkg.id), eq(questions.topicId, topic.id)))
        .orderBy(tryoutPackageQuestions.order, questions.order, questions.id);
      let pool = tryoutQuestions;
      if (!pool.length)
        pool = await tx
          .select({ id: questions.id })
          .from(questions)
          .where(and(eq(questions.topicId, topic.id), eq(questions.category, pkg.category)))
          .orderBy(questions.order, questions.id);
      if (!pool.length)
        pool = await tx
          .select({ id: questions.id })
          .from(questions)
          .where(eq(questions.topicId, topic.id))
          .orderBy(questions.order, questions.id);
      for (let index = pool.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [pool[index], pool[swap]] = [pool[swap], pool[index]];
      }
      questionSets[topic.id] = pool.slice(0, targetPerSubtest).map((question) => question.id);
    }

    if (existingSession) {
      const [session] = await tx
        .update(tryoutSessions)
        .set({
          questionSets: JSON.stringify(questionSets),
          currentQuestionIndex: 0,
          subtestStartedAt: new Date(),
        })
        .where(eq(tryoutSessions.id, existingSession.id))
        .returning();
      return { session, status: 200 as const };
    }
    const [session] = await tx
      .insert(tryoutSessions)
      .values({
        userId,
        packageId: pkg.id,
        currentSubtestIndex: 0,
        state: "active",
        answers: "{}",
        flags: "{}",
        questionSets: JSON.stringify(questionSets),
        questionTimes: "{}",
        scoreBreakdown: "[]",
        currentQuestionIndex: 0,
        subtestStartedAt: new Date(),
      })
      .returning();
    return { session, status: 201 as const };
  });

  return { ...result.session, _status: result.status };
}

export async function getTryoutSession(userId: string, sessionId: string) {
  const sId = idSchema.safeParse(sessionId);
  if (!sId.success) throw new HTTPException(404, { message: "Sesi tryout tidak ditemukan." });

  const [session] = await getDb()
    .select()
    .from(tryoutSessions)
    .where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, userId)));
  if (!session) throw new HTTPException(404, { message: "Sesi tidak ditemukan." });

  const [pkg] = await getDb()
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, session.packageId));
  if (!pkg) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });

  const available = (await catalog(true)).filter((topic) =>
    utbkSubtests.some((subtest) => subtest.slug === topic.slug),
  );
  const subtests = pkg.isFullTryout
    ? available
    : available.filter((topic) => topic.id === pkg.topicId);
  const questionSets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;

  let state = session.state;
  let currentSubtestIndex = session.currentSubtestIndex;
  if (state === "break" && session.breakEndsAt && new Date() >= session.breakEndsAt) {
    state = "active";
    currentSubtestIndex = Math.min(subtests.length - 1, currentSubtestIndex + 1);
    await getDb()
      .update(tryoutSessions)
      .set({
        state: "active",
        currentSubtestIndex,
        breakEndsAt: null,
        currentQuestionIndex: 0,
        subtestStartedAt: new Date(),
      })
      .where(
        and(
          eq(tryoutSessions.id, session.id),
          eq(tryoutSessions.userId, userId),
          eq(tryoutSessions.state, "break"),
        ),
      );
  }

  const currentSubtest = subtests[currentSubtestIndex] || subtests[0];
  if (!currentSubtest) throw new HTTPException(409, { message: "Subtes tryout tidak tersedia." });
  const selectedQuestionIds = questionSets[currentSubtest.id] ?? [];
  const qList = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      options: questions.options,
      itemWeight: questions.itemWeight,
      calculatorAllowed: questions.calculatorAllowed,
    })
    .from(questions)
    .where(
      selectedQuestionIds.length
        ? and(eq(questions.topicId, currentSubtest.id), inArray(questions.id, selectedQuestionIds))
        : sql`false`,
    )
    .orderBy(questions.order, questions.id);

  const score =
    session.state === "completed"
      ? (() => {
          const items = JSON.parse(session.scoreBreakdown || "[]") as ReturnType<
            typeof calculateLatveriaScore
          >["itemBreakdowns"];
          return calculateLatveriaScore(
            items.map((item) => ({
              questionId: item.questionId,
              isCorrect: item.isCorrect,
              itemWeight: item.itemWeight,
              timeSpentSeconds: item.timeSpentSeconds,
            })),
          );
        })()
      : null;

  const currentSubtestDuration = pkg.isFullTryout
    ? ([30, 15, 25, 20, 45, 30, 30][currentSubtestIndex] ?? 30)
    : pkg.duration;
  const elapsed = Math.max(0, Math.floor((Date.now() - session.subtestStartedAt.getTime()) / 1000));
  const activeTimeRemaining = Math.max(0, currentSubtestDuration * 60 - elapsed);

  return {
    session: {
      ...session,
      state,
      currentSubtestIndex,
      breakEndsAt: session.breakEndsAt?.toISOString() ?? null,
      answers: JSON.parse(session.answers || "{}"),
      flags: JSON.parse(session.flags || "{}"),
      questionTimes: JSON.parse(session.questionTimes || "{}"),
      totalScore: session.totalScore,
      completedAt: session.completedAt?.toISOString() ?? null,
      secondsRemaining:
        session.state === "break" && session.breakEndsAt
          ? Math.max(0, Math.ceil((session.breakEndsAt.getTime() - Date.now()) / 1000))
          : activeTimeRemaining,
    },
    package: pkg,
    currentSubtest,
    totalSubtests: subtests.length,
    questions: qList,
    score,
  };
}

export async function autosaveTryout(userId: string, sessionId: string, body: unknown) {
  const sId = idSchema.safeParse(sessionId);
  if (!sId.success) throw new HTTPException(404);
  const b = body as {
    answers?: unknown;
    flags?: unknown;
    questionTimes?: unknown;
    currentQuestionIndex?: unknown;
  };
  if (
    !b ||
    typeof b.answers !== "object" ||
    Array.isArray(b.answers) ||
    typeof b.flags !== "object" ||
    Array.isArray(b.flags) ||
    typeof b.questionTimes !== "object" ||
    Array.isArray(b.questionTimes) ||
    !Number.isInteger(b.currentQuestionIndex) ||
    (b.currentQuestionIndex as number) < 0
  )
    throw new HTTPException(400, { message: "Data simpan tryout tidak valid." });

  const [session] = await getDb()
    .select()
    .from(tryoutSessions)
    .where(
      and(
        eq(tryoutSessions.id, sId.data),
        eq(tryoutSessions.userId, userId),
        eq(tryoutSessions.state, "active"),
      ),
    );
  if (!session) throw new HTTPException(404, { message: "Sesi tryout aktif tidak ditemukan." });

  const [packageInfo] = await getDb()
    .select({ topicId: questionPackages.topicId, isFullTryout: questionPackages.isFullTryout })
    .from(questionPackages)
    .where(eq(questionPackages.id, session.packageId));
  if (!packageInfo) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });

  const questionSets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;
  const availableSubtests = (await catalog(true)).filter((topic) =>
    utbkSubtests.some((subtest) => subtest.slug === topic.slug),
  );
  const activeSubtest = (
    packageInfo.isFullTryout
      ? availableSubtests
      : availableSubtests.filter((topic) => topic.id === packageInfo.topicId)
  )[session.currentSubtestIndex];
  const allowed = new Set(activeSubtest ? (questionSets[activeSubtest.id] ?? []) : []);

  const answers = b.answers as Record<string, unknown>;
  const flags = b.flags as Record<string, unknown>;
  const times = b.questionTimes as Record<string, unknown>;
  const previouslyAllowed = new Set(
    Object.entries(questionSets)
      .slice(0, session.currentSubtestIndex + 1)
      .flatMap(([, ids]) => ids),
  );

  if (
    Object.entries(answers).some(
      ([id, value]) =>
        !previouslyAllowed.has(id) ||
        !Number.isInteger(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 3,
    ) ||
    Object.entries(flags).some(
      ([id, value]) => !previouslyAllowed.has(id) || typeof value !== "boolean",
    ) ||
    Object.entries(times).some(
      ([id, value]) =>
        !previouslyAllowed.has(id) ||
        !Number.isInteger(value) ||
        Number(value) < 0 ||
        Number(value) > 3600,
    ) ||
    (b.currentQuestionIndex as number) >= Math.max(1, allowed.size)
  )
    throw new HTTPException(400, {
      message: "Jawaban atau posisi soal tidak sesuai dengan sesi tryout.",
    });

  const updated = await getDb()
    .update(tryoutSessions)
    .set({
      answers: JSON.stringify(answers),
      flags: JSON.stringify(flags),
      questionTimes: JSON.stringify(times),
      currentQuestionIndex: b.currentQuestionIndex as number,
    })
    .where(
      and(
        eq(tryoutSessions.id, sId.data),
        eq(tryoutSessions.userId, userId),
        eq(tryoutSessions.state, "active"),
      ),
    )
    .returning({ id: tryoutSessions.id });
  if (!updated.length)
    throw new HTTPException(409, { message: "Sesi berubah. Muat ulang tryout." });

  return { saved: true };
}

export async function submitTryoutSubtest(userId: string, sessionId: string, body: unknown) {
  const sId = idSchema.safeParse(sessionId);
  if (!sId.success) throw new HTTPException(404);
  const b = body as { answers?: unknown; timeSpentByQuestion?: unknown };
  if (
    !b ||
    typeof b.answers !== "object" ||
    Array.isArray(b.answers) ||
    typeof b.timeSpentByQuestion !== "object" ||
    Array.isArray(b.timeSpentByQuestion)
  )
    throw new HTTPException(400, { message: "Jawaban tryout tidak valid." });

  return await getDb().transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(tryoutSessions)
      .where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, userId)))
      .for("update");
    if (!session || session.state !== "active")
      throw new HTTPException(409, {
        message: "Subtes ini sudah dikumpulkan atau sesi tidak aktif.",
      });

    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, session.packageId));
    if (!pkg) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });

    const all = (await catalog(true)).filter((topic) =>
      utbkSubtests.some((subtest) => subtest.slug === topic.slug),
    );
    const subtests = pkg.isFullTryout ? all : all.filter((topic) => topic.id === pkg.topicId);
    const current = subtests[session.currentSubtestIndex];
    if (!current) throw new HTTPException(409, { message: "Urutan subtes tryout tidak valid." });

    const sets = JSON.parse(session.questionSets || "{}") as Record<string, string[]>;
    const ids = sets[current.id] ?? [];
    const bodyAnswers = b.answers as Record<string, unknown>;
    const times = b.timeSpentByQuestion as Record<string, unknown>;
    const savedAnswers = JSON.parse(session.answers || "{}") as Record<string, string>;
    const previouslySubmittedIds = new Set(
      Object.entries(sets)
        .slice(0, session.currentSubtestIndex + 1)
        .flatMap(([, questionIds]) => questionIds),
    );
    const currentAnswers = Object.fromEntries(
      ids.filter((id) => Object.hasOwn(bodyAnswers, id)).map((id) => [id, bodyAnswers[id]]),
    );
    const allAnswers = { ...savedAnswers, ...currentAnswers };

    if (
      Object.keys(currentAnswers).length !== ids.length ||
      ids.some(
        (id) =>
          !Number.isInteger(Number(currentAnswers[id])) ||
          Number(currentAnswers[id]) < 0 ||
          Number(currentAnswers[id]) > 3,
      ) ||
      Object.keys(bodyAnswers).some((id) => !previouslySubmittedIds.has(id)) ||
      Object.entries(times).some(
        ([id, value]) =>
          !previouslySubmittedIds.has(id) ||
          !Number.isInteger(value) ||
          Number(value) < 0 ||
          Number(value) > 3600,
      )
    )
      throw new HTTPException(400, {
        message: "Jawab semua soal subtes ini sebelum mengumpulkan.",
      });

    const questionRows = ids.length
      ? await tx
          .select({
            id: questions.id,
            correctAnswer: questions.correctAnswer,
            itemWeight: questions.itemWeight,
          })
          .from(questions)
          .where(and(eq(questions.topicId, current.id), inArray(questions.id, ids)))
      : [];
    if (questionRows.length !== ids.length)
      throw new HTTPException(409, { message: "Soal tryout berubah. Muat ulang sesi." });

    const result = calculateLatveriaScore(
      questionRows.map((question) => ({
        questionId: question.id,
        isCorrect: Number(currentAnswers[question.id]) === question.correctAnswer,
        itemWeight: question.itemWeight,
        timeSpentSeconds: Number.isInteger(times[question.id]) ? Number(times[question.id]) : 60,
      })),
    );

    const prior = JSON.parse(session.scoreBreakdown || "[]") as ReturnType<
      typeof calculateLatveriaScore
    >["itemBreakdowns"];
    const scoreBreakdown = [...prior, ...result.itemBreakdowns];
    const aggregate = calculateLatveriaScore(
      scoreBreakdown.map((item) => ({
        questionId: item.questionId,
        isCorrect: item.isCorrect,
        itemWeight: item.itemWeight,
        timeSpentSeconds: item.timeSpentSeconds,
      })),
    );

    const isLast = session.currentSubtestIndex >= subtests.length - 1;
    if (isLast) {
      await tx
        .update(tryoutSessions)
        .set({
          state: "completed",
          completedAt: new Date(),
          answers: JSON.stringify(allAnswers),
          scoreBreakdown: JSON.stringify(scoreBreakdown),
          totalScore: aggregate.score,
        })
        .where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.state, "active")));
      return { status: "completed" as const, score: aggregate };
    }

    const [cfg] = await tx
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, "break_duration_minutes"));
    const breakMinutes = Math.max(0, Number(cfg?.value || 15));
    const breakEndsAt = new Date(Date.now() + breakMinutes * 60 * 1000);
    await tx
      .update(tryoutSessions)
      .set({
        state: "break",
        breakEndsAt,
        answers: JSON.stringify(allAnswers),
        scoreBreakdown: JSON.stringify(scoreBreakdown),
        totalScore: aggregate.score,
      })
      .where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.state, "active")));

    return {
      status: "break" as const,
      breakEndsAt: breakEndsAt.toISOString(),
      breakMinutes,
      nextSubtestIndex: session.currentSubtestIndex + 1,
    };
  });
}

export async function createAdminTryout(body: unknown) {
  const b = body as {
    name?: string;
    topicId?: string;
    isFullTryout?: boolean;
    targetQuestions?: number;
    questions?: unknown[];
    description?: string;
    category?: string;
    duration?: number;
    published?: boolean;
    order?: number;
  };
  if (!b || !b.name || !b.topicId) {
    throw new HTTPException(400, { message: "Nama tryout dan subtes wajib diisi." });
  }

  const [topic] = await getDb().select().from(topics).where(eq(topics.id, b.topicId));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

  const isFullTryout = Boolean(b.isFullTryout);
  const targetQuestions = Number(b.targetQuestions || (isFullTryout ? 160 : 30));

  const questionsList = Array.isArray(b.questions) ? b.questions : [];
  if (isFullTryout && questionsList.length > 0 && questionsList.length !== targetQuestions) {
    throw new HTTPException(400, {
      message: `Full Tryout memerlukan tepat ${targetQuestions} soal (saat ini ${questionsList.length} soal).`,
    });
  }

  const [pkg] = await getDb()
    .insert(questionPackages)
    .values({
      topicId: topic.id,
      name: b.name,
      description: b.description ?? "Tryout Standar SNPMB / Ujian Mandiri",
      packageType: "Tryout",
      category: b.category || "utbk",
      duration: Number(b.duration || (isFullTryout ? 195 : 30)),
      isFullTryout,
      targetQuestions,
      published: b.published !== false,
      order: Number(b.order || 1),
      isActive: true,
    })
    .returning();

  if (questionsList.length > 0) {
    type QuestionInput = {
      prompt: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      source?: string;
      category?: string;
      itemWeight?: number;
      calculatorAllowed?: boolean;
      order?: number;
      subtestOrder?: number;
    };
    await getDb()
      .insert(questions)
      .values(
        (questionsList as QuestionInput[]).map((q, idx: number) => ({
          topicId: topic.id,
          packageId: pkg.id,
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "Pembahasan terstandar.",
          source: q.source || "Tryout Latveria",
          category: q.category || topic.name,
          itemWeight: q.itemWeight ?? 100,
          calculatorAllowed: Boolean(q.calculatorAllowed),
          order: q.order ?? idx + 1,
          subtestOrder: q.subtestOrder ?? 1,
        })),
      );
  }

  invalidateCatalogCache();
  return {
    ...pkg,
    questionCount: questionsList.length,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}
