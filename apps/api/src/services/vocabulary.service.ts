import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { idSchema, saveVocabularySchema } from "@latveria/shared";
import { getDb } from "../lib/db";
import { learnerVocabulary, questions, topics } from "../lib/db/schema";

export async function listVocabulary(userId: string) {
  const rows = await getDb()
    .select()
    .from(learnerVocabulary)
    .where(eq(learnerVocabulary.userId, userId))
    .orderBy(desc(learnerVocabulary.savedAt));
  return rows.map(({ userId: _userId, ...row }) => ({
    ...row,
    savedAt: row.savedAt.toISOString(),
  }));
}

export async function saveVocabulary(userId: string, body: unknown) {
  const parsed = saveVocabularySchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: "Kosakata tidak valid." });
  const { questionId, annotationId } = parsed.data;
  return getDb().transaction(async (tx) => {
    const [question] = await tx
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .for("share");
    if (!question) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
    const [topic] = await tx.select().from(topics).where(eq(topics.id, question.topicId));
    const annotation = question.annotations.find((item) => item.id === annotationId);
    if (topic?.slug !== "literasi-bahasa-inggris" || !annotation)
      throw new HTTPException(404, {
        message: "Anotasi kosakata tidak ditemukan. Muat ulang soal.",
      });
    await tx
      .insert(learnerVocabulary)
      .values({ userId, questionId, annotationId, annotation, source: question.source })
      .onConflictDoNothing({
        target: [
          learnerVocabulary.userId,
          learnerVocabulary.questionId,
          learnerVocabulary.annotationId,
        ],
      });
    const [saved] = await tx
      .select()
      .from(learnerVocabulary)
      .where(
        and(
          eq(learnerVocabulary.userId, userId),
          eq(learnerVocabulary.questionId, questionId),
          eq(learnerVocabulary.annotationId, annotationId),
        ),
      );
    return { id: saved.id, annotationId: saved.annotationId };
  });
}

export async function deleteVocabulary(userId: string, idParam: string) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404);
  const deleted = await getDb()
    .delete(learnerVocabulary)
    .where(and(eq(learnerVocabulary.id, id.data), eq(learnerVocabulary.userId, userId)))
    .returning({ id: learnerVocabulary.id });
  if (!deleted.length) throw new HTTPException(404, { message: "Kosakata tidak ditemukan." });
  return { success: true };
}
