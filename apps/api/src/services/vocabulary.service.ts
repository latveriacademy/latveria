import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  createVocabularySchema,
  idSchema,
  saveVocabularySchema,
  type LexiconAnnotation,
} from "@latveria/shared";
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

export async function createDirectVocabulary(userId: string, body: unknown) {
  const parsed = createVocabularySchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Kosakata tidak valid.";
    throw new HTTPException(400, { message: errorMsg });
  }
  const data = parsed.data;
  const annotationId = crypto.randomUUID();
  const annotation: LexiconAnnotation = {
    id: annotationId,
    term: data.term,
    start: 0,
    end: data.term.length,
    definition: data.definition,
    partOfSpeech: data.partOfSpeech,
    phonetic: data.phonetic ?? "",
    context: data.context || `${data.term}: ${data.definition}`,
    example: data.example ?? "",
    etymology: data.etymology ?? "",
    synonyms: data.synonyms ?? [],
  };

  const [saved] = await getDb()
    .insert(learnerVocabulary)
    .values({
      userId,
      questionId: null,
      annotationId,
      annotation,
      source: data.source || "Kosakata LBE",
    })
    .returning();

  return {
    id: saved.id,
    annotationId: saved.annotationId,
    annotation: saved.annotation,
    source: saved.source,
    savedAt: saved.savedAt.toISOString(),
  };
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

export async function adminListVocabulary(options?: { limit?: number }) {
  const limit = Math.min(options?.limit ?? 50, 100);
  const rows = await getDb()
    .select()
    .from(learnerVocabulary)
    .orderBy(desc(learnerVocabulary.savedAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    savedAt: row.savedAt.toISOString(),
  }));
}

export async function adminDeleteVocabulary(idParam: string) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404);
  const deleted = await getDb()
    .delete(learnerVocabulary)
    .where(eq(learnerVocabulary.id, id.data))
    .returning({ id: learnerVocabulary.id });
  if (!deleted.length) throw new HTTPException(404, { message: "Kosakata tidak ditemukan." });
  return { success: true };
}
