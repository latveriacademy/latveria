import { and, count, eq, or, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  createPackageSchema,
  updatePackageSchema,
  type LearnerPackage,
  type PackageDetail,
  type QuestionPackage,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  practiceAnswers,
  questionPackages,
  questions,
  topics,
  tryoutPackageQuestions,
  tryoutSessions,
  practiceAttempts,
} from "../lib/db/schema";
import { invalidateCatalogCache, resolveTopic } from "./topic.service";
import { protectPassageSources, validatePassage } from "./question/question-passage";
import { resolvePassages } from "./tryout/tryout-review.service";
import { tryoutSections } from "../lib/db/schema";

export async function getSubtestPackages(subtestId: string): Promise<QuestionPackage[]> {
  const topic = await resolveTopic(subtestId);
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const rows = await getDb()
    .select({
      id: questionPackages.id,
      topicId: questionPackages.topicId,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      isActive: questionPackages.isActive,
      packageType: questionPackages.packageType,
      category: questionPackages.category,
      duration: questionPackages.duration,
      isFullTryout: questionPackages.isFullTryout,
      targetQuestions: questionPackages.targetQuestions,
      published: questionPackages.published,
      questionCount: count(questions.id),
      createdAt: questionPackages.createdAt,
      updatedAt: questionPackages.updatedAt,
    })
    .from(questionPackages)
    .leftJoin(questions, eq(questions.packageId, questionPackages.id))
    .where(eq(questionPackages.topicId, topic.id))
    .groupBy(questionPackages.id)
    .orderBy(questionPackages.order, questionPackages.createdAt);

  return rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createSubtestPackage(
  subtestId: string,
  body: unknown,
): Promise<QuestionPackage> {
  const topic = await resolveTopic(subtestId);
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const parsed = createPackageSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data paket tidak valid.",
    });

  const [existing] = await getDb()
    .select({ id: questionPackages.id })
    .from(questionPackages)
    .where(
      and(eq(questionPackages.topicId, topic.id), eq(questionPackages.name, parsed.data.name)),
    );
  if (existing)
    throw new HTTPException(409, {
      message: `Paket '${parsed.data.name}' sudah ada pada subtes ini.`,
    });

  const [created] = await getDb()
    .insert(questionPackages)
    .values({
      topicId: topic.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      order: parsed.data.order,
      isActive: parsed.data.isActive,
      packageType: parsed.data.packageType,
      category: parsed.data.category,
      duration: parsed.data.duration,
      isFullTryout: parsed.data.isFullTryout,
      targetQuestions: parsed.data.targetQuestions,
      published: parsed.data.published,
    })
    .returning();

  return {
    ...created,
    questionCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function getPackageDetail(packageId: string): Promise<PackageDetail> {
  const [pkg] = await getDb()
    .select({
      id: questionPackages.id,
      topicId: questionPackages.topicId,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      isActive: questionPackages.isActive,
      packageType: questionPackages.packageType,
      category: questionPackages.category,
      duration: questionPackages.duration,
      isFullTryout: questionPackages.isFullTryout,
      targetQuestions: questionPackages.targetQuestions,
      published: questionPackages.published,
      createdAt: questionPackages.createdAt,
      updatedAt: questionPackages.updatedAt,
      topicName: topics.name,
      topicSlug: topics.slug,
    })
    .from(questionPackages)
    .innerJoin(topics, eq(questionPackages.topicId, topics.id))
    .where(eq(questionPackages.id, packageId));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const qRows = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      passage: questions.passage,
      passageId: questions.passageId,
      category: questions.category,
      source: questions.source,
      usage: count(practiceAnswers.id),
    })
    .from(questions)
    .leftJoin(practiceAnswers, eq(practiceAnswers.questionId, questions.id))
    .where(eq(questions.packageId, packageId))
    .groupBy(questions.id)
    .orderBy(questions.id);

  return {
    ...pkg,
    questionCount: qRows.length,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    questions: qRows.map((q) => ({ ...q, usage: Number(q.usage ?? 0) })),
  };
}

