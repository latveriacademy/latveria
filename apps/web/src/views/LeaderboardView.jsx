import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { LatveriaSeal, LatveriaWatermark } from "../components/LatveriaSeal";
import { api } from "../lib/api";
import {
  Trophy,
  Search,
  Flame,
  Target,
  CheckCircle,
  Percent,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { sound } from "../utils/audioFeedback";

const METRICS = [
  { id: "xp", label: "XP", icon: Trophy },
  { id: "answered", label: "Soal Dijawab", icon: Target },
  { id: "correct", label: "Soal Benar", icon: CheckCircle },
  { id: "accuracy", label: "Akurasi", icon: Percent },
  { id: "streak", label: "Streak", icon: Flame },
];

const SUBTESTS = [
  { id: "all", label: "Semua" },
  { id: "PU", label: "PU" },
  { id: "PPU", label: "PPU" },
  { id: "PBM", label: "PBM" },
  { id: "PK", label: "PK" },
  { id: "BI", label: "BI" },
  { id: "EN", label: "EN" },
  { id: "PM", label: "PM" },
];

const PERIODS = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
  { id: "all", label: "Semua" },
];

const ACCURACY_MIN_ALL = 50;
const ACCURACY_MIN_SUBTEST = 20;

// Cache for client-side filtering
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(userId, metric, subtest, period) {
  return `${userId}:${metric}:${subtest}:${period}`;
}

