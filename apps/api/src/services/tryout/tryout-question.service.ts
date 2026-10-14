import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  idSchema,
  sectionImportQuestionSchema,
  type AdminTryoutSectionDetail,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import {
  questionPackages,
  questions,
  tryoutSections,
  tryoutPackageQuestions,
} from "../../lib/db/schema";
import { getAdminTryout } from "./admin-tryout.service";
import { protectPassageSources, validatePassage } from "../question/question-passage";
import { invalidateCatalogCache } from "../topic.service";

export async function getAdminTryoutSection(
  packageId: string,
  sectionId: string,
): Promise<AdminTryoutSectionDetail> {
  if (!idSchema.safeParse(sectionId).success) throw new HTTPException(404);
  const detail = await getAdminTryout(packageId);
  const section = detail.sections.find((s) => s.id === sectionId);
  if (!section)
    throw new HTTPException(404, { message: "Subtes tidak ditemukan pada Tryout ini." });
  return { tryout: { id: detail.id, name: detail.name, published: detail.published }, section };
}

export async function updateTryoutQuestion(
  packageId: string,
  sectionId: string,
  questionId: string,
  body: unknown,
) {
  if (![packageId, sectionId, questionId].every((id) => idSchema.safeParse(id).success))
    throw new HTTPException(404);
  const parsed = sectionImportQuestionSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: `Periksa ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
    });
  const input = parsed.data;
  await getDb().transaction(async (tx) => {
    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .for("update");
    if (!pkg) throw new HTTPException(404);
    const [link] = await tx
      .select()
      .from(tryoutPackageQuestions)
      .where(
        and(
          eq(tryoutPackageQuestions.packageId, packageId),
          eq(tryoutPackageQuestions.sectionId, sectionId),
          eq(tryoutPackageQuestions.questionId, questionId),
        ),
      );
    const [section] = await tx
      .select()
      .from(tryoutSections)
      .where(and(eq(tryoutSections.id, sectionId), eq(tryoutSections.packageId, packageId)));
    if (!link || !section)
      throw new HTTPException(404, { message: "Soal tidak ditemukan pada subtes ini." });
    const [existing] = await tx
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .for("update");
    if (!existing) throw new HTTPException(404);
    if (input.type !== existing.questionType)
      throw new HTTPException(400, { message: "Jenis soal tidak dapat diubah melalui edit ini." });
    if (input.annotations.length && section.subtestCode !== "EN")
      throw new HTTPException(400, { message: "Lexicon hanya tersedia pada LBE." });
    await validatePassage(tx, { ...existing, passageId: input.passageId }, questionId, {
      packageId,
      sectionId,
    });
    if (
      (existing.passage || existing.stimulus?.passage) &&
      (!(input.passage || input.stimulus?.passage) || input.passageId)
    )
      await protectPassageSources(tx, [questionId]);
    await tx
      .update(questions)
      .set({
        prompt: input.prompt,
        passageId: input.passageId ?? null,
        passage: input.passageId ? null : (input.passage ?? null),
        annotations: input.annotations,
        stimulus: input.stimulus
          ? {
              ...input.stimulus,
              ...(input.passage || input.passageId ? { passage: undefined } : {}),
            }
          : null,
        explanation: input.explanation,
        source: input.source,
        category: input.category ?? null,
        itemWeight: input.itemWeight,
        calculatorAllowed: input.calculatorAllowed,
        ...(input.type === "single_choice"
          ? { options: input.options, correctAnswer: input.correctAnswer }
          : { statements: input.statements, scoringConfig: input.scoring }),
      })
      .where(eq(questions.id, questionId));
  });
  invalidateCatalogCache();
  return { id: questionId };
}

export async function deleteScopedTryoutSection(packageId: string, sectionId: string) {
  if (![packageId, sectionId].every((id) => idSchema.safeParse(id).success))
    throw new HTTPException(404);
  await getDb().transaction(async (tx) => {
    await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .for("update");
    const removed = await tx
      .delete(tryoutSections)
      .where(and(eq(tryoutSections.id, sectionId), eq(tryoutSections.packageId, packageId)))
      .returning({ id: tryoutSections.id });
    if (!removed.length)
      throw new HTTPException(404, { message: "Subtes tidak ditemukan pada Tryout ini." });
  });
  invalidateCatalogCache();
  return { success: true };
}
