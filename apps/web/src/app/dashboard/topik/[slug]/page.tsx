import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../../lib/db";
import { questions, topics } from "../../../../lib/db/schema";
import styles from "../../dashboard.module.css";
import { submitPractice } from "./actions";
import { MathText } from "../../../../components/math-text";

export const metadata: Metadata = { title: "Latsol | Latveria" };

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const [topic] = await getDb().select().from(topics).where(eq(topics.slug, slug));
  if (!topic) notFound();
  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options }).from(questions).where(eq(questions.topicId, topic.id)).orderBy(questions.id);
  const action = submitPractice.bind(null, slug);
  return <section className={styles.practice}><Link href="/dashboard/topik">← Topik</Link><h1>{topic.name.replace(" (dummy)", "")}</h1><p>{items.length} soal. Semua soal harus dijawab sebelum dikumpulkan.</p>
    {(await searchParams).error && <p className={styles.error} role="alert">Jawab semua soal terlebih dahulu.</p>}
    <form action={action}>{items.map((item, index) => <fieldset className={styles.question} key={item.id}><legend>{index + 1}. <MathText>{item.prompt}</MathText></legend>{item.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`answer-${item.id}`} value={optionIndex} required /> <span><MathText>{option}</MathText></span></label>)}</fieldset>)}<button className={styles.primary}>Kumpulkan jawaban</button></form>
  </section>;
}
