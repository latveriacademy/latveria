"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser } from "../../../../lib/access";
import { getDb } from "../../../../lib/db";
import { practiceAnswers, practiceAttempts, questions, topics } from "../../../../lib/db/schema";

export async function submitPractice(slug: string, form: FormData) {
  const user = await requireUser();
  const db = getDb();
  const rows = await db.select({ id: questions.id, answer: questions.correctAnswer, topicId: topics.id })
    .from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(eq(topics.slug, slug));
  if (!rows.length) redirect("/dashboard/topik");
  const ids = rows.map((row) => row.id);
  const submitted = ids.map((id) => ({ id, selected: Number(form.get(`answer-${id}`)) }));
  if (submitted.some((answer) => !Number.isInteger(answer.selected) || answer.selected < 0 || answer.selected > 3)) redirect(`/dashboard/topik/${slug}?error=jawaban`);
  const stored = await db.select({ id: questions.id }).from(questions).where(and(eq(questions.topicId, rows[0].topicId), inArray(questions.id, ids)));
  if (stored.length !== ids.length) redirect("/dashboard/topik");
  const correct = submitted.filter((answer) => rows.find((row) => row.id === answer.id)?.answer === answer.selected).length;
  const [attempt] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(practiceAttempts).values({ userId: user.id, topicId: rows[0].topicId, correctCount: correct, totalCount: rows.length }).returning({ id: practiceAttempts.id });
    await tx.insert(practiceAnswers).values(submitted.map((answer) => ({ attemptId: inserted[0].id, questionId: answer.id, selectedAnswer: answer.selected, isCorrect: rows.find((row) => row.id === answer.id)?.answer === answer.selected ? 1 : 0 })));
    return inserted;
  });
  redirect(`/dashboard/riwayat/${attempt.id}`);
}
