import { useState } from "react";
import { AlertTriangle, CheckCircle, Copy, Eye, ExternalLink, RefreshCw } from "lucide-react";
import type { DuplicateCheckResponse, DuplicateMatchItem } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";
import { MathText } from "../../../components/math/math-text";

export function QuestionDuplicateChecker({
  prompt,
  options,
  excludeId,
  onOverrideAllowed,
}: {
  prompt: string;
  options?: string[];
  excludeId?: string;
  onOverrideAllowed?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DuplicateCheckResponse | null>(null);
  const [comparedMatch, setComparedMatch] = useState<DuplicateMatchItem | null>(null);

  const checkDuplicates = async () => {
    if (!prompt.trim()) return;
    setChecking(true);
    try {
      const data = await api<DuplicateCheckResponse>("/admin/questions/check-duplicate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          options,
          excludeId,
        }),
      });
      setResult(data);
    } catch {
      // Graceful fallback if check request fails
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Copy className="size-4 text-[var(--gold)]" />
          <span className="font-medium text-[var(--ink)]">Deteksi Duplikasi Konten</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={checking || !prompt.trim()}
          onClick={checkDuplicates}
        >
          {checking ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          <span>Periksa Duplikat</span>
        </Button>
      </div>

      {result && result.isExactDuplicate && result.exactMatch && (
        <div className="mt-3 rounded-md border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-xs text-[var(--error)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-[var(--error)]" />
            <div className="space-y-1">
              <strong className="block font-semibold">
                Peringatan: Soal Duplikat Persis Terdeteksi!
              </strong>
              <p>
                Fingerprint konten SHA-256 identik dengan soal pada subtes{" "}
                <strong>{result.exactMatch.topicName}</strong>
                {result.exactMatch.packageName && ` (${result.exactMatch.packageName})`}.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setComparedMatch(result.exactMatch)}
                >
                  <Eye className="size-3 mr-1" /> Bandingkan Berdampingan
                </Button>
                <a
                  href={`/admin/soal/${result.exactMatch.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] underline hover:text-[var(--gold)]"
                >
                  Buka ID: {result.exactMatch.id.slice(0, 8)}...
                  <ExternalLink className="size-2.5" />
                </a>
                {onOverrideAllowed && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-[var(--soft-ink)]"
                    onClick={onOverrideAllowed}
                  >
                    Abaikan & Tetap Simpan
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && !result.isExactDuplicate && result.similarCandidates.length > 0 && (
        <div className="mt-3 space-y-2">
          <span className="font-mono text-xs text-[var(--soft-ink)]">
            Ditemukan {result.similarCandidates.length} soal dengan kemiripan tinggi:
          </span>
          <div className="space-y-1.5">
            {result.similarCandidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded border border-[var(--edge)] bg-[var(--surface)] p-2 text-xs"
              >
                <div className="line-clamp-1 max-w-[70%]">
                  <span className="font-mono text-[var(--gold)]">
                    [{Math.round(c.similarityScore * 100)}%]
                  </span>{" "}
                  <span className="text-[var(--ink)]">{c.prompt}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setComparedMatch(c)}
                  >
                    Bandingkan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && !result.isExactDuplicate && result.similarCandidates.length === 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--emerald)]">
          <CheckCircle className="size-3.5" />
          <span>Tidak ditemukan duplikasi persis atau kemiripan mencurigakan.</span>
        </div>
      )}

      {/* Side-by-Side Comparison Dialog */}
      {comparedMatch && (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setComparedMatch(null);
          }}
          title="Perbandingan Soal Berdampingan"
          className="max-w-[800px]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs max-h-[70vh] overflow-y-auto">
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3">
              <strong className="block mb-2 font-mono text-[var(--gold)] uppercase">
                Konten Saat Ini
              </strong>
              <div className="font-serif leading-relaxed text-[var(--ink)]">
                <MathText>{prompt}</MathText>
              </div>
              {options && options.length > 0 && (
                <ol className="mt-3 space-y-1 pl-4 list-decimal text-[var(--soft-ink)]">
                  {options.map((opt, i) => (
                    <li key={i}>
                      <MathText>{opt}</MathText>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded border border-[var(--edge)] bg-[var(--surface-elevated)] p-3">
              <div className="flex items-center justify-between mb-2">
                <strong className="font-mono text-[var(--accent-gold)] uppercase">
                  Kandidat Pembanding (
                  {comparedMatch.matchType === "exact"
                    ? "Duplikat Persis"
                    : `${Math.round(comparedMatch.similarityScore * 100)}% Mirip`}
                  )
                </strong>
                <a
                  href={`/admin/soal/${comparedMatch.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] underline"
                >
                  Lihat detail
                </a>
              </div>
              <div className="font-serif leading-relaxed text-[var(--ink)]">
                <MathText>{comparedMatch.prompt}</MathText>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--edge)] text-[11px] text-[var(--soft-ink)] space-y-0.5">
                <p>
                  Subtes: <strong>{comparedMatch.topicName}</strong>
                </p>
                {comparedMatch.packageName && (
                  <p>
                    Paket: <strong>{comparedMatch.packageName}</strong>
                  </p>
                )}
                <p>
                  Status:{" "}
                  <span className="uppercase font-mono">{comparedMatch.workflowStatus}</span>
                </p>
              </div>
            </div>
          </div>
        </AppDialog>
      )}
    </div>
  );
}