export async function updatePackage(packageId: string, body: unknown): Promise<QuestionPackage> {
  const parsed = updatePackageSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data paket tidak valid.",
    });

  const [existing] = await getDb()
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, packageId));
  if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const [conflict] = await getDb()
      .select({ id: questionPackages.id })
      .from(questionPackages)
      .where(
        and(
          eq(questionPackages.topicId, existing.topicId),
          eq(questionPackages.name, parsed.data.name),
        ),
      );
    if (conflict)
      throw new HTTPException(409, {
        message: `Paket '${parsed.data.name}' sudah ada pada subtes ini.`,
      });
  }

  const [updated] = await getDb()
    .update(questionPackages)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(questionPackages.id, packageId))
    .returning();

  const [qCount] = await getDb()
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.packageId, packageId));

  return {
    ...updated,
    questionCount: Number(qCount.value ?? 0),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deletePackage(packageId: string): Promise<{ success: true }> {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .for("update");
    if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

    const [history] = await tx
      .select({ id: tryoutSessions.id })
      .from(tryoutSessions)
      .where(eq(tryoutSessions.packageId, packageId))
      .limit(1);
    const [attempt] = await tx
      .select({ id: practiceAttempts.id })
      .from(practiceAttempts)
      .where(eq(practiceAttempts.packageId, packageId))
      .limit(1);
    if (history || attempt)
      throw new HTTPException(409, {
        message: "Paket memiliki riwayat peserta. Nonaktifkan paket agar riwayat tetap tersimpan.",
      });
    const [qCount] = await tx
      .select({ value: count() })
      .from(questions)
      .where(eq(questions.packageId, packageId));
    if (qCount.value > 0) {
      throw new HTTPException(409, {
        message: `Paket masih berisi ${qCount.value} soal. Pindahkan atau keluarkan soal sebelum menghapus paket.`,
      });
    }

    await tx.delete(questionPackages).where(eq(questionPackages.id, packageId));
    invalidateCatalogCache();
    return { success: true };
  });
}

export async function addQuestionToPackage(packageId: string, questionId: string) {
  const [pkg] = await getDb()
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, packageId));
  if (!pkg) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

  const [q] = await getDb().select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });

  if (q.topicId !== pkg.topicId) {
    throw new HTTPException(400, {
      message: "Soal tidak dapat dimasukkan ke paket dari subtes yang berbeda.",
    });
  }
  if (q.packageId !== pkg.id) await protectPassageSources(getDb(), [q.id]);
  await validatePassage(getDb(), { ...q, packageId: pkg.id }, q.id);
  await getDb().update(questions).set({ packageId: pkg.id }).where(eq(questions.id, q.id));
  return { success: true, packageId: pkg.id, questionId: q.id };
}

export async function moveQuestionPackage(questionId: string, targetPackageId: string | null) {
  const [q] = await getDb().select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
  if (q.packageId !== targetPackageId) await protectPassageSources(getDb(), [q.id]);
  await validatePassage(getDb(), { ...q, packageId: targetPackageId }, q.id);

  if (targetPackageId) {
    const [pkg] = await getDb()
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, targetPackageId));
    if (!pkg) throw new HTTPException(404, { message: "Paket tujuan tidak ditemukan." });
    if (pkg.topicId !== q.topicId) {
      throw new HTTPException(400, {
        message: "Soal tidak dapat dipindahkan ke paket dari subtes yang berbeda.",
      });
    }
    await getDb().update(questions).set({ packageId: pkg.id }).where(eq(questions.id, q.id));
  } else {
    await getDb().update(questions).set({ packageId: null }).where(eq(questions.id, q.id));
  }

  return { success: true, questionId: q.id, packageId: targetPackageId };
}

export async function removeQuestionFromPackage(packageId: string, questionId: string) {
  const [q] = await getDb()
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.packageId, packageId)));
  if (!q) throw new HTTPException(404, { message: "Soal tidak ditemukan dalam paket ini." });
  await protectPassageSources(getDb(), [q.id]);
  await validatePassage(getDb(), { ...q, packageId: null }, q.id);
  await getDb().update(questions).set({ packageId: null }).where(eq(questions.id, q.id));
  return { success: true };
}

export async function getLearnerPackagesByTopic(
  subtestIdOrSlug: string,
): Promise<LearnerPackage[]> {
  const topic = await resolveTopic(subtestIdOrSlug);
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const rows = await getDb()
    .select({
      id: questionPackages.id,
      name: questionPackages.name,
      description: questionPackages.description,
      order: questionPackages.order,
      questionCount: count(questions.id),
    })
    .from(questionPackages)
    .leftJoin(questions, eq(questions.packageId, questionPackages.id))
    .where(
      and(
        eq(questionPackages.topicId, topic.id),
        eq(questionPackages.isActive, true),
        eq(questionPackages.published, true),
      ),
    )
    .groupBy(questionPackages.id)
    .orderBy(questionPackages.order, questionPackages.createdAt);

  return rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount ?? 0),
  }));
}

