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
        title="Drill Log"
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
            <p>Drill Log masih kosong. Gas selesaikan sesi pertamamu.</p>
            <Button asChild>
              <Link to="/dashboard?tab=practice">Gas drilling</Link>
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
  return (
    <div className="latveria-view-container">
      <PageHeading title={missing ? "Hasil tidak ditemukan" : "Tidak dapat memuat riwayat"} />
      <Panel>
        <div className={styles.empty}>
          {!missing && <p role="alert">{error instanceof Error ? error.message : "Coba lagi."}</p>}
          {!missing && (
            <Button
              disabled={revalidator.state !== "idle"}
              onClick={() => revalidator.revalidate()}
            >
              Coba lagi
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/dashboard/riwayat">Drill Log</Link>
          </Button>
          <Link to="/dashboard?tab=practice">Kembali ke Drilling</Link>
        </div>
      </Panel>
    </div>
  );
}
