import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { MathText } from "../../../../components/math-text";
import { getDb } from "../../../../lib/db";
import { practiceAnswers, questions, topics } from "../../../../lib/db/schema";
import { utbkSubtests } from "../../../../lib/utbk-subtests";
import { DeleteQuestionForm, BackToQuestionList } from "../../question-actions";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Pratinjau soal | Latveria Admin" };

export default async function QuestionPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item] = await getDb().select({
    id: questions.id, prompt: questions.prompt, options: questions.options,
    correctAnswer: questions.correctAnswer, explanation: questions.explanation,
    category: questions.category, source: questions.source, topic: topics.name, slug: topics.slug,
  }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(eq(questions.id, id));
  if (!item) notFound();
  const subtest = utbkSubtests.find((test) => test.slug === item.slug);
  const [usage] = await getDb().select({ value: count() }).from(practiceAnswers).where(eq(practiceAnswers.questionId, item.id));
  return <>
    <header className={styles.pageHeader}><div><p>{subtest?.name ?? item.topic}{item.category ? ` / ${item.category}` : ""}</p><h1>Pratinjau soal</h1></div><BackToQuestionList subtest={item.slug} /></header>
    <article className={styles.preview} aria-label="Hasil render soal seperti tampilan pengguna">
      <div className={styles.previewHeader}><span>Pertanyaan</span><span>{item.source}</span></div>
      <div className={styles.previewPrompt}><MathText>{item.prompt}</MathText></div>
      <ol className={styles.previewOptions}>{item.options.map((option, index) => <li className={index === item.correctAnswer ? styles.correctOption : undefined} key={`${index}-${option}`}><span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span><span className={styles.optionText}><MathText>{option}</MathText></span>{index === item.correctAnswer && <strong>Kunci jawaban</strong>}</li>)}</ol>
      <section className={styles.previewExplanation}><h2>Pembahasan</h2><p><MathText>{item.explanation}</MathText></p></section>
    </article>
    <div className={styles.previewActions}><BackToQuestionList subtest={item.slug} />{usage.value === 0 ? <DeleteQuestionForm id={item.id} /> : <p className={styles.usedQuestion}>Soal sudah digunakan pada {usage.value} jawaban peserta dan tidak dapat dihapus.</p>}</div>
  </>;
}
