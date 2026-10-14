import { and, asc, count, desc, eq, inArray, notInArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  bulkDeleteSchema,
  idSchema,
  utbkSubtests,
  createTryoutSchema,
  updateTryoutSchema,
  createTryoutSectionSchema,
  updateTryoutSectionSchema,
  type TryoutSectionItem,
  type TryoutSectionQuestion,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import {
  questionPackages,
  questions,
  tryoutPackageQuestions,
  tryoutSections,
} from "../../lib/db/schema";
import { catalog, invalidateCatalogCache } from "../topic.service";
import { deletePackage } from "../package.service";
import { buildTryoutConfig } from "./tryout-config";
import { resolvePassages } from "./tryout-review.service";

export async function listAdminTryouts() {
  const db = getDb();
  const pkgs = await db
    .select()
    .from(questionPackages)
    .where(
      or(
        eq(questionPackages.isFullTryout, true),
        eq(questionPackages.packageType, "Simulasi"),
        eq(questionPackages.packageType, "Simulasi Akbar"),
      ),
    )
    .orderBy(desc(questionPackages.createdAt));

  const allSections = await db
    .select()
    .from(tryoutSections)
    .orderBy(asc(tryoutSections.sectionOrder));

  const questionCounts = await db
    .select({
      packageId: tryoutPackageQuestions.packageId,
      sectionId: tryoutPackageQuestions.sectionId,
      cnt: count(),
    })
    .from(tryoutPackageQuestions)
    .groupBy(tryoutPackageQuestions.packageId, tryoutPackageQuestions.sectionId);
  const directCounts = await db
    .select({ packageId: questions.packageId, cnt: count() })
    .from(questions)
    .groupBy(questions.packageId);
  const directMap = new Map(directCounts.map((row) => [row.packageId, Number(row.cnt)]));

  const sectionCountMap = new Map<string, number>();
  const packageTotalMap = new Map<string, number>();
  for (const row of questionCounts) {
    if (row.sectionId) {
      sectionCountMap.set(row.sectionId, Number(row.cnt));
    }
    const current = packageTotalMap.get(row.packageId) ?? 0;
    packageTotalMap.set(row.packageId, current + Number(row.cnt));
  }

  return pkgs.map((pkg) => {
    const pkgSections = allSections
      .filter((s) => s.packageId === pkg.id)
      .map((s) => ({
        id: s.id,
        tryoutPackageId: s.packageId,
        subtestCode: s.subtestCode,
        title: s.title,
        sectionOrder: s.sectionOrder,
        durationSeconds: s.durationSeconds,
        questionCount: sectionCountMap.get(s.id) ?? 0,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      category: pkg.category,
      packageType: pkg.packageType,
      isFullTryout: pkg.isFullTryout,
      duration: pkg.duration,
      targetYear: pkg.targetYear,
      totalDurationSeconds: pkgSections.length
        ? pkgSections.reduce((n, s) => n + s.durationSeconds, 0)
        : pkg.duration * 60,
      durationMinutes: pkgSections.length
        ? Math.round(pkgSections.reduce((n, s) => n + s.durationSeconds, 0) / 60)
        : pkg.duration,
      published: pkg.published,
      isActive: pkg.isActive,
      targetQuestions: pkg.targetQuestions,
      sectionCount: pkgSections.length,
      questionCount: packageTotalMap.get(pkg.id) ?? directMap.get(pkg.id) ?? 0,
      sections: pkgSections,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    };
  });
}

export async function getAdminTryout(packageId: string) {
  const pId = idSchema.safeParse(packageId);
  if (!pId.success) throw new HTTPException(404, { message: "ID tryout tidak valid." });

  const db = getDb();
  const [pkg] = await db.select().from(questionPackages).where(eq(questionPackages.id, pId.data));
  if (!pkg) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });

  const sections = await db
    .select()
    .from(tryoutSections)
    .where(eq(tryoutSections.packageId, pkg.id))
    .orderBy(asc(tryoutSections.sectionOrder));

  const questionsWithSection = await resolvePassages(
    await db
      .select({
        id: questions.id,
        prompt: questions.prompt,
        questionType: questions.questionType,
        category: questions.category,
        itemWeight: questions.itemWeight,
        calculatorAllowed: questions.calculatorAllowed,
        stimulus: questions.stimulus,
        passage: questions.passage,
        passageId: questions.passageId,
        annotations: questions.annotations,
        scoring: questions.scoringConfig,
        options: questions.options,
        statements: questions.statements,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        source: questions.source,
        sectionId: tryoutPackageQuestions.sectionId,
        position: tryoutPackageQuestions.position,
        order: tryoutPackageQuestions.order,
      })
      .from(tryoutPackageQuestions)
      .innerJoin(questions, eq(tryoutPackageQuestions.questionId, questions.id))
      .where(eq(tryoutPackageQuestions.packageId, pkg.id))
      .orderBy(
        asc(tryoutPackageQuestions.position),
        asc(tryoutPackageQuestions.order),
        asc(questions.id),
      ),
  );

  const sectionItems: (TryoutSectionItem & { questions: TryoutSectionQuestion[] })[] = sections.map(
    (sec) => {
      const secQuestions: TryoutSectionQuestion[] = questionsWithSection
        .filter((q) => q.sectionId === sec.id)
        .map((q) => ({
          id: q.id,
          questionId: q.id,
          sectionId: sec.id,
          position: q.position || q.order,
          prompt: q.prompt,
          type: (q.questionType as "single_choice" | "true_false_group") || "single_choice",
          category: q.category,
          itemWeight: q.itemWeight,
          calculatorAllowed: q.calculatorAllowed,
          stimulus: q.stimulus,
          passage: q.passage,
          passageId: q.passageId,
          annotations: q.annotations,
          scoring: q.scoring,
          options: q.options,
          statements: q.statements,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          source: q.source,
        }));

      return {
        id: sec.id,
        tryoutPackageId: sec.packageId,
        subtestCode: sec.subtestCode,
        title: sec.title,
        sectionOrder: sec.sectionOrder,
        durationSeconds: sec.durationSeconds,
        questionCount: secQuestions.length,
        questions: secQuestions,
        createdAt: sec.createdAt.toISOString(),
        updatedAt: sec.updatedAt.toISOString(),
      };
    },
  );

  return {
    ...pkg,
    totalDurationSeconds: sections.length
      ? sections.reduce((n, s) => n + s.durationSeconds, 0)
      : pkg.duration * 60,
    durationMinutes: sections.length
      ? Math.round(sections.reduce((n, s) => n + s.durationSeconds, 0) / 60)
      : pkg.duration,
    sectionCount: sections.length,
    questionCount: questionsWithSection.length,
    sections: sectionItems,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

export async function createAdminTryout(body: unknown) {
  const parsed = createTryoutSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Data tryout tidak valid." });
  const b = parsed.data;
  if (b.published)
    throw new HTTPException(409, {
      message: "Buat draf, isi seluruh subtes, lalu publikasikan tryout.",
    });

  const db = getDb();
  let topicId = b.topicId;
  if (!topicId) {
    const allTopics = await catalog(true);
    topicId = allTopics[0]?.id;
  }
  if (!topicId) throw new HTTPException(400, { message: "Subtes default belum tersedia." });

  const isFullTryout = b.isFullTryout !== false;
  const targetQuestions = Number(b.targetQuestions || (isFullTryout ? 160 : 30));

  const [pkg] = await db
    .insert(questionPackages)
    .values({
      topicId,
      name: b.name,
      description: b.description ?? "Tryout Standar SNPMB UTBK",
      packageType: "Tryout",
      category: b.category || "utbk",
      duration: Number(b.duration || 195),
      isFullTryout,
      targetQuestions,
      targetYear: b.targetYear ?? null,
      published: b.published,
      order: Number(b.order || 1),
      isActive: true,
    })
    .returning();

  // If full tryout or autoSeedSections, create default 7 sections for official subtests
  if (isFullTryout || b.autoSeedSections) {
    const defaultDurations: Record<string, number> = {
      PU: 30 * 60,
      PPU: 15 * 60,
      PBM: 25 * 60,
      PK: 20 * 60,
      BI: 45 * 60,
      EN: 30 * 60,
      PM: 30 * 60,
    };
    for (const [idx, subtest] of utbkSubtests.entries()) {
      await db
        .insert(tryoutSections)
        .values({
          packageId: pkg.id,
          subtestCode: subtest.short,
          title: subtest.name,
          sectionOrder: idx + 1,
          durationSeconds: defaultDurations[subtest.short] ?? 30 * 60,
        })
        .onConflictDoNothing();
    }
  }

  invalidateCatalogCache();
  return getAdminTryout(pkg.id);
}

export async function updateAdminTryout(packageId: string, body: unknown) {
  const pId = idSchema.safeParse(packageId);
  if (!pId.success) throw new HTTPException(404, { message: "ID tryout tidak valid." });

  const parsed = updateTryoutSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Data tryout tidak valid." });
  const b = parsed.data;
  if (b.published) {
    const [pkg] = await getDb()
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, pId.data));
    if (!pkg) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });
    await buildTryoutConfig(pkg);
  }

  const [updated] = await getDb()
    .update(questionPackages)
    .set({
      ...(b.name ? { name: b.name } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.category ? { category: b.category } : {}),
      ...(b.duration !== undefined ? { duration: Number(b.duration) } : {}),
      ...(b.published !== undefined ? { published: Boolean(b.published) } : {}),
      ...(b.isActive !== undefined ? { isActive: Boolean(b.isActive) } : {}),
      ...(b.targetQuestions !== undefined ? { targetQuestions: Number(b.targetQuestions) } : {}),
      ...(b.targetYear !== undefined ? { targetYear: b.targetYear } : {}),
      updatedAt: new Date(),
    })
    .where(eq(questionPackages.id, pId.data))
    .returning();

  if (!updated) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });
  invalidateCatalogCache();
  return getAdminTryout(updated.id);
}

