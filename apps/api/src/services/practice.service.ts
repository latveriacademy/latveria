import { and, desc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  calculateLatveriaScore,
  idSchema,
  learnerSummary,
  practiceXP,
  submissionSchema,
  type HistoryItem,
  type Result,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import { resolvePassages } from "./tryout/tryout-review.service";
import {
  practiceAnswers,
  practiceAttempts,
  questionPackages,
  questions,
  topics,
} from "../lib/db/schema";

export async function getLearnerSummary(userId: string) {
  const attempts = await getDb()
    .select({
      topicId: practiceAttempts.topicId,
      correctCount: practiceAttempts.correctCount,
      totalCount: practiceAttempts.totalCount,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, userId));
  return learnerSummary(attempts);
}

export async function getLearnerHistory(userId: string): Promise<HistoryItem[]> {
  const rows = await getDb()
    .select({
      id: practiceAttempts.id,
      topic: topics.name,
      slug: topics.slug,
      packageId: practiceAttempts.packageId,
      packageName: questionPackages.name,
      correct: practiceAttempts.correctCount,
      total: practiceAttempts.totalCount,
      score: practiceAttempts.score,
      rawScore: practiceAttempts.rawScore,
      timeSpentSeconds: practiceAttempts.timeSpentSeconds,
      scoreBreakdown: practiceAttempts.scoreBreakdown,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .leftJoin(questionPackages, eq(practiceAttempts.packageId, questionPackages.id))
    .where(eq(practiceAttempts.userId, userId))
    .orderBy(desc(practiceAttempts.submittedAt));

  return rows.map((row) => ({
    ...row,
    submittedAt: row.submittedAt.toISOString(),
    earnedXP: practiceXP(row.correct),
    scoreBreakdown: row.scoreBreakdown ? JSON.parse(row.scoreBreakdown) : null,
  }));
}

export async function getPracticeQuestions(slug: string, packageId?: string) {
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, slug));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

  if (packageId) {
    const pkgId = idSchema.safeParse(packageId);
    if (!pkgId.success) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

    const [pkg] = await getDb()
      .select()
      .from(questionPackages)
      .where(
        and(
          eq(questionPackages.id, pkgId.data),
          eq(questionPackages.topicId, topic.id),
          eq(questionPackages.isActive, true),
          eq(questionPackages.published, true),
        ),
      );
    if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

    const items = await getDb()
      .select({
        id: questions.id,
        prompt: questions.prompt,
        passage: questions.passage,
        passageId: questions.passageId,
        options: questions.options,
        annotations: questions.annotations,
      })
      .from(questions)
      .where(and(eq(questions.topicId, topic.id), eq(questions.packageId, pkg.id)))
      .orderBy(questions.id);

    return {
      topic,
      packageId: pkg.id,
      packageName: pkg.name,
      package: { id: pkg.id, name: pkg.name, description: pkg.description },
      items: await resolvePassages(items),
    };
  }

  // Backward compatibility: seleksi tanpa packageId
  const items = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      passage: questions.passage,
      passageId: questions.passageId,
      options: questions.options,
      annotations: questions.annotations,
    })
    .from(questions)
    .where(eq(questions.topicId, topic.id))
    .orderBy(questions.id);
  return { topic, items: await resolvePassages(items) };
}

