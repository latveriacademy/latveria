import { AppDialog } from "../app-dialog";
import { Button } from "../ui/button";
import styles from "./practice-results-dialog.module.css";

type Props = {
  open: boolean;
  subject: string;
  packageName?: string | null;
  correct: number;
  total: number;
  unanswered: number;
  earnedXP?: number | null;
  score?: number | null;
  scoreLabel?: string;
  averageTimeSeconds?: number | null;
  totalTimeSeconds?: number | null;
  onClose: () => void;
  onExit: () => void;
  exitLabel?: string;
};

export function PracticeResultsDialog({
  open,
  subject,
  packageName,
  correct,
  total,
  unanswered,
  earnedXP,
  score,
  scoreLabel = "Latveria Score",
  averageTimeSeconds,
  totalTimeSeconds,
  onClose,
  onExit,
  exitLabel = "Kembali ke Drilling",
}: Props) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Drilling selesai!"
      description={`${subject}${packageName ? ` · ${packageName}` : ""}`}
    >
      <div className={styles.accuracy}>
        <p>Ketepatan jawaban</p>
        <div>
          <strong>{accuracy}</strong>
          <span>%</span>
        </div>
        <p>
          {correct} dari {total} soal dijawab benar.
        </p>
      </div>
      {score != null && (
        <div className={styles.exp}>
          <span>{scoreLabel}</span>
          <strong>{score} / 1.000</strong>
        </div>
      )}
      <dl className={styles.stats}>
        <div>
          <dt>Benar</dt>
          <dd className={styles.correct}>{correct}</dd>
        </div>
        <div>
          <dt>Salah</dt>
          <dd className={styles.incorrect}>{Math.max(0, total - correct - unanswered)}</dd>
        </div>
        <div>
          <dt>Belum dijawab</dt>
          <dd>{unanswered}</dd>
        </div>
      </dl>
      {averageTimeSeconds != null && averageTimeSeconds > 0 && (
        <div className={styles.exp}>
          <span>Rata-rata waktu per butir</span>
          <strong>
            {averageTimeSeconds >= 60
              ? `${Math.floor(averageTimeSeconds / 60)}m ${averageTimeSeconds % 60}s`
              : `${averageTimeSeconds} dtk`}{" "}
            / butir
          </strong>
        </div>
      )}
      {totalTimeSeconds != null && totalTimeSeconds > 0 && (
        <div className={styles.exp}>
          <span>Total durasi pengerjaan</span>
          <strong>
            {totalTimeSeconds >= 60
              ? `${Math.floor(totalTimeSeconds / 60)}m ${totalTimeSeconds % 60}s`
              : `${totalTimeSeconds} dtk`}
          </strong>
        </div>
      )}
      {earnedXP != null && (
        <div className={styles.exp}>
          <span>EXP diperoleh</span>
          <strong>+{earnedXP} EXP</strong>
        </div>
      )}
      <footer className={styles.footer}>
        <Button variant="outline" onClick={onClose}>
          Lihat pembahasan
        </Button>
        <Button onClick={onExit}>{exitLabel}</Button>
      </footer>
    </AppDialog>
  );
}
