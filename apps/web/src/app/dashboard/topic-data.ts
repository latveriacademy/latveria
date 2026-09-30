import "server-only";
import { count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";
import { utbkSubtests } from "../../lib/utbk-subtests";

export async function getPracticeTopics() {
  const rows = await getDb().select({ slug: topics.slug, name: topics.name, questionCount: count(questions.id) })
    .from(topics).leftJoin(questions, eq(questions.topicId, topics.id))
    .where(inArray(topics.slug, utbkSubtests.map((subtest) => subtest.slug))).groupBy(topics.id);
  return utbkSubtests.flatMap((subtest) => {
    const row = rows.find((topic) => topic.slug === subtest.slug);
    return row ? [{ ...row, section: subtest.section, short: subtest.short }] : [];
  });
}
