import { eq, inArray } from "drizzle-orm";
import { getDb } from "../lib/db";
import { questions, topics } from "../lib/db/schema";

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
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
