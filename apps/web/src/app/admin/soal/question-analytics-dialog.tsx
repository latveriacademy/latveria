import { useState, useEffect } from "react";
import { AlertTriangle, BarChart3, Clock, Loader2, Target, Users } from "lucide-react";
import type { QuestionPerformanceAnalytics } from "@latveria/shared";
import { api } from "../../../lib/api";
import { AppDialog } from "../../../components/app-dialog";

export function QuestionAnalyticsDialog({
  questionId,
  open,
  onOpenChange,
}: {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QuestionPerformanceAnalytics | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrorMsg(null);
    api<QuestionPerformanceAnalytics>(`/admin/questions/${questionId}/analytics`)
      .then((res) => setData(res))
      .catch((err: Error) => setErrorMsg(err.message || "Gagal memuat analitik soal."))
      .finally(() => setLoading(false));
  }, [questionId, open]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Analitik Performa Soal"
      className="max-w-[560px]"
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

      {!loading && data && (
        <div className="space-y-4 py-2 text-xs">
          {data.isLowSample && (
            <div className="flex items-center gap-2 rounded border border-[var(--gold-border)] bg-[var(--gold-surface)] p-2.5 text-[var(--gold)]">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                Jumlah pengerjaan masih sedikit ({data.totalAttempts} attempt). Metrik statistik
                akan lebih stabil seiring bertambahnya sampel.
              </span>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-center">
              <span className="text-[10px] text-[var(--soft-ink)] flex items-center justify-center gap-1 mb-1">
                <Users className="size-3" /> Total Attempt
              </span>
              <p className="text-xl font-bold font-mono text-[var(--ink)]">{data.totalAttempts}</p>
            </div>
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-center">
              <span className="text-[10px] text-[var(--soft-ink)] flex items-center justify-center gap-1 mb-1">
                <Target className="size-3" /> Akurasi Benar
              </span>
              <p className="text-xl font-bold font-mono text-[var(--emerald)]">
                {data.accuracyPercentage}%
              </p>
            </div>
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-center">
              <span className="text-[10px] text-[var(--soft-ink)] flex items-center justify-center gap-1 mb-1">
                <Clock className="size-3" /> Median Waktu
              </span>
              <p className="text-xl font-bold font-mono text-[var(--ink)]">
                {data.medianTimeSeconds}s
              </p>
            </div>
          </div>

          {/* Difficulty Comparison */}
          <div className="flex items-center justify-between rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-xs">
            <div>
              <span className="text-[var(--soft-ink)] block text-[10px]">
                Tingkat Kesulitan Terdaftar:
              </span>
              <strong className="font-mono uppercase text-[var(--ink)]">
                {data.configuredDifficulty}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[var(--soft-ink)] block text-[10px]">
                Tingkat Kesulitan Empiris (Data Nyata):
              </span>
              <strong className="font-mono uppercase text-[var(--gold)]">
                {data.empiricalDifficulty.replace("_", " ")}
              </strong>
            </div>
          </div>

          {/* Option Distribution */}
          <div>
            <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-2">
              <BarChart3 className="size-4 text-[var(--gold)]" /> Distribusi Pilihan Jawaban:
            </span>
            <div className="space-y-2">
              {data.optionDistribution.map((opt) => (
                <div key={opt.optionIndex} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[var(--ink)]">Opsi {opt.label}</span>
                    <span className="text-[var(--soft-ink)] font-mono">
                      {opt.count} pemilih ({opt.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--surface-elevated)] overflow-hidden border border-[var(--edge)]">
                    <div
                      className="h-full bg-[var(--gold)] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, opt.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppDialog>
  );
}
