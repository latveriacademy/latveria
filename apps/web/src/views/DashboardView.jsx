import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { LatveriaSeal, LatveriaWatermark } from "../components/LatveriaSeal";
import {
  Flame,
  Award,
  Target,
  TrendingUp,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Sparkles,
  BarChart3,
  Compass,
  Play,
  Quote,
  Clock,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { Panel, PanelHeader, ProgressBar, StatTile } from "../components/ui/dashboard";
import { Button } from "../components/ui/button";
import { AnimatedNumber, FadeUp, StaggerContainer } from "../lib/motion";

// --- UTBK Countdown Hook ---
function useUtbkCountdown() {
  const [targetDate, setTargetDate] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    fetch("/api/learner/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg?.utbk_target_date) {
          setTargetDate(new Date(cfg.utbk_target_date));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown({ days, hours, minutes, seconds, passed: false });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return countdown;
}

// --- Affirmation Hook ---
function useAffirmation() {
  const [affirmation, setAffirmation] = useState(null);
  const [idx, setIdx] = useState(0);
  const [pool, setPool] = useState([]);

  useEffect(() => {
    fetch("/api/learner/affirmations")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPool(data);
          setAffirmation(data[Math.floor(Math.random() * data.length)]);
        }
      })
      .catch(() => {});
  }, []);

  const rotate = useCallback(() => {
    if (pool.length < 2) return;
    const next = (idx + 1) % pool.length;
    setIdx(next);
    setAffirmation(pool[next]);
  }, [pool, idx]);

  return { affirmation, rotate, hasPool: pool.length > 0 };
}

