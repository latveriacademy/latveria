import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";

export async function resolvePassages<
  T extends {
    id: string;
    passage?: string | null;
    passageId?: string | null;
    stimulus?: unknown | null;
  },
>(items: T[]): Promise<T[]> {
  const passageMap = new Map<string, string>();
  const stimulusMap = new Map<string, unknown>();
  for (const item of items) {
    const text =
      item.passage ||
      (item.stimulus && typeof item.stimulus === "object" && "passage" in item.stimulus
        ? ((item.stimulus as { passage?: string | null }).passage ?? null)
        : null);
    if (text) passageMap.set(item.id, text);
    if (item.stimulus) stimulusMap.set(item.id, item.stimulus);
  }
  const missing = items
    .filter(
      (item) =>
        (!item.passage || !item.stimulus) &&
        item.passageId &&
        (!passageMap.has(item.passageId) || !stimulusMap.has(item.passageId)),
    )
    .map((item) => item.passageId!);
  if (missing.length > 0) {
    const parentRows = await getDb()
      .select({ id: questions.id, passage: questions.passage, stimulus: questions.stimulus })
      .from(questions)
      .where(inArray(questions.id, missing));
    for (const p of parentRows) {
      const text =
        p.passage ||
        (p.stimulus && typeof p.stimulus === "object" && "passage" in p.stimulus
          ? ((p.stimulus as { passage?: string | null }).passage ?? null)
          : null);
      if (text) passageMap.set(p.id, text);
      if (p.stimulus) stimulusMap.set(p.id, p.stimulus);
    }
  }
  return items.map((item) => ({
    ...item,
    passage:
      item.passage ||
      (item.stimulus && typeof item.stimulus === "object" && "passage" in item.stimulus
        ? ((item.stimulus as { passage?: string | null }).passage ?? null)
        : null) ||
      (item.passageId ? (passageMap.get(item.passageId) ?? null) : null),
    stimulus: (item.stimulus ||
      (item.passageId ? (stimulusMap.get(item.passageId) ?? null) : null)) as T["stimulus"],
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
