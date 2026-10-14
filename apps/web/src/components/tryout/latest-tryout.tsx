import { Link } from "react-router";
import { ArrowUpRight, History } from "lucide-react";
import type { TryoutHistoryEntry } from "@latveria/shared";
import { Panel } from "../ui/dashboard";
import { Button } from "../ui/button";
import {
  formatTryoutDate,
  formatTryoutScore,
  tryoutResultPath,
  tryoutScoreLabel,
} from "../../lib/tryout/tryout-results";
import styles from "./latest-tryout.module.css";

export function LatestTryout({
  entry,
  loading,
  error,
  onRetry,
  onHistory,
}: {
  entry?: TryoutHistoryEntry;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onHistory?: () => void;
}) {
  if (!entry && !loading && !error) return null;
  return (
    <Panel className={styles.panel} aria-label="Tryout terakhir">
      {entry ? (
        <>
          <div className={styles.information}>
            <h2>
              <History size={16} />
              Tryout terakhir
            </h2>
            <h3>{entry.name}</h3>
            <p>
              {formatTryoutDate(entry.completedAt)} ·{" "}
              {tryoutScoreLabel(entry.method, entry.isCompleteUtbk)}
            </p>
            <div className={styles.actions}>
              <Button asChild size="sm" variant="outline">
                <Link to={tryoutResultPath(entry.id)}>
                  Lihat hasil
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
              {onHistory ? (
                <Button size="sm" variant="ghost" onClick={onHistory}>
                  Semua riwayat
                </Button>
              ) : (
                <Button asChild size="sm" variant="ghost">
                  <Link to="/dashboard?tab=tryout&history=1">Semua riwayat</Link>
                </Button>
              )}
            </div>
          </div>
          <div className={styles.value}>
            <span>Skor terakhir</span>
            <strong>{formatTryoutScore(entry.score)}</strong>
            <span>{entry.score === null ? "Belum tersedia" : "/ 1.000"}</span>
          </div>
        </>
      ) : loading ? (
        <p role="status">Memuat hasil Tryout terakhir…</p>
      ) : null}
      {error && (
        <div role="alert" className={styles.error}>
          <p>Hasil Tryout terakhir belum dapat diperbarui. {error}</p>
          <Button size="sm" variant="outline" onClick={onRetry} disabled={loading}>
            Coba lagi
          </Button>
        </div>
      )}
    </Panel>
  );
}
