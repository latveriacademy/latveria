import { Link, useLoaderData, useRevalidator, useRouteError } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { HistoryItem } from "@latveria/shared";
import { ApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import styles from "./history.module.css";

export function HistoryView() {
  const history = useLoaderData<HistoryItem[]>();
  return (
    <div className="latveria-view-container motion-page-enter">
      <PageHeading
        title="Riwayat Latihan"
        description={`${history.length} sesi drilling tersimpan`}
        actions={
          <Button asChild variant="outline">
            <Link to="/dashboard?tab=practice">
              <ArrowLeft />
              Drilling
            </Link>
          </Button>
        }
      />
      <Panel>
        {history.length ? (
          <ul className={styles.list} aria-label="Sesi latihan yang sudah dikumpulkan">
            {history.map((attempt, idx) => (
              <li
                className={`${styles.row} motion-fade-up transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--surface-hover)]`}
                key={attempt.id}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className={styles.detail}>
                  <h2>
                    {attempt.topic}
                    {attempt.packageName ? ` · ${attempt.packageName}` : ""}
                  </h2>
                  <time dateTime={attempt.submittedAt}>
                    {new Date(attempt.submittedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Jakarta",
                    })}{" "}
                    WIB
                  </time>
                </div>
                <span className={styles.result}>
                  {attempt.correct} / {attempt.total} benar
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to={`/dashboard/riwayat/${attempt.id}`}
                    aria-label={`Lihat hasil ${attempt.topic} pada ${new Date(attempt.submittedAt).toLocaleDateString("id-ID")}`}
                  >
                    Lihat hasil
                    <ChevronRight />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={`${styles.empty} motion-fade-up`}>
            <p>Riwayat latihan masih kosong. Selesaikan sesi pertamamu.</p>
            <Button asChild>
              <Link to="/dashboard?tab=practice">Mulai drilling</Link>
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function HistoryErrorView() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const missing = error instanceof ApiError && error.status === 404;
  const isModuleError =
    error instanceof Error &&
    /importing.*module script|failed to fetch dynamically imported module|error loading dynamically imported module|chunkloaderror/i.test(
      error.message,
    );
  const isUnavailable =
    error instanceof Error &&
    /belum lengkap|dihapus|privat|tidak lagi tersedia/i.test(error.message);

  let title = "Tidak dapat memuat riwayat";
  if (missing) {
    title = "Hasil tidak ditemukan";
  } else if (isModuleError) {
    title = "Pembaruan Aplikasi Tersedia";
  } else if (isUnavailable) {
    title = "Soal Tidak Lagi Tersedia";
  }

  return (
    <div className="latveria-view-container motion-page-enter">
      <PageHeading title={title} />
      <Panel>
        <div className={styles.empty}>
          {missing && (
            <p role="alert">Sesi latihan ini tidak ditemukan atau sudah tidak tersedia.</p>
          )}
          {isModuleError && (
            <p role="alert">
              Versi modul aplikasi telah diperbarui atau koneksi terputus. Muat ulang halaman untuk
              memuat versi terbaru.
            </p>
          )}
          {isUnavailable && (
            <p role="alert">
              Soal pada sesi latihan ini telah dihapus atau disetel privat oleh admin sehingga
              detail butir soal tidak dapat ditampilkan lagi. Catatan skor Anda tetap tersimpan.
            </p>
          )}
          {!missing && !isModuleError && !isUnavailable && (
            <p role="alert">{error instanceof Error ? error.message : "Coba lagi."}</p>
          )}

          {isModuleError ? (
            <Button onClick={() => window.location.reload()}>Muat ulang halaman</Button>
          ) : !missing && !isUnavailable ? (
            <Button
              disabled={revalidator.state !== "idle"}
              onClick={() => revalidator.revalidate()}
            >
              Coba lagi
            </Button>
          ) : null}

          <Button asChild variant="outline">
            <Link to="/dashboard/riwayat">Riwayat latihan</Link>
          </Button>
          <Link to="/dashboard?tab=practice">Kembali ke Drilling</Link>
        </div>
      </Panel>
    </div>
  );
}
