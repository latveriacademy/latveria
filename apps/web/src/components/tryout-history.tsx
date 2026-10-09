import type { TryoutHistoryEntry } from "@latveria/shared";
import { formatTryoutDate, formatTryoutScore, tryoutScoreLabel } from "../lib/tryout-results";
import { PageHeading, Panel } from "./ui/dashboard";
import { Button } from "./ui/button";
export function TryoutHistory({
  onBack,
  onOpen,
  rows,
  loading,
  error,
  onReload,
}: {
  onBack: () => void;
  onOpen: (id: string) => void;
  rows: TryoutHistoryEntry[];
  loading: boolean;
  error: string;
  onReload: () => void;
}) {
  return (
    <div className="latveria-view-container space-y-5">
      <PageHeading
        title="Riwayat Tryout"
        description="Buka hasil tersimpan tanpa membuat sesi atau memberikan EXP lagi."
        actions={
          <Button variant="outline" onClick={onBack}>
            Battle World
          </Button>
        }
      />
      <Panel>
        {loading ? (
          <p role="status">Memuat riwayat…</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={onReload}>Coba lagi</Button>
          </div>
        ) : !rows.length ? (
          <p>Belum ada Tryout yang selesai.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--edge)] py-4"
              >
                <div>
                  <strong>{row.name}</strong>
                  <p className="text-sm text-[var(--soft-ink)]">
                    {formatTryoutDate(row.completedAt)} · {formatTryoutScore(row.score)}/1.000 ·{" "}
                    {tryoutScoreLabel(row.method, row.isCompleteUtbk)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => onOpen(row.id)}>
                  Buka hasil
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