export const DashboardView = () => {
  const { user, topics, setCurrentTab, startPractice } = useApp();
  const [chartMetric, setChartMetric] = useState("questions"); // 'questions' | 'xp' | 'accuracy'
  const countdown = useUtbkCountdown();
  const { affirmation, rotate, hasPool } = useAffirmation();

  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  // Determine max values for weekly chart scaling
  const maxMetricVal = Math.max(...user.weeklyChartData.map((d) => d[chartMetric]));

  const handleLaunchTraining = (subjectId) => {
    sound.playClick();
    const targetId = subjectId || (topics[0]?.id ?? "PU");
    startPractice(targetId, "Practice", 10, "Latverian Elite");
  };

  // Format countdown segment
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="latveria-view-container dashboard-view">
      {/* Background Seal Watermark */}
      <LatveriaWatermark size={380} opacity={0.03} />

      {/* Hero: Personal Academic Command Center */}
      <section className="command-hero-card motion-fade-up">
        <div className="hero-main-content">
          <div className="hero-left">
            <div className="hero-salutation">
              <h1 className="hero-headline font-serif">Selamat datang, Warrior {user.name}.</h1>
            </div>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-grid">
              <StatTile
                label="STATUS LEVEL"
                value={`LEVEL ${user.level < 10 ? `0${user.level}` : user.level}`}
              >
                <span className="metric-sub-note">{user.title}</span>
              </StatTile>

              <StatTile
                label="ACTIVE STREAK"
                value={user.streakDays}
                icon={<Flame size={20} className="text-orange" />}
              >
                <span className="metric-sub-note">Konsistensi protokol terjaga</span>
              </StatTile>

              <StatTile
                label="GLOBAL ACCURACY"
                value={user.accuracy}
                icon={<Target size={20} className="text-sage" />}
              >
                <span className="metric-sub-note">
                  Berdasarkan {user.questionsCompleted} butir soal
                </span>
              </StatTile>
            </div>

            {/* XP Level Progress Bar */}
            <div className="hero-xp-wrapper">
              <div className="xp-metric-header">
                <div className="xp-left font-mono">
                  <span className="text-gold font-bold">
                    <AnimatedNumber value={user.currentXP} />
                  </span>
                  <span className="text-muted">
                    {" "}
                    / <AnimatedNumber value={user.nextLevelXP} /> XP
                  </span>
                </div>
                <div className="xp-right font-mono">
                  <span>
                    <AnimatedNumber value={user.nextLevelXP - user.currentXP} /> XP MENUJU LEVEL{" "}
                    {user.level + 1 < 10 ? `0${user.level + 1}` : user.level + 1}
                  </span>
                </div>
              </div>
              <ProgressBar
                value={xpPercentage}
                label="EXP"
                className="hero-progress-track"
                fillClassName="hero-progress-fill"
              />
            </div>
          </div>

          {/* Hero Right: Fast Command Action */}
          <div className="hero-right-cta">
            <div className="cta-border-box">
              <div className="cta-crest-center">
                <LatveriaSeal size={48} />
              </div>
              <h2 className="cta-heading font-serif">Drilling</h2>
              <Button
                type="button"
                id="btn-quick-training"
                className="btn-latveria-primary w-full"
                onClick={() => handleLaunchTraining("PU")}
              >
                <Play size={16} fill="currentColor" />
                <span>Gas drilling</span>
              </Button>
              <Button
                variant="outline"
                type="button"
                id="btn-goto-practice"
                className="btn-latveria-secondary w-full"
                onClick={() => setCurrentTab("practice")}
              >
                <span>Pilih subtes</span>
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Affirmation + UTBK Countdown & Weekly Analytics */}
      <div className="dashboard-grid-dual">
        {/* Left Column: Affirmation + UTBK Countdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* UTBK Countdown Panel */}
          <Panel className="utbk-countdown-panel">
            <PanelHeader title="Hitung mundur UTBK">
              <span className="meta-tag-id font-mono">SNPMB 2027</span>
            </PanelHeader>
            {countdown ? (
              countdown.passed ? (
                <p className="font-mono text-sm text-[var(--soft-ink)] px-4 pb-4">
                  UTBK telah berlangsung. Semoga berhasil!
                </p>
              ) : (
                <div className="utbk-countdown-grid font-mono">
                  {[
                    { label: "HARI", value: countdown.days },
                    { label: "JAM", value: pad(countdown.hours) },
                    { label: "MENIT", value: pad(countdown.minutes) },
                    { label: "DETIK", value: pad(countdown.seconds) },
                  ].map((seg) => (
                    <div key={seg.label} className="countdown-seg">
                      <span className="countdown-num font-serif">{seg.value}</span>
                      <span className="countdown-label">{seg.label}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 px-4 pb-4 text-[var(--soft-ink)]">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent" />
                <span className="font-mono text-xs">Memuat…</span>
              </div>
            )}
          </Panel>

          {/* Affirmation Panel */}
          <Panel className="affirmation-panel">
            <PanelHeader title="Afirmasi harian">
              {hasPool && (
                <button
                  type="button"
                  className="btn-icon-minimal font-mono"
                  onClick={() => {
                    sound.playClick();
                    rotate();
                  }}
                  title="Afirmasi berikutnya"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </PanelHeader>
            <div className="affirmation-body">
              {affirmation ? (
                <>
                  <Quote size={20} className="affirmation-quote-icon" />
                  <p className="affirmation-text font-serif">{affirmation.affirmation}</p>
                  {affirmation.author && (
                    <span className="affirmation-author font-mono">— {affirmation.author}</span>
                  )}
                </>
              ) : (
                <p className="font-mono text-sm text-[var(--soft-ink)] py-2">
                  Tetap konsisten. Setiap soal yang dikerjakan adalah langkah menuju tujuanmu.
                </p>
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: Weekly Academic Progress */}
        <Panel className="analytics-panel">
          <PanelHeader title="Perkembangan mingguan">
            {/* Metric Switcher Toggles */}
            <div className="chart-metric-switch font-mono">
              <button
                type="button"
                className={`metric-btn ${chartMetric === "questions" ? "active" : ""}`}
                onClick={() => setChartMetric("questions")}
              >
                SOAL
              </button>
              <button
                type="button"
                className={`metric-btn ${chartMetric === "xp" ? "active" : ""}`}
                onClick={() => setChartMetric("xp")}
              >
                XP
              </button>
              <button
                type="button"
                className={`metric-btn ${chartMetric === "accuracy" ? "active" : ""}`}
                onClick={() => setChartMetric("accuracy")}
              >
                AKURASI %
              </button>
            </div>
          </PanelHeader>

          {/* Minimalist Academic Bar Chart */}
          <div className="weekly-chart-wrapper">
            <div className="chart-bars-row">
              {user.weeklyChartData.map((item, idx) => {
                const val = item[chartMetric];
                const heightPercent = maxMetricVal > 0 ? Math.round((val / maxMetricVal) * 100) : 0;

                return (
                  <div
                    key={idx}
                    className="chart-day-column"
                    title={`${item.fullDay}: ${val} ${chartMetric}`}
                  >
                    <div className="bar-track">
                      <div
                        className="bar-fill transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="bar-val-tooltip font-mono">{val}</span>
                      </div>
                    </div>
                    <span className="day-label font-mono">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chart-summary-strip">
            <div className="chart-stat-tile">
              <span className="stat-label font-mono">TOTAL MINGGU INI</span>
              <span className="stat-val font-serif">
                <AnimatedNumber
                  value={user.weeklyChartData.reduce((acc, d) => acc + d.questions, 0)}
                />{" "}
                Soal
              </span>
            </div>
            <div className="chart-stat-tile">
              <span className="stat-label font-mono">RATA-RATA AKURASI</span>
              <span className="stat-val font-serif text-sage">{user.weeklyAccuracy}%</span>
            </div>
            <div className="chart-stat-tile">
              <span className="stat-label font-mono">AKUMULASI XP</span>
              <span className="stat-val font-serif text-gold">
                +{user.weeklyXP.toLocaleString()} EXP
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Bottom Grid: Statistics & Recent Activities */}
      <div className="dashboard-grid-dual secondary-grid">
        {/* Academic Statistical Records */}
        <Panel>
          <PanelHeader title="Statistik belajar" />

          <div className="stat-tiles-quad">
            <div className="quad-tile transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015]">
              <div className="quad-top font-mono">QUESTIONS COMPLETED</div>
              <div className="quad-number font-serif">
                <AnimatedNumber value={user.questionsCompleted} />
              </div>
              <div className="quad-bottom font-mono text-sage">TARGET: 1,000 SOAL</div>
            </div>

            <div className="quad-tile transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015]">
              <div className="quad-top font-mono">TOTAL EXP</div>
              <div className="quad-number font-serif">
                <AnimatedNumber value={user.totalXP} /> EXP
              </div>
              <div className="quad-bottom font-mono text-gold">Hanya dari latihan selesai</div>
            </div>

            <div className="quad-tile transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015]">
              <div className="quad-top font-mono">LATIHAN SELESAI</div>
              <div className="quad-number font-serif">{user.attempts}</div>
              <div className="quad-bottom font-mono text-sage">Sesi yang sudah dikumpulkan</div>
            </div>

            <div className="quad-tile transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015]">
              <div className="quad-top font-mono">ACCURACY BENCHMARK</div>
              <div className="quad-number font-serif">
                <AnimatedNumber value={user.accuracy} formatter={(n) => `${n}%`} />
              </div>
              <div className="quad-bottom font-mono text-gold">Persentase jawaban benar</div>
            </div>
          </div>
        </Panel>

        {/* Recent Activity Stream */}
        <Panel>
          <PanelHeader title="Drill Log">
            <span className="meta-tag-id font-mono">LOG.HIST-0824</span>
          </PanelHeader>

          <div className="activity-stream-list">
            {user.recentActivities.length === 0 ? (
              <p className="text-muted font-sans text-sm px-1 py-3">
                Belum ada riwayat latihan. Gas drilling pertamamu!
              </p>
            ) : (
              user.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="activity-stream-item transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01]"
                >
                  <div className="activity-sub-badge font-mono">{act.code}</div>
                  <div className="activity-body">
                    <div className="activity-title-text font-sans">{act.title}</div>
                    <div className="activity-meta font-mono">
                      <span className="text-muted">{act.time}</span>
                      <span className="meta-dot">•</span>
                      <span className="text-sage">Akurasi {act.accuracy}</span>
                    </div>
                  </div>
                  <div className="activity-xp-pill font-mono">+{act.xp} XP</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
