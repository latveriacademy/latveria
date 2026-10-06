import { eq, inArray } from "drizzle-orm";
import { getDb } from "../lib/db";
import { questions, topics } from "../lib/db/schema";

export async function resolvePassages<
  T extends { id: string; passage?: string | null; passageId?: string | null },
>(items: T[]): Promise<T[]> {
  const passageMap = new Map<string, string>();
  for (const item of items) {
    if (item.passage) passageMap.set(item.id, item.passage);
  }
  const missing = items
    .filter((item) => !item.passage && item.passageId && !passageMap.has(item.passageId))
    .map((item) => item.passageId!);
  if (missing.length > 0) {
    const parentRows = await getDb()
      .select({ id: questions.id, passage: questions.passage })
      .from(questions)
      .where(inArray(questions.id, missing));
    for (const p of parentRows) {
      if (p.passage) passageMap.set(p.id, p.passage);
    }
  }
  return items.map((item) => ({
    ...item,
    passage: item.passage || (item.passageId ? (passageMap.get(item.passageId) ?? null) : null),
  }));
}

export async function getCompletedTryoutQuestions(questionSets: string) {
  const ids = Object.values(JSON.parse(questionSets) as Record<string, string[]>).flat();
  if (!ids.length) return [];
  const rows = await getDb()
    .select({
      id: questions.id,
      prompt: questions.prompt,
      questionType: questions.questionType,
      stimulus: questions.stimulus,
      passage: questions.passage,
      passageId: questions.passageId,
      statements: questions.statements,
      scoringConfig: questions.scoringConfig,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      annotations: questions.annotations,
      topic: topics.name,
      slug: topics.slug,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .where(inArray(questions.id, ids));
  const resolved = await resolvePassages(rows);
  const byId = new Map(resolved.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
