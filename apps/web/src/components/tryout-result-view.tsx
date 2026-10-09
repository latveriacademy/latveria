import { ArrowLeft, BookOpen, CheckCircle2, History } from "lucide-react";
import type { TryoutSessionState } from "./tryout-workspace";
import { PageHeading, Panel } from "./ui/dashboard";
import { Button } from "./ui/button";
import { TryoutScoreReport } from "./tryout-score-report";
import { formatTryoutDate } from "../lib/tryout-results";
import styles from "./tryout-results.module.css";

export function TryoutResultView({
  data,
  onBack,
  onReview,
  onHistory,
}: {
  data: TryoutSessionState;
  onBack: () => void;
  onReview: () => void;
  onHistory: () => void;
}) {
  return (
    <div className={`latveria-view-container ${styles.page}`}>
      <PageHeading
        title="Hasil Tryout"
        description={data.package.name}
        actions={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} />
            Daftar Tryout
          </Button>
        }
      />
      <div className={styles.resultMeta}>
        <span className={styles.saved}>
          <CheckCircle2 size={16} />
          Selesai · hasil tersimpan
        </span>
        <span>{formatTryoutDate(data.session.completedAt)}</span>
      </div>
      <Panel className={styles.resultPanel}>
        {data.score ? (
          <TryoutScoreReport report={data.score} />
        ) : (
          <p>Nilai belum tersedia. Jawabanmu sudah tersimpan dan dapat ditinjau.</p>
        )}
      </Panel>
      <footer className={styles.resultFooter}>
        <p>Skor simulasi latveriacademy, bukan skor resmi atau prediksi skor UTBK.</p>
        <div className={styles.resultActions}>
          <Button variant="outline" onClick={onHistory}>
            <History size={16} />
            Riwayat Tryout
          </Button>
          {!!data.reviewQuestions?.length && (
            <Button onClick={onReview}>
              <BookOpen size={16} />
              Tinjau jawaban
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
