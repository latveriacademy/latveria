import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import type { QuestionQualityReport } from "@latveria/shared";

export function QuestionQualityIndicator({
  prompt,
  options,
  correctAnswer,
  explanation,
  questionType = "single_choice",
}: {
  prompt: string;
  options?: string[];
  correctAnswer?: number | null;
  explanation?: string | null;
  questionType?: string;
}) {
  const report: QuestionQualityReport = useMemo(() => {
    const issues: QuestionQualityReport["issues"] = [];

    if (!prompt.trim() || prompt.trim().length < 5) {
      issues.push({
        code: "EMPTY_PROMPT",
        severity: "error",
        message: "Teks pertanyaan terlalu pendek atau kosong.",
        suggestion: "Tuliskan pertanyaan lengkap minimal 5 karakter.",
      });
    }

    if (questionType === "single_choice") {
      if (!Array.isArray(options) || options.length !== 5) {
        issues.push({
          code: "INVALID_OPTIONS_COUNT",
          severity: "error",
          message: "Pilihan ganda wajib memiliki 5 pilihan (A–E).",
          suggestion: "Isi lengkap kelima opsi A sampai E.",
        });
      } else {
        const trimmed = options.map((o) => o.trim().toLowerCase());
        if (new Set(trimmed).size !== trimmed.length) {
          issues.push({
            code: "DUPLICATE_OPTIONS",
            severity: "error",
            message: "Terdapat pilihan jawaban yang identik.",
            suggestion: "Pastikan kelima opsi memiliki perbedaan yang jelas.",
          });
        }
      }

      if (
        correctAnswer === null ||
        correctAnswer === undefined ||
        correctAnswer < 0 ||
        correctAnswer > 4
      ) {
        issues.push({
          code: "INVALID_CORRECT_ANSWER",
          severity: "error",
          message: "Kunci jawaban harus dipilih antara A sampai E.",
          suggestion: "Pilih salah satu kunci jawaban.",
        });
      }
    }

    if (!explanation?.trim() || explanation.trim().length < 5) {
      issues.push({
        code: "EMPTY_EXPLANATION",
        severity: "warning",
        message: "Pembahasan belum lengkap.",
        suggestion: "Tambahkan penjelasan langkah penyelesaian soal.",
      });
    }

    // LaTeX balance checks
    const allText = `${prompt} ${(options ?? []).join(" ")}`;
    const dollarCount = (allText.match(/(?<!\$)\$(?!\$)/g) || []).length;
    if (dollarCount % 2 !== 0) {
      issues.push({
        code: "UNBALANCED_LATEX_DELIMITER",
        severity: "warning",
        message: "Terdapat tanda $ inline LaTeX yang tidak berpasangan.",
        suggestion: "Pastikan rumus LaTeX ditutup dengan $.",
      });
    }

    const doubleDollarCount = (allText.match(/\$\$/g) || []).length;
    if (doubleDollarCount % 2 !== 0) {
      issues.push({
        code: "UNBALANCED_LATEX_BLOCK",
        severity: "warning",
        message: "Terdapat tanda $$ display LaTeX yang tidak berpasangan.",
        suggestion: "Pastikan blok display math ditutup dengan $$.",
      });
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const isValid = errorCount === 0;
    const canPublish = isValid && warningCount === 0;
    const qualityScore = Math.max(0, 100 - errorCount * 30 - warningCount * 10);

    return {
      isValid,
      canPublish,
      qualityScore,
      issues,
    };
  }, [prompt, options, correctAnswer, explanation, questionType]);

  const scoreColor =
    report.qualityScore >= 80
      ? "text-[var(--emerald)] border-[var(--emerald)]"
      : report.qualityScore >= 50
        ? "text-[var(--gold)] border-[var(--gold)]"
        : "text-[var(--error)] border-[var(--error-border)]";

  return (
    <div className="my-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--gold)]" />
          <span className="font-medium text-[var(--ink)]">Pemeriksaan Kualitas Otomatis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 font-mono font-bold ${scoreColor}`}>
            Skor: {report.qualityScore}/100
          </span>
          {report.canPublish ? (
            <span className="inline-flex items-center gap-1 text-[var(--emerald)] font-medium">
              <CheckCircle className="size-3.5" /> Siap Publikasi
            </span>
          ) : report.isValid ? (
            <span className="inline-flex items-center gap-1 text-[var(--gold)] font-medium">
              <AlertTriangle className="size-3.5" /> Saran Perbaikan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--error)] font-medium">
              <AlertCircle className="size-3.5" /> Wajib Diperbaiki
            </span>
          )}
        </div>
      </div>

      {report.issues.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-[var(--edge)] pt-2 text-[11px]">
          {report.issues.map((issue, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              {issue.severity === "error" ? (
                <AlertCircle className="size-3.5 shrink-0 text-[var(--error)] mt-0.5" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0 text-[var(--gold)] mt-0.5" />
              )}
              <div>
                <span className="font-semibold text-[var(--ink)]">{issue.message}</span>{" "}
                <span className="text-[var(--soft-ink)] italic">— {issue.suggestion}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