export async function deleteAdminTryout(packageId: string) {
  const pId = idSchema.safeParse(packageId);
  if (!pId.success) throw new HTTPException(404, { message: "ID tryout tidak valid." });

  return deletePackage(pId.data);
}

export async function createTryoutSection(packageId: string, body: unknown) {
  const parsed = createTryoutSectionSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Data subtes tidak valid." });
  const input = parsed.data;
  const pId = idSchema.safeParse(packageId);
  if (!pId.success) throw new HTTPException(404, { message: "ID tryout tidak valid." });

  const [pkg] = await getDb()
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, pId.data));
  if (!pkg) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });

  const [created] = await getDb()
    .insert(tryoutSections)
    .values({
      packageId: pkg.id,
      subtestCode: input.subtestCode.toUpperCase(),
      title: input.title,
      sectionOrder: input.sectionOrder ?? 0,
      durationSeconds: input.durationSeconds ?? 1800,
    })
    .returning();

  return {
    ...created,
    questionCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateTryoutSection(sectionId: string, body: unknown) {
  const parsed = updateTryoutSectionSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Data subtes tidak valid." });
  const input = parsed.data;
  const sId = idSchema.safeParse(sectionId);
  if (!sId.success) throw new HTTPException(404, { message: "ID section tidak valid." });

  const [updated] = await getDb()
    .update(tryoutSections)
    .set({
      ...(input.subtestCode ? { subtestCode: input.subtestCode.toUpperCase() } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.sectionOrder !== undefined ? { sectionOrder: input.sectionOrder } : {}),
      ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tryoutSections.id, sId.data))
    .returning();

  if (!updated) throw new HTTPException(404, { message: "Section tidak ditemukan." });
  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteTryoutSection(sectionId: string) {
  const sId = idSchema.safeParse(sectionId);
  if (!sId.success) throw new HTTPException(404, { message: "ID section tidak valid." });

  const [deleted] = await getDb()
    .delete(tryoutSections)
    .where(eq(tryoutSections.id, sId.data))
    .returning();
  if (!deleted) throw new HTTPException(404, { message: "Section tidak ditemukan." });

  return { success: true };
}

export { importSectionQuestions } from "./admin-tryout-import.service";
export async function removeQuestionFromSection(sectionId: string, questionId: string) {
  const sId = idSchema.safeParse(sectionId);
  const qId = idSchema.safeParse(questionId);
  if (!sId.success || !qId.success)
    throw new HTTPException(400, { message: "ID section atau soal tidak valid." });

  return getDb().transaction(async (tx) => {
    const [section] = await tx.select().from(tryoutSections).where(eq(tryoutSections.id, sId.data));
    if (!section) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
    await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, section.packageId))
      .for("update");
    const [dependent] = await tx
      .select({ id: questions.id })
      .from(questions)
      .innerJoin(tryoutPackageQuestions, eq(tryoutPackageQuestions.questionId, questions.id))
      .where(and(eq(tryoutPackageQuestions.sectionId, sId.data), eq(questions.passageId, qId.data)))
      .limit(1);
    if (dependent)
      throw new HTTPException(409, {
        message:
          "Wacana soal ini masih digunakan dalam subtes. Lepaskan referensi sebelum mengeluarkan sumber.",
      });
    await tx
      .delete(tryoutPackageQuestions)
      .where(
        and(
          eq(tryoutPackageQuestions.sectionId, sId.data),
          eq(tryoutPackageQuestions.questionId, qId.data),
        ),
      );

    const remaining = await tx
      .select({ questionId: tryoutPackageQuestions.questionId })
      .from(tryoutPackageQuestions)
      .where(eq(tryoutPackageQuestions.sectionId, sId.data))
      .orderBy(asc(tryoutPackageQuestions.position), asc(tryoutPackageQuestions.order));

    for (const [idx, item] of remaining.entries()) {
      await tx
        .update(tryoutPackageQuestions)
        .set({ position: idx + 1, order: idx + 1 })
        .where(
          and(
            eq(tryoutPackageQuestions.sectionId, sId.data),
            eq(tryoutPackageQuestions.questionId, item.questionId),
          ),
        );
    }

    return { success: true };
  });
}

