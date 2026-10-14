import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Minus } from "lucide-react";
import type { BattleReviewDto } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { PageHeading, Panel } from "../ui/dashboard";
import { QuestionRenderer } from "../question/question-renderer";
import styles from "./battle.module.css";

export function ReviewScreen({ battleId, onBack }: { battleId: string; onBack: () => void }) {
  const [review, setReview] = useState<BattleReviewDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setReview(null);
    setIndex(0);
    api<BattleReviewDto>(`/warrior/battles/${battleId}/review`, { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data.items)) throw new Error("Data pembahasan tidak valid.");
        if (!controller.signal.aborted) setReview(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Pembahasan belum dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [battleId, retry]);
  const item = review?.items[index];
  const correct =
    review?.items.filter((question) => question.selectedAnswer !== null && question.isCorrect)
      .length ?? 0;
  const unanswered =
    review?.items.filter((question) => question.selectedAnswer === null).length ?? 0;
  const wrong = (review?.items.length ?? 0) - correct - unanswered;
  return (
    <div className={styles.screen}>
      <PageHeading
        title="Pembahasan battle"
        description={
          review ? `${correct} benar · ${wrong} salah · ${unanswered} tidak dijawab` : undefined
        }
        actions={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali
          </Button>
        }
      />
      {loading ? (
        <Panel className={styles.panel} role="status">
          Memuat pembahasan…
        </Panel>
      ) : error ? (
        <Panel className={styles.panel}>
          <p className={`${styles.notice} ${styles.error}`} role="alert">
            {error}
          </p>
          <div>
            <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
              Coba lagi
            </Button>
          </div>
        </Panel>
      ) : !item ? (
        <Panel className={styles.panel}>Soal pembahasan belum tersedia.</Panel>
      ) : (
        <div className={styles.stack}>
          <nav className={styles.reviewNav} aria-label="Pilih soal pembahasan">
            {review!.items.map((question, position) => {
              const status =
                question.selectedAnswer === null
                  ? "Tidak dijawab"
                  : question.isCorrect
                    ? "Benar"
                    : "Salah";
              return (
                <button
                  key={question.id}
                  type="button"
                  aria-current={position === index ? "step" : undefined}
                  aria-label={`Soal ${question.position}: ${status}`}
                  className={
                    question.selectedAnswer === null
                      ? styles.navEmpty
                      : question.isCorrect
                        ? styles.navCorrect
                        : styles.navWrong
                  }
                  onClick={() => setIndex(position)}
                >
                  {question.position}
                  {question.selectedAnswer === null ? (
                    <Minus size={14} aria-hidden="true" />
                  ) : question.isCorrect ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <X size={14} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </nav>
          <p className={styles.muted}>
            Soal {item.position} dari {review!.items.length} · Jawabanmu:{" "}
            {item.selectedAnswer === null
              ? "Tidak dijawab"
              : String.fromCharCode(65 + item.selectedAnswer)}{" "}
            · Kunci: {String.fromCharCode(65 + item.correctAnswer)}
          </p>
          <QuestionRenderer
            question={{
              id: item.id,
              prompt: item.prompt,
              options: item.options,
              passage: item.passage,
              stimulus: item.stimulus,
              correctAnswer: item.correctAnswer,
              explanation: item.explanation,
            }}
            answer={
              item.selectedAnswer === null ? null : String.fromCharCode(65 + item.selectedAnswer)
            }
            evaluated
            disabled
            showVerdict
          />
          <div className={styles.actions}>
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((value) => value - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              disabled={index === review!.items.length - 1}
              onClick={() => setIndex((value) => value + 1)}
            >
              Berikutnya
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
