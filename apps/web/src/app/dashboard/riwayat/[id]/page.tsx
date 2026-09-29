import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "../../../../lib/access";
import { getDb } from "../../../../lib/db";
import { practiceAnswers, practiceAttempts, questions, topics } from "../../../../lib/db/schema";
import styles from "../../dashboard.module.css";
import { MathText } from "../../../../components/math-text";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [attempt] = await getDb().select({ id: practiceAttempts.id, topic: topics.name, correct: practiceAttempts.correctCount, total: practiceAttempts.totalCount })
    .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(and(eq(practiceAttempts.id, id), eq(practiceAttempts.userId, user.id)));
  if (!attempt) notFound();
  const answers = await getDb().select({ id: questions.id, prompt: questions.prompt, options: questions.options, correctAnswer: questions.correctAnswer, explanation: questions.explanation, selectedAnswer: practiceAnswers.selectedAnswer, isCorrect: practiceAnswers.isCorrect })
    .from(practiceAnswers).innerJoin(questions, eq(practiceAnswers.questionId, questions.id)).where(eq(practiceAnswers.attemptId, id)).orderBy(questions.id);
  return <section className={styles.result}><Link href="/dashboard/riwayat">← Riwayat</Link><h1>{attempt.topic.replace(" (dummy)", "")}</h1><p className={styles.score}>{attempt.correct} dari {attempt.total} benar</p>{answers.map((answer, index) => <article className={styles.review} key={answer.id}><h2>{index + 1}. <MathText>{answer.prompt}</MathText></h2><p><strong>Jawabanmu:</strong> <MathText>{answer.options[answer.selectedAnswer]}</MathText> <span className={answer.isCorrect ? styles.correct : styles.incorrect}>{answer.isCorrect ? "Benar" : "Salah"}</span></p>{!answer.isCorrect && <p><strong>Jawaban benar:</strong> <MathText>{answer.options[answer.correctAnswer]}</MathText></p>}<div><strong>Pembahasan</strong><p><MathText>{answer.explanation}</MathText></p></div></article>)}</section>;
}
