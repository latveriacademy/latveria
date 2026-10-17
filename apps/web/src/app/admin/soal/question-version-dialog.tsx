import { useState, useEffect } from "react";
import { ArrowLeftRight, Clock, History, Loader2, RotateCcw } from "lucide-react";
import type { QuestionVersionDiff, QuestionVersionItem } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";
import { ConfirmDialog } from "../../../components/confirm-dialog";

export function QuestionVersionDialog({
  questionId,
  open,
  onOpenChange,
  onRollbackComplete,
}: {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRollbackComplete?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<QuestionVersionItem[]>([]);
  const [selectedV1, setSelectedV1] = useState<number | null>(null);
  const [selectedV2, setSelectedV2] = useState<number | null>(null);
  const [diff, setDiff] = useState<QuestionVersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrorMsg(null);
    setDiff(null);
    api<QuestionVersionItem[]>(`/admin/questions/${questionId}/versions`)
      .then((data) => {
        setVersions(data);
        if (data.length >= 2) {
          setSelectedV1(data[1].versionNumber);
          setSelectedV2(data[0].versionNumber);
        } else if (data.length === 1) {
          setSelectedV1(data[0].versionNumber);
        }
      })
      .catch((err: Error) => setErrorMsg(err.message || "Gagal memuat histori revisi."))
      .finally(() => setLoading(false));
  }, [questionId, open]);

  useEffect(() => {
    if (selectedV1 === null || selectedV2 === null || selectedV1 === selectedV2) {
      setDiff(null);
      return;
    }
    setDiffLoading(true);
    api<QuestionVersionDiff>(
      `/admin/questions/${questionId}/versions/diff?v1=${selectedV1}&v2=${selectedV2}`,
    )
      .then((data) => setDiff(data))
      .catch(() => setDiff(null))
      .finally(() => setDiffLoading(false));
  }, [questionId, selectedV1, selectedV2]);

  const handleRollback = async () => {
    if (rollbackTarget === null) return;
    setActionPending(true);
    try {
      await api(`/admin/questions/${questionId}/versions/rollback`, {
        method: "POST",
        body: JSON.stringify({ targetVersion: rollbackTarget }),
      });
      setRollbackTarget(null);
      onOpenChange(false);
      onRollbackComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal melakukan rollback.";
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
        title="Histori Versi & Perbandingan Revisi"
        className="max-w-[720px]"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
          </div>
        )}

        {errorMsg && (
          <div className="my-2 rounded border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-xs text-[var(--error)]">
            {errorMsg}
          </div>
        )}

        {!loading && versions.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--soft-ink)]">
            Belum ada snapshot versi untuk soal ini.
          </p>
        )}

        {!loading && versions.length > 0 && (
          <div className="space-y-4 py-2 text-xs">
            {/* Version List */}
            <div>
              <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-2">
                <History className="size-4 text-[var(--gold)]" /> Daftar Snapshot Versi:
              </span>
              <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5 text-xs hover:bg-[var(--surface-elevated)]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--gold-surface)] px-1.5 py-0.5 font-mono font-bold text-[10px] text-[var(--gold)]">
                          v{v.versionNumber}
                        </span>
                        <span className="font-medium text-[var(--ink)]">
                          {v.changeSummary || "Pembaruan Soal"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--soft-ink)]">
                        <Clock className="size-2.5" />
                        <span>{new Date(v.createdAt).toLocaleString("id-ID")}</span>
                        {v.authorName && <span>• oleh {v.authorName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px]"
                        onClick={() => {
                          if (selectedV1 === null) setSelectedV1(v.versionNumber);
                          else setSelectedV2(v.versionNumber);
                        }}
                      >
                        Pilih Diff
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] text-[var(--gold)]"
                        onClick={() => setRollbackTarget(v.versionNumber)}
                      >
                        <RotateCcw className="size-2.5 mr-1" />
                        Rollback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diff Comparison View */}
            <div className="border-t border-[var(--edge)] pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5 text-[var(--gold)]" /> Perbandingan Versi:
                </span>
                <span className="font-mono text-[11px] text-[var(--soft-ink)]">
                  v{selectedV1 ?? "?"} vs v{selectedV2 ?? "?"}
                </span>
              </div>

              {diffLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
                </div>
              )}

              {!diffLoading && diff && diff.changedFields.length === 0 && (
                <p className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-center text-xs text-[var(--soft-ink)]">
                  Tidak ada perbedaan konten antara Versi {selectedV1} dan Versi {selectedV2}.
                </p>
              )}

              {!diffLoading && diff && diff.changedFields.length > 0 && (
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                  {diff.changedFields.map((field) => (
                    <div
                      key={field}
                      className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5"
                    >
                      <span className="font-mono text-[10px] uppercase text-[var(--gold)] font-bold">
                        Bidang: {field}
                      </span>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded bg-[var(--error-surface)] p-1.5 text-[var(--error)]">
                          <span className="block text-[9px] font-bold uppercase opacity-75">
                            v{diff.oldVersion} (Sebelumnya):
                          </span>
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(diff.diffs[field]?.before ?? "", null, 2)}
                          </pre>
                        </div>
                        <div className="rounded bg-[var(--emerald-surface)] p-1.5 text-[var(--emerald)]">
                          <span className="block text-[9px] font-bold uppercase opacity-75">
                            v{diff.newVersion} (Sesudahnya):
                          </span>
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(diff.diffs[field]?.after ?? "", null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AppDialog>

      <ConfirmDialog
        open={rollbackTarget !== null}
        onOpenChange={(open: boolean) => !open && setRollbackTarget(null)}
        title={`Rollback Soal ke Versi ${rollbackTarget}?`}
        description="Konten soal akan dikembalikan sesuai versi terpilih. Sistem akan membuat revisi baru di atas versi saat ini tanpa menghapus riwayat historis."
        confirmLabel="Lakukan Rollback"
        pending={actionPending}
        onConfirm={handleRollback}
      />
    </>
  );
}
