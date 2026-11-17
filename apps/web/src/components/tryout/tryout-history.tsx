import { useState } from "react";
import { Award, Trash2 } from "lucide-react";
import type { TryoutHistoryEntry } from "@latveria/shared";
import {
  formatTryoutDate,
  formatTryoutScore,
  tryoutScoreLabel,
} from "../../lib/tryout/tryout-results";
import { PageHeading, Panel } from "../ui/dashboard";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../confirm-dialog";

export function TryoutHistory({
  onBack,
  onOpen,
  rows,
  loading,
  error,
  onReload,
  onDelete,
}: {
  onBack: () => void;
  onOpen: (id: string) => void;
  rows: TryoutHistoryEntry[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [pendingDelete, setPendingDelete] = useState<TryoutHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleConfirmDelete = async () => {
    if (!pendingDelete || !onDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus riwayat tryout.");
    } finally {
      setDeleting(false);
    }
  };

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
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/learner/tryouts/${row.id}/certificate.pdf`}
                    download
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] shadow-sm hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
                    title="Unduh Sertifikat PDF"
                  >
                    <Award size={14} />
                    Sertifikat
                  </a>
                  <Button variant="outline" onClick={() => onOpen(row.id)}>
                    Buka hasil
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeleteError("");
                        setPendingDelete(row);
                      }}
                      title="Hapus riwayat ini"
                      className="text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Hapus riwayat tryout?"
        description={`"${pendingDelete?.name ?? ""}" akan dihapus permanen dari riwayatmu. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus permanen"
        pending={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
