import { Link, useLoaderData, useNavigate } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import type { Result } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import { reviewResultToSession } from "../../lib/practice/practice-review";
import { PracticeView } from "../practice/PracticeView";

export function HistoryResultView() {
  const result = useLoaderData<Result>();
  const navigate = useNavigate();

  if (!result?.answers || result.answers.length === 0) {
    const accuracy =
      result.attempt.score ??
      Math.round((result.attempt.correct / (result.attempt.total || 1)) * 100);

    return (
      <div className="latveria-view-container motion-page-enter">
        <PageHeading
          title={result.attempt.topic}
          description={
            result.attempt.packageName
              ? `Paket: ${result.attempt.packageName}`
              : "Sesi Latihan Mandiri"
          }
          actions={
            <Button asChild variant="outline">
              <Link to="/dashboard/riwayat">
                <ArrowLeft />
                Riwayat latihan
              </Link>
            </Button>
          }
        />
        <Panel>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6 p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--edge)]">
              <div>
                <span className="text-xs text-[var(--ink-muted)] block">Skor Latihan</span>
                <span className="font-mono text-2xl font-bold text-[var(--gold)]">
                  {accuracy} / 100
                </span>
              </div>
              <div className="h-8 w-px bg-[var(--edge)] hidden sm:block" />
              <div>
                <span className="text-xs text-[var(--ink-muted)] block">Jawaban Benar</span>
                <span className="font-mono text-lg font-semibold text-[var(--sage)]">
                  {result.attempt.correct} / {result.attempt.total} soal
                </span>
              </div>
              <div className="h-8 w-px bg-[var(--edge)] hidden sm:block" />
              <div>
                <span className="text-xs text-[var(--ink-muted)] block">Waktu Selesai</span>
                <span className="text-sm text-[var(--ink)]">
                  {new Date(result.attempt.submittedAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  })}{" "}
                  WIB
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-secondary)]">
              <AlertTriangle className="w-5 h-5 text-[var(--accent-gold)] flex-shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  Detail pembahasan butir soal tidak lagi tersedia
                </p>
                <p>
                  Soal pada sesi latihan ini telah dihapus atau disetel privat oleh admin. Meskipun
                  demikian, ringkasan skor dan progres Anda tetap tersimpan dalam riwayat.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="outline">
                <Link to="/dashboard/riwayat">Kembali ke Riwayat</Link>
              </Button>
              <Button asChild>
                <Link to="/dashboard?tab=practice">Latihan Soal Lain</Link>
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <PracticeView
      key={result.attempt.id}
      reviewSession={reviewResultToSession(result)}
      onReviewExit={() => navigate("/dashboard/riwayat")}
      onReviewStart={() => navigate("/dashboard?tab=practice")}
    />
  );
}
