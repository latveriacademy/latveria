import { and, eq, inArray, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { calculateLatveriaScore, idSchema, utbkSubtests } from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  questionPackages,
  questions,
  tryoutPackageQuestions,
  tryoutSections,
  tryoutSessions,
} from "../lib/db/schema";
import { catalog } from "./topic.service";
import { getCompletedTryoutQuestions, resolvePassages } from "./tryout-review.service";

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
            eq(questionPackages.packageType, "Tryout"),
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
          inArray(tryoutSessions.state, ["active", "section_ready", "break"]),
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
        .orderBy(tryoutPackageQuestions.position, tryoutPackageQuestions.order, questions.id);
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

  const state = session.state;
  const currentSubtestIndex = session.currentSubtestIndex;
  const currentSubtest = subtests[currentSubtestIndex] || subtests[0];
  if (!currentSubtest) throw new HTTPException(409, { message: "Subtes tryout tidak tersedia." });

  // Check if tryout has custom section configured for this subtest to get accurate duration
  const [sectionConfig] = await getDb()
    .select()
    .from(tryoutSections)
    .where(
      and(
        eq(tryoutSections.packageId, pkg.id),
        eq(
          tryoutSections.subtestCode,
          utbkSubtests.find((s) => s.slug === currentSubtest.slug)?.short || "",
        ),
      ),
    );

  const selectedQuestionIds = questionSets[currentSubtest.id] ?? [];
  const qList = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      questionType: questions.questionType,
      stimulus: questions.stimulus,
      passage: questions.passage,
      passageId: questions.passageId,
      statements: questions.statements,
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

  const resolvedQuestions = await resolvePassages(qList);

  // Sanitize: hide correct answers from statements during active session
  const sanitizedQuestions = resolvedQuestions.map((q) => ({
    ...q,
    statements:
      state !== "completed" && Array.isArray(q.statements)
        ? q.statements.map((s) => ({ id: s.id, text: s.text }))
        : q.statements,
  }));

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
              scoreFraction: item.scoreFraction,
              itemWeight: item.itemWeight,
              timeSpentSeconds: item.timeSpentSeconds,
            })),
          );
        })()
      : null;

  const currentSubtestDurationSeconds = sectionConfig?.durationSeconds
    ? sectionConfig.durationSeconds
    : pkg.isFullTryout
      ? ([30, 15, 25, 20, 45, 30, 30][currentSubtestIndex] ?? 30) * 60
      : pkg.duration * 60;

  const elapsed = Math.max(0, Math.floor((Date.now() - session.subtestStartedAt.getTime()) / 1000));
  const activeTimeRemaining =
    session.state === "section_ready"
      ? currentSubtestDurationSeconds
      : Math.max(0, currentSubtestDurationSeconds - elapsed);

  return {
    session: {
      ...session,
      state,
      currentSubtestIndex,
      breakEndsAt: null,
      answers: JSON.parse(session.answers || "{}"),
      flags: JSON.parse(session.flags || "{}"),
      questionTimes: JSON.parse(session.questionTimes || "{}"),
      totalScore: session.totalScore,
      completedAt: session.completedAt?.toISOString() ?? null,
      secondsRemaining: activeTimeRemaining,
    },
    package: pkg,
    currentSubtest,
    totalSubtests: subtests.length,
    questions: sanitizedQuestions,
    score,
    ...(state === "completed"
      ? { reviewQuestions: await getCompletedTryoutQuestions(session.questionSets) }
      : {}),
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

  const isValidAnswers = Object.entries(answers).every(([id, value]) => {
    if (!previouslyAllowed.has(id)) return false;
    if (typeof value === "number" || typeof value === "string") return true;
    if (typeof value === "object" && value !== null) {
      return Object.values(value).every((v) => typeof v === "boolean");
    }
    return false;
  });

  if (
    !isValidAnswers ||
    Object.entries(flags).some(
      ([id, value]) => !previouslyAllowed.has(id) || typeof value !== "boolean",
    ) ||
    Object.entries(times).some(
      ([id, value]) =>
        !previouslyAllowed.has(id) ||
        !Number.isInteger(value) ||
        Number(value) < 0 ||
        Number(value) > 7200,
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
    const savedAnswers = JSON.parse(session.answers || "{}") as Record<string, unknown>;
    const currentAnswers = Object.fromEntries(
      ids.filter((id) => Object.hasOwn(bodyAnswers, id)).map((id) => [id, bodyAnswers[id]]),
    );
    const allAnswers = { ...savedAnswers, ...currentAnswers };

    const questionRows = ids.length
      ? await tx
          .select({
            id: questions.id,
            questionType: questions.questionType,
            correctAnswer: questions.correctAnswer,
            statements: questions.statements,
            scoringConfig: questions.scoringConfig,
            itemWeight: questions.itemWeight,
          })
          .from(questions)
          .where(and(eq(questions.topicId, current.id), inArray(questions.id, ids)))
      : [];
    if (questionRows.length !== ids.length)
      throw new HTTPException(409, { message: "Soal tryout berubah. Muat ulang sesi." });

    const result = calculateLatveriaScore(
      questionRows.map((question) => {
        const hasAnswer = Object.hasOwn(currentAnswers, question.id);
        let isCorrect = false;
        let scoreFraction = 0;

        if (hasAnswer) {
          if (question.questionType === "true_false_group" && Array.isArray(question.statements)) {
            const userStmtAnswers = (currentAnswers[question.id] || {}) as Record<string, boolean>;
            const stmts = question.statements;
            const correctCount = stmts.filter(
              (s) => userStmtAnswers[s.id] === Boolean(s.answer),
            ).length;
            const totalCount = stmts.length || 1;
            const mode = question.scoringConfig?.mode || "per_statement";

            if (mode === "all_or_nothing") {
              const allCorrect = correctCount === totalCount;
              isCorrect = allCorrect;
              scoreFraction = allCorrect ? 1.0 : 0.0;
            } else {
              scoreFraction = correctCount / totalCount;
              isCorrect = scoreFraction === 1.0;
            }
          } else {
            isCorrect = Number(currentAnswers[question.id]) === question.correctAnswer;
            scoreFraction = isCorrect ? 1.0 : 0.0;
          }
        }

        return {
          questionId: question.id,
          isCorrect,
          scoreFraction,
          itemWeight: question.itemWeight,
          timeSpentSeconds: Number.isInteger(times[question.id]) ? Number(times[question.id]) : 60,
        };
      }),
    );

    const prior = JSON.parse(session.scoreBreakdown || "[]") as ReturnType<
      typeof calculateLatveriaScore
    >["itemBreakdowns"];
    const scoreBreakdown = [...prior, ...result.itemBreakdowns];
    const aggregate = calculateLatveriaScore(
      scoreBreakdown.map((item) => ({
        questionId: item.questionId,
        isCorrect: item.isCorrect,
        scoreFraction: item.scoreFraction,
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

    // No mandatory 15-minute break: section completes and next is ready to start now or later
    const nextSubtestIndex = session.currentSubtestIndex + 1;
    await tx
      .update(tryoutSessions)
      .set({
        state: "section_ready",
        currentSubtestIndex: nextSubtestIndex,
        breakEndsAt: null,
        answers: JSON.stringify(allAnswers),
        scoreBreakdown: JSON.stringify(scoreBreakdown),
        totalScore: aggregate.score,
        currentQuestionIndex: 0,
      })
      .where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.state, "active")));

    return {
      status: "section_ready" as const,
      nextSubtestIndex,
      score: aggregate,
    };
  });
}

export async function advanceTryoutSubtest(userId: string, sessionId: string) {
  const sId = idSchema.safeParse(sessionId);
  if (!sId.success) throw new HTTPException(404, { message: "Sesi tidak ditemukan." });

  const [session] = await getDb()
    .select()
    .from(tryoutSessions)
    .where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, userId)));
  if (!session) throw new HTTPException(404, { message: "Sesi tidak ditemukan." });

  if (session.state === "completed") {
    return { status: "completed" as const, session };
  }

  // Transitions section_ready or break to active with fresh subtest timer
  if (session.state === "section_ready" || session.state === "break") {
    const [updated] = await getDb()
      .update(tryoutSessions)
      .set({
        state: "active",
        breakEndsAt: null,
        currentQuestionIndex: 0,
        subtestStartedAt: new Date(),
      })
      .where(
        and(
          eq(tryoutSessions.id, session.id),
          eq(tryoutSessions.userId, userId),
          or(eq(tryoutSessions.state, "section_ready"), eq(tryoutSessions.state, "break")),
        ),
      )
      .returning();
    return { status: "active" as const, session: updated ?? session };
  }

  return { status: session.state as "active" | "section_ready" | "completed", session };
}