export async function bulkRemoveQuestionsFromSection(sectionId: string, body: unknown) {
  const sId = idSchema.safeParse(sectionId);
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!sId.success || !parsed.success)
    throw new HTTPException(400, { message: "ID section atau daftar soal tidak valid." });

  const qIds = parsed.data.ids;
  return getDb().transaction(async (tx) => {
    const [section] = await tx.select().from(tryoutSections).where(eq(tryoutSections.id, sId.data));
    if (!section) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
    await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, section.packageId))
      .for("update");
    const [dependent] = await tx
      .select({ id: questions.id })
      .from(questions)
      .innerJoin(tryoutPackageQuestions, eq(tryoutPackageQuestions.questionId, questions.id))
      .where(
        and(
          eq(tryoutPackageQuestions.sectionId, sId.data),
          inArray(questions.passageId, qIds),
          notInArray(questions.id, qIds),
        ),
      )
      .limit(1);
    if (dependent)
      throw new HTTPException(409, {
        message:
          "Salah satu soal yang dipilih wacananya masih digunakan oleh soal lain dalam subtes ini. Lepaskan referensi sebelum mengeluarkannya.",
      });

    await tx
      .delete(tryoutPackageQuestions)
      .where(
        and(
          eq(tryoutPackageQuestions.sectionId, sId.data),
          inArray(tryoutPackageQuestions.questionId, qIds),
        ),
      );

    const remaining = await tx
      .select({ questionId: tryoutPackageQuestions.questionId })
      .from(tryoutPackageQuestions)
      .where(eq(tryoutPackageQuestions.sectionId, sId.data))
      .orderBy(asc(tryoutPackageQuestions.position), asc(tryoutPackageQuestions.order));

    for (const [idx, item] of remaining.entries()) {
      await tx
        .update(tryoutPackageQuestions)
        .set({ position: idx + 1, order: idx + 1 })
        .where(
          and(
            eq(tryoutPackageQuestions.sectionId, sId.data),
            eq(tryoutPackageQuestions.questionId, item.questionId),
          ),
        );
    }

    return { count: qIds.length, success: true };
  });
}

export async function reorderSectionQuestions(sectionId: string, questionIds: string[]) {
  const sId = idSchema.safeParse(sectionId);
  if (!sId.success) throw new HTTPException(404, { message: "ID section tidak valid." });

  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [idx, qId] of questionIds.entries()) {
      await tx
        .update(tryoutPackageQuestions)
        .set({ position: idx + 1, order: idx + 1 })
        .where(
          and(
            eq(tryoutPackageQuestions.sectionId, sId.data),
            eq(tryoutPackageQuestions.questionId, qId),
          ),
        );
    }
  });

  return { success: true };
}
