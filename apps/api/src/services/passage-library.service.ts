import { and, count, desc, eq, ilike } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { PassageLibraryDetail, PassageLibraryInput } from "@latveria/shared";
import { getDb } from "../lib/db";
import { passages, questions, topics } from "../lib/db/schema";

export async function getPassageLibrary(query: {
  cari?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
}) {
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 15));
  const offset = (page - 1) * limit;

  const where = and(
    query.cari ? ilike(passages.title, `%${query.cari.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
    query.isArchived !== undefined ? eq(passages.isArchived, query.isArchived) : undefined,
  );

  const [[totalRes], rows] = await Promise.all([
    db.select({ value: count() }).from(passages).where(where),
    db
      .select({
        id: passages.id,
        title: passages.title,
        content: passages.content,
        tags: passages.tags,
        isArchived: passages.isArchived,
        createdAt: passages.createdAt,
        updatedAt: passages.updatedAt,
      })
      .from(passages)
      .where(where)
      .orderBy(desc(passages.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRes?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  // Compute question counts for each passage
  const results = await Promise.all(
    rows.map(async (row) => {
      const [usageRes] = await db
        .select({ value: count() })
        .from(questions)
        .where(eq(questions.passageId, row.id));

      return {
        ...row,
        usedInQuestionsCount: Number(usageRes?.value ?? 0),
        usedInQuestions: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }),
  );

  return {
    rows: results,
    total,
    page,
    pageCount,
  };
}

export async function getPassageDetail(id: string): Promise<PassageLibraryDetail> {
  const db = getDb();
  const [row] = await db.select().from(passages).where(eq(passages.id, id));
  if (!row) throw new HTTPException(404, { message: "Passage tidak ditemukan." });

  const linkedQuestions = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      subtest: topics.name,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .where(eq(questions.passageId, id));

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags,
    isArchived: row.isArchived,
    usedInQuestionsCount: linkedQuestions.length,
    usedInQuestions: linkedQuestions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPassage(input: PassageLibraryInput, actorId: string) {
  const db = getDb();
  const [created] = await db
    .insert(passages)
    .values({
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      isArchived: input.isArchived ?? false,
      authorId: actorId,
    })
    .returning();

  return created;
}

export async function updatePassage(
  id: string,
  input: Partial<PassageLibraryInput>,
  actorId: string,
) {
  const db = getDb();
  const [existing] = await db.select().from(passages).where(eq(passages.id, id));
  if (!existing) throw new HTTPException(404, { message: "Passage tidak ditemukan." });

  const [updated] = await db
    .update(passages)
    .set({
      title: input.title ?? existing.title,
      content: input.content !== undefined ? input.content : existing.content,
      tags: input.tags ?? existing.tags,
      isArchived: input.isArchived !== undefined ? input.isArchived : existing.isArchived,
      authorId: actorId,
      updatedAt: new Date(),
    })
    .where(eq(passages.id, id))
    .returning();

  return updated;
}

export async function deletePassage(id: string) {
  const db = getDb();
  const [usageRes] = await db
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.passageId, id));

  const usageCount = Number(usageRes?.value ?? 0);
  if (usageCount > 0) {
    throw new HTTPException(409, {
      message: `Passage masih digunakan oleh ${usageCount} soal. Lepaskan relasi soal terlebih dahulu atau arsipkan passage.`,
    });
  }

  await db.delete(passages).where(eq(passages.id, id));
  return { success: true };
}
