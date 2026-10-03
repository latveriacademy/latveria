import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../lib/db";
import { questionPackages, questions, topics } from "../lib/db/schema";
import { invalidateCatalogCache } from "./topic.service";

export async function createAdminTryout(body: unknown) {
  const b = body as {
    name?: string;
    topicId?: string;
    isFullTryout?: boolean;
    targetQuestions?: number;
    questions?: unknown[];
    description?: string;
    category?: string;
    duration?: number;
    published?: boolean;
    order?: number;
  };
  if (!b || !b.name || !b.topicId) {
    throw new HTTPException(400, { message: "Nama tryout dan subtes wajib diisi." });
  }

  const [topic] = await getDb().select().from(topics).where(eq(topics.id, b.topicId));
  if (!topic) throw new HTTPException(404, { message: "Subtes tidak ditemukan." });

  const isFullTryout = Boolean(b.isFullTryout);
  const targetQuestions = Number(b.targetQuestions || (isFullTryout ? 160 : 30));

  const questionsList = Array.isArray(b.questions) ? b.questions : [];
  if (isFullTryout && questionsList.length > 0 && questionsList.length !== targetQuestions) {
    throw new HTTPException(400, {
      message: `Full Tryout memerlukan tepat ${targetQuestions} soal (saat ini ${questionsList.length} soal).`,
    });
  }

  const [pkg] = await getDb()
    .insert(questionPackages)
    .values({
      topicId: topic.id,
      name: b.name,
      description: b.description ?? "Tryout Standar SNPMB / Ujian Mandiri",
      packageType: "Tryout",
      category: b.category || "utbk",
      duration: Number(b.duration || (isFullTryout ? 195 : 30)),
      isFullTryout,
      targetQuestions,
      published: b.published !== false,
      order: Number(b.order || 1),
      isActive: true,
    })
    .returning();

  if (questionsList.length > 0) {
    type QuestionInput = {
      prompt: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      source?: string;
      category?: string;
      itemWeight?: number;
      calculatorAllowed?: boolean;
      order?: number;
      subtestOrder?: number;
    };
    await getDb()
      .insert(questions)
      .values(
        (questionsList as QuestionInput[]).map((q, idx: number) => ({
          topicId: topic.id,
          packageId: pkg.id,
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "Pembahasan terstandar.",
          source: q.source || "Tryout Latveria",
          category: q.category || topic.name,
          itemWeight: q.itemWeight ?? 100,
          calculatorAllowed: Boolean(q.calculatorAllowed),
          order: q.order ?? idx + 1,
          subtestOrder: q.subtestOrder ?? 1,
        })),
      );
  }

  invalidateCatalogCache();
  return {
    ...pkg,
    questionCount: questionsList.length,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}
