import { useState, useEffect } from "react";
import { AlertCircle, Archive, Box, CheckCircle, Layers, Loader2, Trash2 } from "lucide-react";
import type { QuestionUsageMap } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";
import { ConfirmDialog } from "../../../components/confirm-dialog";

export function QuestionUsageDialog({
  questionId,
  open,
  onOpenChange,
  onDeleted,
}: {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<QuestionUsageMap | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrorMsg(null);
    api<QuestionUsageMap>(`/admin/questions/${questionId}/usage-map`)
      .then((data) => setUsage(data))
      .catch((err: Error) => setErrorMsg(err.message || "Gagal memuat peta dependensi soal."))
      .finally(() => setLoading(false));
  }, [questionId, open]);

  const handleDelete = async () => {
    setActionPending(true);
    try {
      await api(`/admin/questions/${questionId}/safe`, { method: "DELETE" });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus soal.";
      setErrorMsg(msg);
    } finally {
      setActionPending(false);
    }
  };

  const handleArchive = async () => {
    setActionPending(true);
    try {
      await api("/admin/questions/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          questionIds: [questionId],
          action: "archive",
        }),
      });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengarsipkan soal.";
      setErrorMsg(msg);
    } finally {
      setActionPending(false);
    }
  };

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Peta Dependensi & Keamanan Soal"
        className="max-w-[560px]"
      >
        {loading && (
          <div className="flex items-center justify-center py-8 text-[var(--soft-ink)]">
            <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
          </div>
        )}

        {errorMsg && (
          <div className="my-2 rounded border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-xs text-[var(--error)]">
            {errorMsg}
          </div>
        )}

        {!loading && usage && (
          <div className="space-y-4 py-2 text-xs">
            {/* Safety status banner */}
            {usage.canDeletePermanently ? (
              <div className="flex items-start gap-2 rounded border border-[var(--emerald-border)] bg-[var(--emerald-surface)] p-3 text-[var(--emerald)]">
                <CheckCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Aman untuk Dihapus Permanen</strong>
                  <p className="text-[11px] text-[var(--ink)]">
                    Soal ini belum memiliki riwayat jawaban dari peserta dan tidak sedang dipakai
                    pada sesi tryout aktif.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded border border-[var(--gold-border)] bg-[var(--gold-surface)] p-3 text-[var(--gold)]">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">
                    Dilindungi: Tidak Dapat Dihapus Permanen
                  </strong>
                  <p className="text-[11px] text-[var(--ink)]">{usage.cannotDeleteReason}</p>
                </div>
              </div>
            )}

            {/* Dependensi overview */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5">
                <span className="text-[var(--soft-ink)]">Jawaban Latihan:</span>
                <p className="text-base font-bold font-mono text-[var(--ink)]">
                  {usage.practiceAttemptsCount}
                </p>
              </div>
              <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5">
                <span className="text-[var(--soft-ink)]">Jawaban Tryout:</span>
                <p className="text-base font-bold font-mono text-[var(--ink)]">
                  {usage.tryoutResponsesCount}
                </p>
              </div>
              <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5">
                <span className="text-[var(--soft-ink)]">Sesi Tryout Aktif:</span>
                <p className="text-base font-bold font-mono text-[var(--ink)]">
                  {usage.activeSessionsCount}
                </p>
              </div>
              <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5">
                <span className="text-[var(--soft-ink)]">Versi Revisi:</span>
                <p className="text-base font-bold font-mono text-[var(--ink)]">
                  {usage.revisionsCount}
                </p>
              </div>
            </div>

            {/* Linked Tryouts & Packages */}
            {usage.tryouts.length > 0 && (
              <div>
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-1">
                  <Layers className="size-3.5 text-[var(--gold)]" /> Terhubung di Tryout (Battle
                  World):
                </span>
                <ul className="space-y-1 pl-2">
                  {usage.tryouts.map((t, idx) => (
                    <li key={idx} className="text-[11px] text-[var(--soft-ink)]">
                      • {t.name} (Subtes: {t.sectionCode})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {usage.packages.length > 0 && (
              <div>
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-1">
                  <Box className="size-3.5 text-[var(--gold)]" /> Paket Drilling:
                </span>
                <ul className="space-y-1 pl-2">
                  {usage.packages.map((p) => (
                    <li key={p.id} className="text-[11px] text-[var(--soft-ink)]">
                      • {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--edge)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={actionPending}
              >
                <Archive className="size-3.5 mr-1" />
                Arsipkan Soal
              </Button>

              {usage.canDeletePermanently && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={actionPending}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Hapus Permanen
                </Button>
              )}
            </div>
          </div>
        )}
      </AppDialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus Soal Permanen?"
        description="Soal ini akan dihapus permanen dari bank soal. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Permanen"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
