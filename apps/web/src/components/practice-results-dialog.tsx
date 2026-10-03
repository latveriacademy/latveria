import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import styles from "./practice-results-dialog.module.css";

type Props = {
  open: boolean; subject: string; packageName?: string | null;
  correct: number; total: number; unanswered: number; earnedXP?: number | null;
  onClose: () => void; onExit: () => void; exitLabel?: string;
};

export function PracticeResultsDialog({ open, subject, packageName, correct, total, unanswered, earnedXP, onClose, onExit, exitLabel = "Kembali ke Drilling" }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="practice-results-title" aria-describedby="practice-results-context" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.content}>
      <header className={styles.header}>
        <div><h2 id="practice-results-title">Drilling selesai!</h2><p id="practice-results-context">{subject}{packageName ? ` · ${packageName}` : ""}</p></div>
        <Button variant="ghost" size="icon" aria-label="Tutup hasil drilling" onClick={onClose}><X /></Button>
      </header>
      <div className={styles.accuracy}>
        <p>Ketepatan jawaban</p>
        <div><strong>{accuracy}</strong><span>%</span></div>
        <p>{correct} dari {total} soal dijawab benar.</p>
      </div>
      <dl className={styles.stats}>
        <div><dt>Benar</dt><dd className={styles.correct}>{correct}</dd></div>
        <div><dt>Salah</dt><dd className={styles.incorrect}>{Math.max(0, total - correct - unanswered)}</dd></div>
        <div><dt>Belum dijawab</dt><dd>{unanswered}</dd></div>
      </dl>
      {earnedXP != null && <div className={styles.exp}><span>EXP diperoleh</span><strong>+{earnedXP} EXP</strong></div>}
      <footer className={styles.footer}>
        <Button variant="outline" onClick={onClose}>Lihat pembahasan</Button>
        <Button onClick={onExit}>{exitLabel}</Button>
      </footer>
    </div>
  </dialog>;
}
