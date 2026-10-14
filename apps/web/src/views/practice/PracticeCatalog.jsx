import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  History,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import { SubtestIcon } from "../../components/subtest-icon";
import styles from "./practice-catalog.module.css";

const PAGE_SIZE = 9;
const packageTypeLabel = (type) => (!type || type === "Tryout" ? "Paket latihan" : type);

export function PracticeCatalog() {
  const {
    topics,
    topicsLoading,
    topicsError,
    refreshTopics,
    history = [],
    startPractice,
    loading,
  } = useApp();
  const [packages, setPackages] = useState([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("semua");
  const [page, setPage] = useState(1);
  const resultsRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const subtest = params.get("subtes") || "semua";
  const setSubtest = (slug) => {
    setPage(1);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (slug === "semua") next.delete("subtes");
      else next.set("subtes", slug);
      return next;
    });
  };
  const [status, setStatus] = useState("semua");
  const [type, setType] = useState("semua");
  const [mode, setMode] = useState("Practice");
  const [startingPackage, setStartingPackage] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    setError("");
    api("/learner/packages", { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Respons paket tidak valid.");
        if (!controller.signal.aborted)
          setPackages(
            data
              .filter((pkg) => !pkg.isFullTryout)
              .map((pkg) => ({ ...pkg, packageType: packageTypeLabel(pkg.packageType) })),
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Gagal memuat paket soal. Coba lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [retry]);

  const latestResults = new Map();
  for (const result of history) {
    const previous = latestResults.get(result.packageId);
    if (result.packageId && (!previous || result.submittedAt > previous.submittedAt))
      latestResults.set(result.packageId, result);
  }
  const sectionTopics = topics.filter(
    (topic) =>
      section === "semua" ||
      (section === "tps"
        ? topic.category === "Tes Skolastik"
        : section === "literasi"
          ? topic.category === "Tes Literasi"
          : !["Tes Skolastik", "Tes Literasi"].includes(topic.category)),
  );
  const visible = packages.filter((pkg) => {
    const topic = topics.find((item) => item.slug === pkg.topicSlug);
    const area =
      topic?.category === "Tes Skolastik"
        ? "tps"
        : topic?.category === "Tes Literasi"
          ? "literasi"
          : "tka-mandiri";
    return (
      (section === "semua" || section === area) &&
      (subtest === "semua" || subtest === pkg.topicSlug) &&
      (type === "semua" || type === pkg.packageType) &&
      (status === "semua" || (status === "selesai") === latestResults.has(pkg.id)) &&
      `${pkg.name} ${pkg.description ?? ""} ${pkg.topicName} ${pkg.packageType}`
        .toLocaleLowerCase("id-ID")
        .includes(query.trim().toLocaleLowerCase("id-ID"))
    );
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePackages = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const changePage = (nextPage) => {
    setPage(nextPage);
    resultsRef.current?.scrollIntoView({ block: "start" });
  };
  const reset = () => {
    setQuery("");
    setSection("semua");
    setSubtest("semua");
    setStatus("semua");
    setType("semua");
  };

  return (
    <>
      <PageHeading
        title="Drilling"
        description="Temukan paket soal dan asah kemampuanmu."
        actions={
          <>
            <label className={styles.search}>
              <span className="sr-only">Cari paket soal, subtes, atau topik</span>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari paket soal, subtes, topik…"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Hapus pencarian"
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <Button asChild variant="outline">
              <Link to="/dashboard/riwayat">
                <History size={16} />
                Drill Log
              </Link>
            </Button>
          </>
        }
      />
      <div className={styles.catalogControls}>
        <div className={styles.filterTabs} role="group" aria-label="Area materi drilling">
          {[
            ["semua", "Semua paket"],
            ["tps", "TPS"],
            ["literasi", "Literasi"],
            ["tka-mandiri", "TKA & Mandiri"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={section === id}
              className={section === id ? styles.filterActive : ""}
              onClick={() => {
                setSection(id);
                setSubtest("semua");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.catalogLayout}>
        <aside className={styles.filters} aria-label="Filter paket">
          <h2 className={styles.filterTitle}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filter paket
          </h2>
          <button
            className={styles.filterToggle}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="drilling-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filter paket
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <div id="drilling-filters" className={styles.filterBody} data-open={filtersOpen}>
            <fieldset className={styles.subtestFilters}>
              <legend>Subtes</legend>
              <select
                className={styles.mobileSubtest}
                aria-label="Filter subtes"
                value={subtest}
                onChange={(event) => setSubtest(event.target.value)}
              >
                <option value="semua">Semua subtes</option>
                {sectionTopics.map((topic) => (
                  <option key={topic.id} value={topic.slug}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-pressed={subtest === "semua"}
                className={subtest === "semua" ? styles.filterActive : ""}
                onClick={() => setSubtest("semua")}
              >
                Semua subtes{subtest === "semua" && <Check size={14} />}
              </button>
              {sectionTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={subtest === topic.slug}
                  className={subtest === topic.slug ? styles.filterActive : ""}
                  onClick={() => setSubtest(topic.slug)}
                >
                  <span className={styles.subtestName}>
                    <SubtestIcon slug={topic.slug} size={18} />
                    {topic.name}
                  </span>
                  {subtest === topic.slug && <Check size={14} />}
                </button>
              ))}
            </fieldset>
            <fieldset>
              <legend>Status</legend>
              <div className={styles.filterChips}>
                {[
                  ["semua", "Semua"],
                  ["baru", "Baru"],
                  ["selesai", "Selesai"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={status === id}
                    className={status === id ? styles.filterActive : ""}
                    onClick={() => {
                      setStatus(id);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Tipe paket</legend>
              <div className={styles.filterChips}>
                {["semua", ...new Set(packages.map((pkg) => pkg.packageType).filter(Boolean))].map(
                  (id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={type === id}
                      className={type === id ? styles.filterActive : ""}
                      onClick={() => {
                        setType(id);
                        setPage(1);
                      }}
                    >
                      {id === "semua" ? "Semua" : id}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            {(query ||
              section !== "semua" ||
              subtest !== "semua" ||
              status !== "semua" ||
              type !== "semua") && (
              <button type="button" className={styles.reset} onClick={reset}>
                Reset filter
              </button>
            )}
          </div>
        </aside>
        <div className={styles.catalogResults} ref={resultsRef}>
          {topicsError || error ? (
            <Panel className={styles.state} role="alert">
              <AlertTriangle size={28} />
              <h2>Paket belum dapat dimuat</h2>
              <p>{topicsError || error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  refreshTopics();
                  setRetry((value) => value + 1);
                }}
              >
                Coba lagi
              </Button>
            </Panel>
          ) : pending || topicsLoading ? (
            <Panel className={styles.state} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              <p>Memuat paket soal…</p>
            </Panel>
          ) : (
            <>
              <div className={styles.resultsToolbar}>
                <p className={styles.resultCount} role="status">
                  {visible.length} paket soal tersedia
                </p>
                <label className={styles.timerToggle}>
                  <input
                    type="checkbox"
                    checked={mode === "Timed Practice"}
                    disabled={loading}
                    onChange={(event) =>
                      setMode(event.target.checked ? "Timed Practice" : "Practice")
                    }
                  />
                  Dengan timer
                </label>
              </div>
              {visible.length === 0 ? (
                <Panel className={styles.state}>
                  <BookOpen size={28} />
                  <h2>{packages.length ? "Paket tidak ditemukan" : "Belum ada paket soal"}</h2>
                  <p>
                    {packages.length
                      ? "Coba kata kunci atau filter lain."
                      : "Paket latihan akan muncul di sini setelah tersedia."}
                  </p>
                  {packages.length > 0 && (
                    <Button variant="outline" onClick={reset}>
                      Reset filter
                    </Button>
                  )}
                </Panel>
              ) : (
                <ul className={styles.cardGrid} aria-label="Paket drilling">
                  {pagePackages.map((pkg) => {
                    const result = latestResults.get(pkg.id);
                    return (
                      <li key={pkg.id} className={styles.catalogCard}>
                        <div className={styles.cardHeading}>
                          <SubtestIcon slug={pkg.topicSlug} size={28} />
                          <div>
                            <p className={styles.topicLabel}>{pkg.topicName}</p>
                            <h3>{pkg.name}</h3>
                          </div>
                        </div>
                        <div className={styles.cardMeta}>
                          <span>
                            {pkg.questionCount} soal
                            {mode === "Timed Practice" && (
                              <>
                                <span aria-hidden="true">·</span>
                                <Clock size={12} aria-hidden="true" />
                                {(pkg.questionCount * 1.5).toLocaleString("id-ID")} menit
                              </>
                            )}
                          </span>
                          {result && (
                            <span className={styles.completed}>
                              <Check size={12} aria-hidden="true" />
                              Selesai
                            </span>
                          )}
                        </div>
                        <div className={styles.cardFooter}>
                          {result && (
                            <p className={styles.lastResult} aria-label="Hasil terakhir">
                              <span>
                                <strong>
                                  {result.correct}/{result.total} benar
                                </strong>
                              </span>
                              <Link to={`/dashboard/riwayat/${result.id}`}>Lihat hasil</Link>
                            </p>
                          )}
                          <div className={styles.cardActions}>
                            <Button
                              className="btn-gold-solid"
                              disabled={!pkg.questionCount || loading}
                              onClick={async () => {
                                if (loading) return;
                                setStartingPackage(pkg.id);
                                try {
                                  await startPractice(
                                    pkg.topicSlug,
                                    mode,
                                    pkg.questionCount,
                                    "",
                                    pkg.id,
                                  );
                                } finally {
                                  setStartingPackage(null);
                                }
                              }}
                            >
                              {result ? <RotateCcw size={14} /> : <Play size={14} />}
                              {!pkg.questionCount
                                ? "Belum tersedia"
                                : loading && startingPackage === pkg.id
                                  ? "Menyiapkan soal…"
                                  : result
                                    ? "Kerjakan lagi"
                                    : "Mulai paket"}
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {visible.length > PAGE_SIZE && (
                <nav className={styles.pagination} aria-label="Paginasi paket drilling">
                  <p aria-live="polite">
                    {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, visible.length)} dari {visible.length} paket
                    · Halaman {currentPage} dari {totalPages}
                  </p>
                  <div>
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => changePage(currentPage - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => changePage(currentPage + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
