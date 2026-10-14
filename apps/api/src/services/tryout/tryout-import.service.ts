import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { idSchema, normalizeTryoutImport, utbkSubtests } from "@latveria/shared";
import { getDb } from "../../lib/db";
import {
  questions,
  questionPackages,
  topics,
  tryoutSections,
  tryoutPackageQuestions,
} from "../../lib/db/schema";
import { invalidateCatalogCache } from "../topic.service";

export async function importTryoutBatch(
  packageId: string,
  body: unknown,
  selectedSectionId?: string,
) {
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 200_000)
    throw new HTTPException(413, { message: "JSON maksimal 200 KB." });
  if (!idSchema.safeParse(packageId).success) throw new HTTPException(404);
  const result = await getDb().transaction(async (tx) => {
    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .for("update");
    if (!pkg) throw new HTTPException(404, { message: "Tryout tidak ditemukan." });
    const sections = await tx
      .select()
      .from(tryoutSections)
      .where(eq(tryoutSections.packageId, pkg.id))
      .orderBy(tryoutSections.sectionOrder)
      .for("update");
    const selected = selectedSectionId
      ? sections.find((s) => s.id === selectedSectionId)
      : undefined;
    if (selectedSectionId && !selected)
      throw new HTTPException(404, { message: "Subtes tujuan tidak ditemukan." });
    const selectedSlug = selected
      ? utbkSubtests.find((s) => s.short === selected.subtestCode)?.slug
      : undefined;
    let batch;
    try {
      batch = normalizeTryoutImport(body, selectedSlug);
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : "JSON tidak valid.",
      });
    }
    const allTopics = await tx.select().from(topics);
    const destinations: { id: string; name: string; count: number }[] = [];
    for (const group of batch.groups) {
      const official = utbkSubtests.find((s) => s.slug === group.subtes)!;
      const section = sections.find((s) => s.subtestCode === official.short);
      const topic = allTopics.find((t) => t.slug === group.subtes);
      if (!section || !topic)
        throw new HTTPException(400, { message: `Subtes ${official.name} belum dikonfigurasi.` });
      const [last] = await tx
        .select({ position: tryoutPackageQuestions.position })
        .from(tryoutPackageQuestions)
        .where(eq(tryoutPackageQuestions.sectionId, section.id))
        .orderBy(desc(tryoutPackageQuestions.position))
        .limit(1);
      let position = (last?.position ?? 0) + 1;
      for (const q of group.questions) {
        if (q.annotations.length && group.subtes !== "literasi-bahasa-inggris")
          throw new HTTPException(400, { message: "Anotasi Lexicon hanya tersedia untuk LBE." });
        let passage = q.passage ?? null;
        if (q.passageId) {
          const [source] = await tx
            .select()
            .from(questions)
            .where(eq(questions.id, q.passageId))
            .for("key share");
          if (!source?.passage || source.topicId !== topic.id)
            throw new HTTPException(400, {
              message: "Wacana sumber tidak tersedia pada subtes ini.",
            });
          passage = source.passage;
        }
        const [question] = await tx
          .insert(questions)
          .values({
            topicId: topic.id,
            packageId: null,
            questionType: q.type,
            schemaVersion: batch.schemaVersion,
            prompt: q.prompt,
            passage,
            stimulus: q.stimulus ?? null,
            annotations: q.annotations,
            statements: q.type === "true_false_group" ? q.statements : null,
            scoringConfig: q.type === "true_false_group" ? q.scoring : null,
            options: q.type === "single_choice" ? q.options : ["(A)", "(B)", "(C)", "(D)", "(E)"],
            correctAnswer: q.type === "single_choice" ? q.correctAnswer : 0,
            explanation: q.explanation,
            source: q.source,
            category: group.category ?? q.category ?? section.title,
            itemWeight: q.itemWeight,
            calculatorAllowed: q.calculatorAllowed,
            order: q.position ?? position,
            subtestOrder: section.sectionOrder,
          })
          .returning({ id: questions.id });
        await tx.insert(tryoutPackageQuestions).values({
          packageId: pkg.id,
          sectionId: section.id,
          questionId: question.id,
          position: q.position ?? position,
          order: q.position ?? position,
        });
        position++;
      }
      destinations.push({ id: section.id, name: section.title, count: group.questions.length });
    }
    return { count: destinations.reduce((n, d) => n + d.count, 0), sections: destinations };
  });
  invalidateCatalogCache();
  return result;
}

export async function importSectionBatch(sectionId: string, body: unknown) {
  if (!idSchema.safeParse(sectionId).success) throw new HTTPException(404);
  const [section] = await getDb()
    .select()
    .from(tryoutSections)
    .where(eq(tryoutSections.id, sectionId));
  if (!section) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });
  const result = await importTryoutBatch(section.packageId, body, section.id);
  return { ...result, success: true, imported: result.count, skipped: 0, failed: 0, sectionId };
}
