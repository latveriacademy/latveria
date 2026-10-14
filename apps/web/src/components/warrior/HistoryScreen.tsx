import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { BattleSummaryDto } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { PageHeading, Panel } from "../ui/dashboard";
import styles from "./battle.module.css";

export function HistoryScreen({
  onBack,
  onReview,
}: {
  onBack: () => void;
  onReview?: (battleId: string) => void;
}) {
  const [history, setHistory] = useState<BattleSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<BattleSummaryDto[]>("/warrior/history", { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data riwayat tidak valid.");
        if (!controller.signal.aborted) setHistory(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Riwayat belum dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <div className={styles.screen}>
      <PageHeading
        title="Riwayat Warrior Battle"
        actions={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali
          </Button>
        }
      />
      {loading ? (
        <Panel className={styles.panel} role="status">
          <p className={styles.muted}>Memuat riwayat battle…</p>
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
      ) : !history.length ? (
        <Panel className={styles.panel}>
          <p>Belum ada battle yang selesai.</p>
          <p className={styles.muted}>Hasil pertandingan akan muncul di sini.</p>
        </Panel>
      ) : (
        <ol className={styles.list} aria-label="Riwayat pertandingan">
          {history.map((item) => {
            const first =
              item.teams.find((team) => team.teamNumber === item.myTeamNumber) ??
              item.teams.find((team) => team.teamNumber === 1);
            const second = item.teams.find((team) => team.id !== first?.id);
            const duel = item.mode === "1v1";
            return (
              <li key={item.id}>
                <Panel className={styles.panel}>
                  <div className={styles.historyRow}>
                    <div className={styles.historyMeta}>
                      <h2>
                        {duel ? "Duel 1 vs 1" : "Battle tim 2 vs 2"} · {item.questionCount} soal
                      </h2>
                      <span className={item.isWinner ? styles.ready : styles.muted}>
                        {item.isDraw
                          ? duel
                            ? "Duel seri"
                            : "Tim seri"
                          : item.isWinner
                            ? duel
                              ? "Kamu menang"
                              : "Tim kamu menang"
                            : duel
                              ? "Kamu kalah"
                              : "Tim kamu kalah"}{" "}
                        · {item.code}
                      </span>
                      <time className={styles.date} dateTime={item.endedAt ?? item.createdAt}>
                        {new Date(item.endedAt ?? item.createdAt).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        WIB
                      </time>
                    </div>
                    <div className={styles.historyMeta}>
                      <strong className={styles.historyScore}>
                        {first?.score ?? 0} – {second?.score ?? 0}
                      </strong>
                      <span className={styles.muted}>
                        {item.myTeamNumber
                          ? duel
                            ? "Poin kamu – lawan"
                            : "Poin tim kamu – tim lawan"
                          : duel
                            ? "Poin pemain 1 – pemain 2"
                            : "Poin Tim 1 – Tim 2"}
                      </span>
                    </div>
                  </div>
                  {onReview && (
                    <div>
                      <Button variant="outline" onClick={() => onReview(item.id)}>
                        Lihat pembahasan
                      </Button>
                    </div>
                  )}
                </Panel>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
