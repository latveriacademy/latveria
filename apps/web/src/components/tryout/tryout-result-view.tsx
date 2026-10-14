import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  History,
  Loader2,
} from "lucide-react";
import type { TryoutSessionState } from "./tryout-workspace";
import { PageHeading, Panel } from "../ui/dashboard";
import { Button } from "../ui/button";
import { TryoutScoreReport } from "./tryout-score-report";
import { formatTryoutDate } from "../../lib/tryout/tryout-results";
import styles from "./tryout-results.module.css";

export function TryoutResultView({
  data,
  onBack,
  onReview,
  onHistory,
}: {
  data: TryoutSessionState;
  onBack: () => void;
  onReview: () => void;
  onHistory: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownloadCertificate() {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/learner/tryouts/${data.session.id}/certificate.pdf`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errJson?.message || "Gagal mengunduh sertifikat.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `Sertifikat-Tryout-Latveria-${data.package.name.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : "Gagal mengunduh sertifikat.");
    } finally {
      setDownloading(false);
    }
  }

  const isCompleted = data.session.state === "completed";

  return (
    <div className={`latveria-view-container ${styles.page}`}>
      <PageHeading
        title="Hasil Tryout"
        description={data.package.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isCompleted && (
              <Button
                variant="outline"
                onClick={handleDownloadCertificate}
                disabled={downloading}
                aria-label="Unduh Sertifikat PDF"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                {downloading ? "Mengunduh PDF..." : "Unduh Sertifikat PDF"}
              </Button>
            )}
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft size={16} />
              Daftar Tryout
            </Button>
          </div>
        }
      />
      <div className={styles.resultMeta}>
        <span className={styles.saved}>
          <CheckCircle2 size={16} />
          Selesai · hasil tersimpan
        </span>
        <span>{formatTryoutDate(data.session.completedAt)}</span>
      </div>

      {downloadError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      <Panel className={styles.resultPanel}>
        {data.score ? (
          <TryoutScoreReport report={data.score} />
        ) : (
          <p>Nilai belum tersedia. Jawabanmu sudah tersimpan dan dapat ditinjau.</p>
        )}
      </Panel>
      <footer className={styles.resultFooter}>
        <p>Skor simulasi latveriacademy, bukan skor resmi atau prediksi skor UTBK.</p>
        <div className={styles.resultActions}>
          {isCompleted && (
            <Button variant="outline" onClick={handleDownloadCertificate} disabled={downloading}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
              {downloading ? "Mengunduh PDF..." : "Unduh Sertifikat PDF"}
            </Button>
          )}
          <Button variant="outline" onClick={onHistory}>
            <History size={16} />
            Riwayat Tryout
          </Button>
          {!!data.reviewQuestions?.length && (
            <Button onClick={onReview}>
              <BookOpen size={16} />
              Tinjau jawaban
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
