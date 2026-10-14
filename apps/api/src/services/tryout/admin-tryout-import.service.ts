import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  idSchema,
  sectionImportSchema,
  utbkSubtests,
  type ContentBlock,
  type SectionImportInput,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import {
  questionPackages,
  questions,
  topics,
  tryoutPackageQuestions,
  tryoutSections,
} from "../../lib/db/schema";

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

    const passageDefs = new Map<
      string,
      { title?: string; content?: string; blocks?: ContentBlock[] }
    >();
    if (data.passages && data.passages.length > 0) {
      for (const p of data.passages) {
        passageDefs.set(p.externalId, {
          title: p.title,
          content: p.content,
          blocks: p.blocks,
        });
      }
    }
    const passageParentMap = new Map<string, string>();

    let importedCount = 0;
    for (const q of data.questions) {
      const isSingleChoice = q.type === "single_choice" || !q.type;
      const options = isSingleChoice
        ? (q as { options: string[] }).options
        : ["(A)", "(B)", "(C)", "(D)", "(E)"];
      const correctAnswer = isSingleChoice
        ? Number((q as { correctAnswer: number }).correctAnswer ?? 0)
        : 0;

      let qStimulus = q.stimulus ?? null;
      let qPassage = q.passage ?? null;
      let qPassageId: string | null = null;

      if (q.passageId && passageDefs.has(q.passageId)) {
        const pDef = passageDefs.get(q.passageId)!;
        if (!passageParentMap.has(q.passageId)) {
          qPassage =
            pDef.content ??
            (pDef.blocks
              ?.filter((b) => b.type === "text")
              .map((b) => (b as { content: string }).content)
              .join("\n\n") ||
              null);
          qStimulus = {
            title: pDef.title,
            passage: qPassage ?? undefined,
            blocks: pDef.blocks || [],
          };
        } else {
          qPassageId = passageParentMap.get(q.passageId) ?? null;
          qPassage = null;
          qStimulus = null;
        }
      }

      const [insertedQuestion] = await tx
        .insert(questions)
        .values({
          topicId,
          packageId: pkg.id,
          questionType: q.type,
          schemaVersion: data.schemaVersion,
          prompt: q.prompt,
          stimulus: qStimulus,
          passage: qPassage,
          passageId: qPassageId,
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

      if (q.passageId && !passageParentMap.has(q.passageId)) {
        passageParentMap.set(q.passageId, insertedQuestion.id);
      }

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
