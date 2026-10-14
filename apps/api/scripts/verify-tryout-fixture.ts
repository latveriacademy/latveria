import assert from "node:assert/strict";
import { inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { questions, questionPackages, tryoutPackageQuestions } from "../src/lib/db/schema";
import { resolvePassages } from "../src/services/tryout/tryout-review.service";

export function tryoutDummyAnswers(
  rows: { id: string; questionType?: string; statements?: { id: string }[] }[],
) {
  return Object.fromEntries(
    rows.map((q) => [
      q.id,
      q.questionType === "true_false_group"
        ? JSON.stringify(Object.fromEntries((q.statements ?? []).map((s) => [s.id, false])))
        : "0",
    ]),
  );
}

export async function createTryoutFixture(topics: { id: string }[]) {
  const db = getDb();
  const source = await db.select().from(questions);
  const selected = topics.map((topic) => source.find((q) => q.topicId === topic.id));
  assert.ok(selected.every(Boolean), "Seed must provide a question for each official subtest.");
  const rows = await resolvePassages(selected.filter((q) => q !== undefined));
  const clones = await db
    .insert(questions)
    .values(rows.map((q) => ({ ...q, id: crypto.randomUUID(), passageId: null })))
    .returning();
  const [pkg] = await db
    .insert(questionPackages)
    .values({
      topicId: topics[0].id,
      name: `Integration Tryout ${crypto.randomUUID()}`,
      isFullTryout: true,
      published: true,
      duration: 195,
      targetQuestions: clones.length,
    })
    .returning();
  await db.insert(tryoutPackageQuestions).values(
    clones.map((q, index) => ({
      packageId: pkg.id,
      questionId: q.id,
      order: index,
      position: index,
    })),
  );
  const after = await db
    .select()
    .from(questions)
    .where(
      inArray(
        questions.id,
        clones.map((q) => q.id),
      ),
    );
  assert.ok(
    clones.every((q) => after.some((row) => row.id === q.id && row.packageId === q.packageId)),
    "Pinning must preserve the original Drilling package membership.",
  );
  return { pkg, questionIds: clones.map((q) => q.id) };
}
