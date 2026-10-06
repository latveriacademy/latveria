import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  idSchema,
  sectionImportSchema,
  utbkSubtests,
  type CreateTryoutSectionInput,
  type SectionImportInput,
  type TryoutSectionItem,
  type TryoutSectionQuestion,
  type UpdateTryoutSectionInput,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  questionPackages,
  questions,
  topics,
  tryoutPackageQuestions,
  tryoutSections,
} from "../lib/db/schema";
import { catalog, invalidateCatalogCache } from "./topic.service";

export async function listAdminTryouts() {
  const db = getDb();
  const pkgs = await db
    .select()
    .from(questionPackages)
    .where(
      or(
        eq(questionPackages.isFullTryout, true),
        eq(questionPackages.packageType, "Tryout"),
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
      published: pkg.published,
      isActive: pkg.isActive,
      targetQuestions: pkg.targetQuestions,
      sectionCount: pkgSections.length,
      questionCount: packageTotalMap.get(pkg.id) ?? 0,
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

  const questionsWithSection = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      questionType: questions.questionType,
      category: questions.category,
      itemWeight: questions.itemWeight,
      calculatorAllowed: questions.calculatorAllowed,
      stimulus: questions.stimulus,
      passage: questions.passage,
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
    .orderBy(asc(tryoutPackageQuestions.position), asc(tryoutPackageQuestions.order));

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
    sectionCount: sections.length,
    questionCount: questionsWithSection.length,
    sections: sectionItems,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

export async function createAdminTryout(body: unknown) {
  const b = body as {
    name?: string;
    topicId?: string;
    isFullTryout?: boolean;
    targetQuestions?: number;
    description?: string;
    category?: string;
    duration?: number;
    published?: boolean;
    order?: number;
    autoSeedSections?: boolean;
  };
  if (!b || !b.name) {
    throw new HTTPException(400, { message: "Nama tryout wajib diisi." });
  }

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
      published: b.published !== false,
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

  const b = body as {
    name?: string;
    description?: string;
    category?: string;
    duration?: number;
    published?: boolean;
    isActive?: boolean;
    targetQuestions?: number;
  };

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

  const [deleted] = await getDb()
    .delete(questionPackages)
    .where(eq(questionPackages.id, pId.data))
    .returning();
  if (!deleted) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });

  invalidateCatalogCache();
  return { success: true };
}

export async function createTryoutSection(packageId: string, input: CreateTryoutSectionInput) {
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

export async function updateTryoutSection(sectionId: string, input: UpdateTryoutSectionInput) {
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

export async function importSectionQuestions(sectionId: string, body: unknown) {
  const sId = idSchema.safeParse(sectionId);
  if (!sId.success) throw new HTTPException(404, { message: "ID section tidak valid." });

  const parsed = sectionImportSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pathStr = issue.path.join(".");
    throw new HTTPException(400, {
      message: `Format JSON tidak valid pada ${pathStr}: ${issue.message}`,
    });
  }

  const data: SectionImportInput = parsed.data;
  const db = getDb();

  return await db.transaction(async (tx) => {
    const [section] = await tx
      .select()
      .from(tryoutSections)
      .where(eq(tryoutSections.id, sId.data))
      .for("update");
    if (!section) throw new HTTPException(404, { message: "Section tryout tidak ditemukan." });

    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, section.packageId));
    if (!pkg) throw new HTTPException(404, { message: "Paket tryout tidak ditemukan." });

    // Match topic from subtestCode or fallback to package topic
    const matchedSubtest = utbkSubtests.find(
      (s) => s.short.toUpperCase() === section.subtestCode.toUpperCase(),
    );
    let topicId = pkg.topicId;
    if (matchedSubtest) {
      const [matchedTopic] = await tx
        .select({ id: topics.id })
        .from(topics)
        .where(eq(topics.slug, matchedSubtest.slug));
      if (matchedTopic) topicId = matchedTopic.id;
    }

    // Determine current highest position in section
    const existingQuestions = await tx
      .select({ position: tryoutPackageQuestions.position })
      .from(tryoutPackageQuestions)
      .where(eq(tryoutPackageQuestions.sectionId, section.id))
      .orderBy(desc(tryoutPackageQuestions.position));
    let nextPosition = (existingQuestions[0]?.position ?? 0) + 1;

    let importedCount = 0;
    for (const q of data.questions) {
      const isSingleChoice = q.type === "single_choice" || !q.type;
      const options = isSingleChoice
        ? (q as { options: string[] }).options
        : ["(A)", "(B)", "(C)", "(D)", "(E)"];
      const correctAnswer = isSingleChoice
        ? Number((q as { correctAnswer: number }).correctAnswer ?? 0)
        : 0;

      const [insertedQuestion] = await tx
        .insert(questions)
        .values({
          topicId,
          packageId: pkg.id,
          questionType: q.type,
          schemaVersion: data.schemaVersion,
          prompt: q.prompt,
          stimulus: q.stimulus ?? null,
          passage: q.passage ?? null,
          statements: q.type === "true_false_group" ? q.statements : null,
          scoringConfig: q.type === "true_false_group" ? q.scoring : null,
          options,
          correctAnswer,
          explanation: q.explanation || "Pembahasan tersedia.",
          source: q.source || "Tryout Latveria",
          category: q.category || section.title,
          itemWeight: q.itemWeight ?? 100,
          calculatorAllowed: Boolean(q.calculatorAllowed),
          order: nextPosition,
          subtestOrder: section.sectionOrder,
        })
        .returning({ id: questions.id });

      const finalPosition = q.position ?? nextPosition;
      await tx
        .insert(tryoutPackageQuestions)
        .values({
          packageId: pkg.id,
          sectionId: section.id,
          questionId: insertedQuestion.id,
          order: finalPosition,
          position: finalPosition,
        })
        .onConflictDoNothing();

      nextPosition++;
      importedCount++;
    }

    return {
      success: true,
      imported: importedCount,
      skipped: 0,
      failed: 0,
      sectionId: section.id,
    };
  });
}

export async function removeQuestionFromSection(sectionId: string, questionId: string) {
  const sId = idSchema.safeParse(sectionId);
  const qId = idSchema.safeParse(questionId);
  if (!sId.success || !qId.success)
    throw new HTTPException(400, { message: "ID section atau soal tidak valid." });

  await getDb()
    .delete(tryoutPackageQuestions)
    .where(
      and(
        eq(tryoutPackageQuestions.sectionId, sId.data),
        eq(tryoutPackageQuestions.questionId, qId.data),
      ),
    );

  return { success: true };
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
