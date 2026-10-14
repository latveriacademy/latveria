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
