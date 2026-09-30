import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../../lib/db";
import { questions, topics } from "../../../../lib/db/schema";
import styles from "../../dashboard.module.css";
import { submitPractice } from "./actions";
import { QuestionFlow } from "../../question-flow";

export const metadata: Metadata = { title: "Latsol | Latveria" };

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, slug));
  if (!topic) notFound();
  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options }).from(questions).where(eq(questions.topicId, topic.id)).orderBy(questions.id);
  const action = submitPractice.bind(null, slug);
  return <section className={styles.practice}><Link href="/dashboard/topik">← Subtes</Link><h1>{topic.name}</h1><p>{items.length} soal</p>
    {(await searchParams).error && <p className={styles.error} role="alert">Pilih jawaban untuk setiap soal sebelum dikumpulkan.</p>}
    <QuestionFlow mode="attempt" items={items} action={action} />
  </section>;
}