export async function submitPractice(
  userId: string,
  slug: string,
  rawPackageParam: string | undefined,
  body: unknown,
) {
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Jawaban tidak valid." });
  const submission = parsed.data;

  const targetPackageId =
    rawPackageParam && idSchema.safeParse(rawPackageParam).success
      ? rawPackageParam
      : (submission.packageId ?? undefined);

  return await getDb().transaction(async (tx) => {
    const [topic] = await tx.select().from(topics).where(eq(topics.slug, slug));
    if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

    async function replay() {
      const [saved] = await tx
        .select()
        .from(practiceAttempts)
        .where(
          and(
            eq(practiceAttempts.id, submission.submissionId!),
            eq(practiceAttempts.userId, userId),
          ),
        );
      if (!saved) return null;
      const answers = await tx
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.attemptId, saved.id));
      if (
        saved.topicId !== topic.id ||
        saved.packageId !== (targetPackageId ?? null) ||
        answers.length !== Object.keys(submission.answers).length ||
        !answers.every((answer) => submission.answers[answer.questionId] === answer.selectedAnswer)
      ) {
        throw new HTTPException(409, {
          message: "Jawaban berbeda dari pengumpulan yang sudah tersimpan. Mulai latihan baru.",
        });
      }
      return {
        id: saved.id,
        packageId: saved.packageId,
        earnedXP: practiceXP(saved.correctCount),
        score: saved.score,
        rawScore: saved.rawScore,
        scoreBreakdown: saved.scoreBreakdown ? JSON.parse(saved.scoreBreakdown) : null,
      };
    }

    if (submission.submissionId) {
      const saved = await replay();
      if (saved) return saved;
    }

    let validatedPackageId: string | null = null;
    if (targetPackageId) {
      const [pkg] = await tx
        .select()
        .from(questionPackages)
        .where(
          and(eq(questionPackages.id, targetPackageId), eq(questionPackages.topicId, topic.id)),
        );
      if (!pkg) throw new HTTPException(400, { message: "Paket tidak valid untuk subtes ini." });
      validatedPackageId = pkg.id;
    }

    const ids = Object.keys(submission.answers);
    if (!ids.length) throw new HTTPException(400, { message: "Jawab soal sebelum dikumpulkan." });

    const whereClause = validatedPackageId
      ? and(
          eq(questions.topicId, topic.id),
          eq(questions.packageId, validatedPackageId),
          inArray(questions.id, ids),
        )
      : and(eq(questions.topicId, topic.id), inArray(questions.id, ids));

    const rows = await tx
      .select({
        id: questions.id,
        answer: questions.correctAnswer,
        itemWeight: questions.itemWeight,
      })
      .from(questions)
      .where(whereClause);
    if (rows.length !== ids.length)
      throw new HTTPException(400, {
        message: "Soal tidak valid untuk subtes/paket ini. Muat ulang latihan.",
      });

    const scoreResult = calculateLatveriaScore(
      rows.map((row) => ({
        questionId: row.id,
        isCorrect: row.answer === submission.answers[row.id],
        timeSpentSeconds:
          submission.questionTimes?.[row.id] ??
          (submission.timeSpentSeconds
            ? Math.round(submission.timeSpentSeconds / rows.length)
            : 60),
        itemWeight: row.itemWeight ?? 100,
      })),
    );

    const correctCount = rows.filter((row) => row.answer === submission.answers[row.id]).length;

    const [attempt] = await tx
      .insert(practiceAttempts)
      .values({
        id: submission.submissionId,
        userId,
        topicId: topic.id,
        packageId: validatedPackageId,
        totalCount: rows.length,
        correctCount,
        score: scoreResult.score,
        rawScore: scoreResult.rawScore,
        timeSpentSeconds:
          submission.timeSpentSeconds ?? Math.round(scoreResult.averageTime * rows.length),
        scoreBreakdown: JSON.stringify(scoreResult),
      })
      .onConflictDoNothing({ target: practiceAttempts.id })
      .returning({ id: practiceAttempts.id });

    if (!attempt) {
      const saved = submission.submissionId ? await replay() : null;
      if (saved) return saved;
      throw new HTTPException(409, {
        message: "ID pengumpulan sudah digunakan. Mulai latihan baru.",
      });
    }

    const breakdownMap = new Map(scoreResult.itemBreakdowns.map((b) => [b.questionId, b]));
    await tx.insert(practiceAnswers).values(
      rows.map((row) => {
        const b = breakdownMap.get(row.id);
        return {
          attemptId: attempt.id,
          questionId: row.id,
          selectedAnswer: submission.answers[row.id],
          isCorrect: row.answer === submission.answers[row.id] ? 1 : 0,
          timeSpentSeconds: b?.timeSpentSeconds ?? null,
          itemWeight: b?.itemWeight ?? null,
          timeFactor: b ? Math.round(b.timeFactor * 100) : null,
          itemScore: b?.itemScore ?? null,
          isFirstAttempt: true,
          submittedAt: new Date(),
        };
      }),
    );

    return {
      id: attempt.id,
      packageId: validatedPackageId ?? null,
      earnedXP: practiceXP(correctCount),
      score: scoreResult.score,
      rawScore: scoreResult.rawScore,
      scoreBreakdown: scoreResult,
    };
  });
}

export async function getResultDetail(userId: string, idParam: string): Promise<Result> {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404);

  const [attempt] = await getDb()
    .select({
      id: practiceAttempts.id,
      topic: topics.name,
      slug: topics.slug,
      packageId: practiceAttempts.packageId,
      packageName: questionPackages.name,
      correct: practiceAttempts.correctCount,
      total: practiceAttempts.totalCount,
      score: practiceAttempts.score,
      rawScore: practiceAttempts.rawScore,
      timeSpentSeconds: practiceAttempts.timeSpentSeconds,
      scoreBreakdown: practiceAttempts.scoreBreakdown,
      submittedAt: practiceAttempts.submittedAt,
    })
    .from(practiceAttempts)
    .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
    .leftJoin(questionPackages, eq(practiceAttempts.packageId, questionPackages.id))
    .where(and(eq(practiceAttempts.id, id.data), eq(practiceAttempts.userId, userId)));
  if (!attempt) throw new HTTPException(404, { message: "Hasil tidak ditemukan." });

  const answers = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      passage: questions.passage,
      passageId: questions.passageId,
      annotations: questions.annotations,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      selectedAnswer: practiceAnswers.selectedAnswer,
      isCorrect: practiceAnswers.isCorrect,
    })
    .from(practiceAnswers)
    .innerJoin(questions, eq(practiceAnswers.questionId, questions.id))
    .where(eq(practiceAnswers.attemptId, attempt.id))
    .orderBy(questions.id);

  return {
    attempt: {
      ...attempt,
      submittedAt: attempt.submittedAt.toISOString(),
      earnedXP: practiceXP(attempt.correct),
      scoreBreakdown: attempt.scoreBreakdown ? JSON.parse(attempt.scoreBreakdown) : null,
    },
    answers: await resolvePassages(answers),
  };
}
