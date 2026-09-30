import "server-only";
import { count, eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";

export async function getPracticeTopics() {
  return getDb().select({ slug: topics.slug, name: topics.name, description: topics.description, questionCount: count(questions.id) })
    .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id).orderBy(topics.name);
}
