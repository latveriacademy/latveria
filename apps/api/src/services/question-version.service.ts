import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { QuestionVersionDiff, QuestionVersionItem } from "@latveria/shared";
import { getDb } from "../lib/db";
import { questions, questionRevisions } from "../lib/db/schema";
import { user } from "../lib/db/auth-schema";
import { invalidateCatalogCache } from "./topic.service";

export async function getQuestionVersionHistory(
  questionId: string,
): Promise<QuestionVersionItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: questionRevisions.id,
      questionId: questionRevisions.questionId,
      versionNumber: questionRevisions.versionNumber,
      contentHash: questionRevisions.contentHash,
      authorName: user.name,
      changeSummary: questionRevisions.changeSummary,
      changeReason: questionRevisions.changeReason,
      createdAt: questionRevisions.createdAt,
    })
    .from(questionRevisions)
    .leftJoin(user, eq(questionRevisions.authorId, user.id))
    .where(eq(questionRevisions.questionId, questionId))
    .orderBy(desc(questionRevisions.versionNumber), desc(questionRevisions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    versionNumber: r.versionNumber,
    contentHash: r.contentHash,
    authorName: r.authorName,
    changeSummary: r.changeSummary,
    changeReason: r.changeReason,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getQuestionVersionDiff(
  questionId: string,
  v1: number,
  v2: number,
): Promise<QuestionVersionDiff> {
  const db = getDb();
  const [rev1, rev2] = await Promise.all([
    db
      .select()
      .from(questionRevisions)
      .where(
        and(eq(questionRevisions.questionId, questionId), eq(questionRevisions.versionNumber, v1)),
      )
      .limit(1),
    db
      .select()
      .from(questionRevisions)
      .where(
        and(eq(questionRevisions.questionId, questionId), eq(questionRevisions.versionNumber, v2)),
      )
      .limit(1),
  ]);

  if (!rev1.length || !rev2.length) {
    throw new HTTPException(404, { message: "Versi revisi tidak ditemukan." });
  }

  const s1 = rev1[0].snapshot as Record<string, unknown>;
  const s2 = rev2[0].snapshot as Record<string, unknown>;

  const fieldsToCompare = [
    "prompt",
    "passage",
    "options",
    "correctAnswer",
    "explanation",
    "difficulty",
    "tags",
    "statements",
  ];

  const changedFields: string[] = [];
  const diffs: Record<string, { before: unknown; after: unknown }> = {};

  for (const field of fieldsToCompare) {
    const val1 = JSON.stringify(s1[field] ?? null);
    const val2 = JSON.stringify(s2[field] ?? null);
    if (val1 !== val2) {
      changedFields.push(field);
      diffs[field] = {
        before: s1[field] ?? null,
        after: s2[field] ?? null,
      };
    }
  }

  return {
    oldVersion: v1,
    newVersion: v2,
    changedFields,
    diffs,
  };
}

export async function rollbackQuestionToVersion(
  questionId: string,
  targetVersion: number,
  actorId: string,
  reason?: string,
) {
  const db = getDb();
  const [targetRev] = await db
    .select()
    .from(questionRevisions)
    .where(
      and(
        eq(questionRevisions.questionId, questionId),
        eq(questionRevisions.versionNumber, targetVersion),
      ),
    )
    .limit(1);

  if (!targetRev) {
    throw new HTTPException(404, { message: "Target versi rollback tidak ditemukan." });
  }

  const [latestRev] = await db
    .select({ maxVersion: questionRevisions.versionNumber })
    .from(questionRevisions)
    .where(eq(questionRevisions.questionId, questionId))
    .orderBy(desc(questionRevisions.versionNumber))
    .limit(1);

  const newVersionNumber = (latestRev?.maxVersion ?? targetVersion) + 1;
  const snapshot = targetRev.snapshot;

  await db.transaction(async (tx) => {
    // 1. Update mutable question record
    await tx
      .update(questions)
      .set({
        prompt: snapshot.prompt,
        passage: snapshot.passage,
        passageId: snapshot.passageId,
        options: snapshot.options,
        correctAnswer: snapshot.correctAnswer,
        explanation: snapshot.explanation,
        stimulus: snapshot.stimulus,
        statements: snapshot.statements,
        scoringConfig: snapshot.scoringConfig,
        difficulty: snapshot.difficulty ?? "medium",
        tags: snapshot.tags ?? [],
        updatedAt: new Date(),
        authorId: actorId,
      })
      .where(eq(questions.id, questionId));

    // 2. Insert new immutable revision preserving historical continuity
    await tx.insert(questionRevisions).values({
      questionId,
      topicId: snapshot.topicId,
      contentHash: targetRev.contentHash,
      snapshot: { ...snapshot, updatedAt: new Date() },
      versionNumber: newVersionNumber,
      authorId: actorId,
      changeSummary: `Rollback ke versi ${targetVersion}`,
      changeReason: reason || `Admin melakukan rollback ke versi ${targetVersion}`,
    });
  });

  invalidateCatalogCache();
  return { success: true, newVersionNumber };
}