export async function getAllLearnerPackages() {
  const db = getDb();
  const [rows, pinned] = await Promise.all([
    db
      .select({
        id: questionPackages.id,
        name: questionPackages.name,
        description: questionPackages.description,
        order: questionPackages.order,
        topicId: questionPackages.topicId,
        topicName: topics.name,
        topicSlug: topics.slug,
        packageType: questionPackages.packageType,
        category: questionPackages.category,
        duration: questionPackages.duration,
        isFullTryout: questionPackages.isFullTryout,
        published: questionPackages.published,
        questionCount: count(questions.id),
      })
      .from(questionPackages)
      .innerJoin(topics, eq(questionPackages.topicId, topics.id))
      .leftJoin(questions, eq(questions.packageId, questionPackages.id))
      .where(and(eq(questionPackages.isActive, true), eq(questionPackages.published, true)))
      .groupBy(questionPackages.id, topics.id)
      .orderBy(questionPackages.order, questionPackages.createdAt),
    db
      .select({ packageId: tryoutPackageQuestions.packageId, questionCount: count() })
      .from(tryoutPackageQuestions)
      .groupBy(tryoutPackageQuestions.packageId),
  ]);
  const pinnedCounts = new Map(pinned.map((item) => [item.packageId, Number(item.questionCount)]));

  return rows.map((row) => {
    const pinned = pinnedCounts.get(row.id);
    const direct = Number(row.questionCount ?? 0);
    return {
      ...row,
      questionCount: row.isFullTryout ? (pinned && pinned > 0 ? pinned : direct) : direct,
    };
  });
}

export async function duplicatePackage(packageId: string) {
  const result = await getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId));
    if (!existing) throw new HTTPException(404, { message: "Paket tidak ditemukan." });

    const newName = `${existing.name} (Salinan ${Date.now().toString().slice(-4)})`;
    const [created] = await tx
      .insert(questionPackages)
      .values({
        topicId: existing.topicId,
        name: newName,
        description: existing.description,
        packageType: existing.packageType,
        category: existing.category,
        duration: existing.duration,
        isFullTryout: existing.isFullTryout,
        targetQuestions: existing.targetQuestions,
        targetYear: existing.targetYear,
        published: false,
        order: existing.order + 1,
        isActive: true,
      })
      .returning();

    const pinned = await tx
      .select()
      .from(tryoutPackageQuestions)
      .where(eq(tryoutPackageQuestions.packageId, existing.id));
    const qRows = await tx
      .select()
      .from(questions)
      .where(
        or(
          eq(questions.packageId, existing.id),
          pinned.length
            ? inArray(
                questions.id,
                pinned.map((pin) => pin.questionId),
              )
            : undefined,
        ),
      );
    const resolved = await resolvePassages(qRows);
    const ids = new Map(qRows.map((q) => [q.id, crypto.randomUUID()]));
    if (qRows.length > 0) {
      await tx.insert(questions).values(
        resolved.map((q) => ({
          ...q,
          id: ids.get(q.id)!,
          packageId: q.packageId === existing.id ? created.id : null,
          passageId: q.passageId ? (ids.get(q.passageId) ?? null) : null,
          passage: q.passageId && ids.has(q.passageId) ? null : q.passage,
        })),
      );
    }

    const sections = await tx
      .select()
      .from(tryoutSections)
      .where(eq(tryoutSections.packageId, existing.id));
    const sectionIds = new Map(sections.map((s) => [s.id, crypto.randomUUID()]));
    if (sections.length)
      await tx
        .insert(tryoutSections)
        .values(sections.map((s) => ({ ...s, id: sectionIds.get(s.id)!, packageId: created.id })));
    if (pinned.length)
      await tx.insert(tryoutPackageQuestions).values(
        pinned.map((pin) => ({
          ...pin,
          packageId: created.id,
          questionId: ids.get(pin.questionId)!,
          sectionId: pin.sectionId ? sectionIds.get(pin.sectionId)! : null,
        })),
      );
    return {
      ...created,
      questionCount: qRows.length,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  });
  invalidateCatalogCache();
  return result;
}
