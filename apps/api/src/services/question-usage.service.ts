import { count, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { QuestionUsageMap } from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  questions,
  questionPackages,
  practiceAnswers,
  questionReports,
  questionRevisions,
  tryoutPackageQuestions,
  tryoutResponses,
  tryoutSections,
  tryoutSessions,
} from "../lib/db/schema";
import { invalidateCatalogCache } from "./topic.service";

export async function getQuestionUsageMap(questionId: string): Promise<QuestionUsageMap> {
  const db = getDb();
  const [q] = await db
    .select({
      id: questions.id,
      packageId: questions.packageId,
    })
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });

  const [
    packageRows,
    tryoutPkgRows,
    [practiceCount],
    [tryoutRespCount],
    [reportsCountRes],
    [revisionsCountRes],
    activeSessions,
  ] = await Promise.all([
    q.packageId
      ? db
          .select({ id: questionPackages.id, name: questionPackages.name })
          .from(questionPackages)
          .where(eq(questionPackages.id, q.packageId))
      : Promise.resolve([]),
    db
      .select({
        tryoutId: questionPackages.id,
        tryoutName: questionPackages.name,
        sectionCode: tryoutSections.subtestCode,
      })
      .from(tryoutPackageQuestions)
      .innerJoin(questionPackages, eq(tryoutPackageQuestions.packageId, questionPackages.id))
      .leftJoin(tryoutSections, eq(tryoutPackageQuestions.sectionId, tryoutSections.id))
      .where(eq(tryoutPackageQuestions.questionId, questionId)),
    db
      .select({ value: count() })
      .from(practiceAnswers)
      .where(eq(practiceAnswers.questionId, questionId)),
    db
      .select({ value: count() })
      .from(tryoutResponses)
      .where(eq(tryoutResponses.questionId, questionId)),
    db
      .select({ value: count() })
      .from(questionReports)
      .where(eq(questionReports.questionId, questionId)),
    db
      .select({ value: count() })
      .from(questionRevisions)
      .where(eq(questionRevisions.questionId, questionId)),
    db
      .select({ id: tryoutSessions.id })
      .from(tryoutSessions)
      .where(eq(tryoutSessions.state, "active"))
      .limit(50),
  ]);

  const activeSessionsCount = activeSessions.length;
  const practiceAttemptsCount = Number(practiceCount?.value ?? 0);
  const tryoutResponsesCount = Number(tryoutRespCount?.value ?? 0);
  const reportsCount = Number(reportsCountRes?.value ?? 0);
  const revisionsCount = Number(revisionsCountRes?.value ?? 0);

  const isHistorical = practiceAttemptsCount > 0 || tryoutResponsesCount > 0;
  const canDeletePermanently = !isHistorical && activeSessionsCount === 0;

  let cannotDeleteReason: string | undefined;
  if (isHistorical) {
    cannotDeleteReason = `Soal memiliki ${practiceAttemptsCount + tryoutResponsesCount} riwayat jawaban peserta. Penghapusan permanen akan merusak rekam jejak. Silakan gunakan opsi 'Arsipkan'.`;
  } else if (activeSessionsCount > 0) {
    cannotDeleteReason = "Terdapat sesi tryout aktif yang sedang berlangsung.";
  }

  return {
    questionId,
    canDeletePermanently,
    cannotDeleteReason,
    packages: packageRows,
    tryouts: tryoutPkgRows.map((t) => ({
      id: t.tryoutId,
      name: t.tryoutName,
      sectionCode: t.sectionCode ?? "tps",
    })),
    activeSessionsCount,
    practiceAttemptsCount,
    tryoutResponsesCount,
    reportsCount,
    revisionsCount,
  };
}

export async function safeDeleteQuestion(questionId: string) {
  const usage = await getQuestionUsageMap(questionId);
  if (!usage.canDeletePermanently) {
    throw new HTTPException(409, {
      message: usage.cannotDeleteReason || "Soal tidak dapat dihapus permanen.",
    });
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(tryoutPackageQuestions)
      .where(eq(tryoutPackageQuestions.questionId, questionId));
    await tx.delete(questionReports).where(eq(questionReports.questionId, questionId));
    await tx.delete(questions).where(eq(questions.id, questionId));
  });

  invalidateCatalogCache();
  return { success: true };
}