export const LeaderboardView = () => {
  const { user } = useApp();
  const [metric, setMetric] = useState("xp");
  const [subtest, setSubtest] = useState("all");
  const [period, setPeriod] = useState("weekly");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    const cacheKey = getCacheKey(user.id, metric, subtest, period);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api(`/leaderboard?metric=${metric}&subtest=${subtest}&period=${period}`);
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat papan peringkat.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [metric, subtest, period, user.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleMetricChange = (newMetric) => {
    sound.playClick();
    setMetric(newMetric);
    // Disable subtest filter for streak
    if (newMetric === "streak") {
      setSubtest("all");
    }
  };

  const filteredEntries =
    data?.entries?.filter(
      (entry) =>
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const formatMetricValue = (value, type) => {
    if (type === "accuracy") return `${value}%`;
    if (type === "streak") return `${value} hari`;
    return value?.toLocaleString("id-ID");
  };

  const getAccuracyNote = () => {
    if (metric !== "accuracy") return null;
    const min = subtest === "all" ? ACCURACY_MIN_ALL : ACCURACY_MIN_SUBTEST;
    return (
      <div className="accuracy-min-note font-mono">
        <AlertCircle size={12} />
        Minimal {min} soal dijawab untuk masuk papan akurasi
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="latveria-view-container leaderboard-view">
        <LatveriaWatermark size={360} opacity={0.03} />
        <div className="leaderboard-loading">
          <Loader2 size={32} className="animate-spin text-gold" />
          <span className="font-mono">Memuat papan peringkat…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="latveria-view-container leaderboard-view">
      <LatveriaWatermark size={360} opacity={0.03} />

      {/* Header Banner */}
      <section className="leaderboard-header-card">
        <h1 className="leaderboard-title font-serif">Papan peringkat</h1>
        {data?.meta && (
          <span className="leaderboard-period-info font-mono">
            {data.meta.periodStart} — {data.meta.periodEnd}
          </span>
        )}
      </section>

      {/* Filter Bar */}
      <div className="leaderboard-controls-bar">
        {/* Metric Tabs */}
        <div className="metric-tabs font-mono">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                className={`metric-tab ${metric === m.id ? "active" : ""}`}
                onClick={() => handleMetricChange(m.id)}
              >
                <Icon size={14} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subtest & Period Filters */}
        <div className="filter-row">
          <select
            className="filter-select font-sans"
            value={subtest}
            onChange={(e) => {
              setSubtest(e.target.value);
            }}
            disabled={metric === "streak"}
            aria-label="Filter subtes"
          >
            {SUBTESTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select font-sans"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Filter periode"
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <div className="leaderboard-search-box">
            <Search size={15} className="text-muted" />
            <input
              type="text"
              className="search-input font-sans"
              placeholder="Cari kandidat atau nomor ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {getAccuracyNote()}

      {error && (
        <div className="leaderboard-error font-mono">
          <AlertCircle size={16} />
          {error}
          <button type="button" onClick={fetchLeaderboard}>
            Coba lagi
          </button>
        </div>
      )}

      {/* Podium Cards for Top 3 */}
      {filteredEntries.length > 0 && !error && (
        <div className="podium-trio-grid">
          {filteredEntries.slice(0, 3).map((candidate, idx) => {
            const podiumRanks = ["RANK 01", "RANK 02", "RANK 03"];
            const podiumAccents = ["gold", "silver", "brass"];

            return (
              <div
                key={candidate.id}
                className={`podium-card podium-${podiumAccents[idx]} motion-fade-up transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-2px] hover:shadow-md`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="podium-top font-mono">
                  <span className="podium-rank-tag">{podiumRanks[idx]}</span>
                  <span className="podium-id">{candidate.id}</span>
                </div>

                <div className="podium-crest transition-transform duration-200 group-hover:scale-105">
                  <LatveriaSeal size={42} />
                </div>

                <div className="podium-name-block">
                  <h3 className="podium-candidate-name font-serif">{candidate.name}</h3>
                  <span className="podium-status-tag font-mono">
                    {candidate.status || "PESERTA"}
                  </span>
                </div>

                <div className="podium-metrics-list font-mono">
                  <div className="p-metric-row">
                    <span className="text-muted">LEVEL:</span>
                    <span className="font-bold">LVL {candidate.level}</span>
                  </div>
                  <div className="p-metric-row">
                    <span className="text-muted">{metric.toUpperCase()}:</span>
                    <span className="text-gold font-bold">
                      {formatMetricValue(candidate.metricValue, metric)}
                    </span>
                  </div>
                  {metric !== "streak" && candidate.accuracy !== undefined && (
                    <div className="p-metric-row">
                      <span className="text-muted">AKURASI:</span>
                      <span className="text-sage">{candidate.accuracy}%</span>
                    </div>
                  )}
                  {metric !== "streak" && candidate.answered !== undefined && (
                    <div className="p-metric-row">
                      <span className="text-muted">SOAL SELESAI:</span>
                      <span>{candidate.answered} Q</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Institutional Table Roster */}
      {filteredEntries.length === 0 && !loading && !error ? (
        <div className="leaderboard-empty font-mono">Belum ada peserta pada periode ini</div>
      ) : (
        filteredEntries.length > 3 && (
          <div className="roster-table-container motion-fade-up">
            <table className="roster-table" aria-label="Tabel Peringkat Akademik">
              <thead>
                <tr className="font-mono">
                  <th className="th-rank">RANK</th>
                  <th className="th-candidate">KANDIDAT & IDENTITAS</th>
                  <th className="th-level">LEVEL</th>
                  <th className="th-xp">
                    {metric === "xp"
                      ? "XP"
                      : metric === "accuracy"
                        ? "AKURASI"
                        : metric === "streak"
                          ? "STREAK"
                          : metric === "correct"
                            ? "BENAR"
                            : "DIJAWAB"}
                  </th>
                  {metric !== "streak" && <th className="th-acc">AKURASI</th>}
                  {metric !== "streak" && <th className="th-questions">SOAL</th>}
                  <th className="th-level">TOTAL XP</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.slice(3).map((cand) => {
                  const isUser = cand.isCurrentUser;
                  return (
                    <tr
                      key={cand.id}
                      className={`roster-row transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--surface-hover)] ${isUser ? "user-highlight-row" : ""}`}
                    >
                      <td className="td-rank font-mono">
                        <div className="rank-cell-wrapper">
                          {cand.rank <= 3 ? (
                            <span className="rank-crown-pill font-mono">#{cand.rank}</span>
                          ) : (
                            <span className="rank-num font-mono">
                              #{cand.rank < 10 ? `0${cand.rank}` : cand.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="td-candidate">
                        <div className="candidate-cell">
                          <div className="avatar-chip font-serif">{cand.name.charAt(0)}</div>
                          <div className="candidate-details">
                            <div className="candidate-name font-sans">
                              {cand.name}
                              {isUser && <span className="you-pill font-mono">YOU</span>}
                            </div>
                            <div className="candidate-id font-mono text-muted">{cand.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="td-level font-mono">
                        <span className="level-badge">
                          LVL {cand.level < 10 ? `0${cand.level}` : cand.level}
                        </span>
                      </td>

                      <td className="td-xp font-mono">
                        <span className="text-gold font-bold">
                          {formatMetricValue(cand.metricValue, metric)}
                        </span>
                      </td>

                      {metric !== "streak" && (
                        <td className="td-acc font-mono">
                          <span className="text-sage font-bold">{cand.accuracy ?? "-"}%</span>
                        </td>
                      )}
                      {metric !== "streak" && (
                        <td className="td-questions font-mono">
                          <span>{cand.answered ?? 0} Q</span>
                        </td>
                      )}

                      <td className="td-level font-mono">
                        <span className="text-muted">{cand.totalXP?.toLocaleString() || 0} XP</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Current User Position (if outside top N) */}
      {data?.me && data.me.rank === null && (
        <div className="user-position-card motion-fade-up">
          <div className="user-position-header font-mono">
            <span className="you-label">POSISI KAMU</span>
          </div>
          <div className="user-position-content">
            <div className="user-position-info">
              <span className="user-position-name font-sans">{user.name}</span>
              <span className="user-position-id font-mono">{user.id}</span>
            </div>
            <div className="user-position-metrics font-mono">
              <span className="metric-value text-gold">
                {formatMetricValue(data.me.metricValue, metric)}
              </span>
              {data.me.needsMore && (
                <span className="needs-more font-mono">
                  Butuh {data.me.needsMore} soal lagi untuk masuk peringkat
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
