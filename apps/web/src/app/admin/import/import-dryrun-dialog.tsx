import { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Play,
} from "lucide-react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";

export interface ImportDryRunIssue {
  groupIndex: number;
  questionIndex: number;
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface ImportDryRunDuplicate {
  groupIndex: number;
  questionIndex: number;
  prompt: string;
  matchedId: string;
  matchedTopic: string;
}

export interface ImportDryRunResult {
  isValid: boolean;
  totalGroups: number;
  totalQuestions: number;
  validQuestionsCount: number;
  invalidQuestionsCount: number;
  exactDuplicateCount: number;
  exactDuplicates: ImportDryRunDuplicate[];
  issues: ImportDryRunIssue[];
}

export function ImportDryRunDialog({
  text,
  open,
  onOpenChange,
  onProceed,
}: {
  text: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ImportDryRunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !text.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    api<ImportDryRunResult>("/admin/questions/import-dry-run", {
      method: "POST",
      body: text,
    })
      .then((res) => setReport(res))
      .catch((err: Error) => setErrorMsg(err.message || "Gagal menjalankan dry run impor."))
      .finally(() => setLoading(false));
  }, [text, open]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hasil Uji Coba Impor (Dry Run)"
      className="max-w-[680px]"
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

      {!loading && report && (
        <div className="space-y-4 py-2 text-xs">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5 text-center">
              <span className="text-[10px] text-[var(--soft-ink)]">Total Soal Terdeteksi</span>
              <p className="text-lg font-bold font-mono text-[var(--ink)]">
                {report.totalQuestions}
              </p>
            </div>
            <div className="rounded border border-[var(--emerald-border)] bg-[var(--emerald-surface)] p-2.5 text-center text-[var(--emerald)]">
              <span className="text-[10px]">Valid & Siap Diimpor</span>
              <p className="text-lg font-bold font-mono">{report.validQuestionsCount}</p>
            </div>
            <div className="rounded border border-[var(--gold-border)] bg-[var(--gold-surface)] p-2.5 text-center text-[var(--gold)]">
              <span className="text-[10px]">Duplikat Persis Terdeteksi</span>
              <p className="text-lg font-bold font-mono">{report.exactDuplicateCount}</p>
            </div>
          </div>

          {/* Exact Duplicates Warning */}
          {report.exactDuplicates.length > 0 && (
            <div className="rounded border border-[var(--gold-border)] bg-[var(--gold-surface)] p-3">
              <span className="font-semibold text-[var(--gold)] flex items-center gap-1.5 mb-1.5">
                <Copy className="size-3.5" /> Peringatan Soal Duplikat (
                {report.exactDuplicates.length}):
              </span>
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                {report.exactDuplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border border-[var(--edge)] bg-[var(--surface)] p-2 text-[11px]"
                  >
                    <span className="line-clamp-1 max-w-[70%] text-[var(--ink)]">
                      Grup {dup.groupIndex + 1}, Soal {dup.questionIndex + 1}: {dup.prompt}
                    </span>
                    <a
                      href={`/admin/soal/${dup.matchedId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--gold)] underline"
                    >
                      ID: {dup.matchedId.slice(0, 8)}... ({dup.matchedTopic})
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues List */}
          {report.issues.length > 0 ? (
            <div>
              <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="size-3.5 text-[var(--gold)]" /> Catatan Validasi &
                Peringatan ({report.issues.length}):
              </span>
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                {report.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 rounded border border-[var(--edge)] bg-[var(--surface-elevated)] p-2 text-[11px]"
                  >
                    {iss.severity === "error" ? (
                      <AlertCircle className="size-3.5 text-[var(--error)] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-3.5 text-[var(--gold)] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[var(--soft-ink)]">
                        Grup {iss.groupIndex + 1}
                        {iss.questionIndex >= 0 ? ` · Soal ${iss.questionIndex + 1}` : ""}:
                      </span>{" "}
                      <span className="text-[var(--ink)]">{iss.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-[var(--emerald-border)] bg-[var(--emerald-surface)] p-3 text-[var(--emerald)]">
              <CheckCircle className="size-4 shrink-0" />
              <span>Semua soal lolos validasi struktur, LaTeX, dan konfigurasi tanpa error.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--edge)]">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Tutup Uji Coba
            </Button>
            {report.isValid && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onProceed();
                }}
              >
                <Play className="size-3.5 mr-1" />
                Lanjutkan Impor ({report.validQuestionsCount} Soal)
              </Button>
            )}
          </div>
        </div>
      )}
    </AppDialog>
  );
}
