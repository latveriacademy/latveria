import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
import {
  Flame,
  Award,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  Circle,
  Play,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Sparkles,
  BarChart3,
  Compass
} from 'lucide-react';
import { sound } from '../utils/audioFeedback';

export const DashboardView = () => {
  const { user, setCurrentTab, startPractice, completeDailyTraining } = useApp();
  const [chartMetric, setChartMetric] = useState('questions'); // 'questions' | 'xp' | 'accuracy'

  const completedTrainingCount = user.todayTraining.filter((t) => t.completed).length;
  const totalTrainingCount = user.todayTraining.length;
  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  // Determine max values for weekly chart scaling
  const maxMetricVal = Math.max(...user.weeklyChartData.map((d) => d[chartMetric]));

  const handleLaunchTraining = (subjectId) => {
    sound.playClick();
    startPractice(subjectId || 'PU', 'Practice', 10, 'Latverian Elite');
  };

  return (
    <div className="latveria-view-container dashboard-view">
      {/* Background Seal Watermark */}
      <LatveriaWatermark size={380} opacity={0.03} />

      {/* Hero: Personal Academic Command Center */}
      <section className="command-hero-card">
        <div className="hero-top-meta">
          <div className="meta-pill">
            <span className="meta-indicator" />
            <span className="font-mono">STATE ACADEMIC SYSTEM // COMMAND CENTER</span>
          </div>
          <div className="meta-tag-id font-mono">CADET DOSSIER #{user.id}</div>
        </div>

        <div className="hero-main-content">
          <div className="hero-left">
            <div className="hero-salutation">
              <span className="hero-sub font-mono">AUTHENTICATED USER</span>
              <h1 className="hero-headline font-serif">Welcome back, {user.codename || user.name}.</h1>
              <p className="hero-description">
                Sistem akademik privat Latveria aktif. Catatan kurikulum SNBT/UTBK Anda terpantau berada pada tingkat ketuntasan optimal.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-grid">
              <div className="hero-metric-tile">
                <span className="metric-label-mono font-mono">STATUS LEVEL</span>
                <div className="metric-val-row">
                  <span className="metric-num font-serif">LEVEL {user.level < 10 ? `0${user.level}` : user.level}</span>
                </div>
                <span className="metric-sub-note">{user.title}</span>
              </div>

              <div className="hero-metric-tile">
                <span className="metric-label-mono font-mono">ACTIVE STREAK</span>
                <div className="metric-val-row">
                  <Flame size={20} className="text-orange" />
                  <span className="metric-num font-serif">{user.streakDays} DAYS</span>
                </div>
                <span className="metric-sub-note">Konsistensi protokol terjaga</span>
              </div>

              <div className="hero-metric-tile">
                <span className="metric-label-mono font-mono">GLOBAL ACCURACY</span>
                <div className="metric-val-row">
                  <Target size={20} className="text-sage" />
                  <span className="metric-num font-serif">{user.accuracy}%</span>
                </div>
                <span className="metric-sub-note">Berdasarkan {user.questionsCompleted} butir soal</span>
              </div>
            </div>

            {/* XP Level Progress Bar */}
            <div className="hero-xp-wrapper">
              <div className="xp-metric-header">
                <div className="xp-left font-mono">
                  <span className="text-gold font-bold">{user.currentXP.toLocaleString()}</span>
                  <span className="text-muted"> / {user.nextLevelXP.toLocaleString()} XP</span>
                </div>
                <div className="xp-right font-mono">
                  <span>{(user.nextLevelXP - user.currentXP).toLocaleString()} XP MENUJU LEVEL {user.level + 1 < 10 ? `0${user.level + 1}` : user.level + 1}</span>
                </div>
              </div>
              <div className="hero-progress-track">
                <div className="hero-progress-fill" style={{ width: `${xpPercentage}%` }} />
              </div>
            </div>
          </div>

          {/* Hero Right: Fast Command Action */}
          <div className="hero-right-cta">
            <div className="cta-border-box">
              <div className="cta-crest-center">
                <LatveriaSeal size={48} />
              </div>
              <h2 className="cta-heading font-serif">Imperial UTBK Readiness</h2>
              <p className="cta-text">
                Pertajam penalaran deduktif dan literasi kritis Anda melalui simulasi terstandar institusi.
              </p>
              <button
                type="button"
                id="btn-quick-training"
                className="btn-latveria-primary w-full"
                onClick={() => handleLaunchTraining('PU')}
              >
                <Play size={16} fill="currentColor" />
                <span>BEGIN TRAINING NOW</span>
              </button>
              <button
                type="button"
                id="btn-goto-practice"
                className="btn-latveria-secondary w-full"
                onClick={() => setCurrentTab('practice')}
              >
                <span>BUKA SEMUA SUBTES (7)</span>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Today's Training & Weekly Analytics */}
      <div className="dashboard-grid-dual">
        {/* Left Column: Today's Training */}
        <section className="dashboard-panel training-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">DAILY ACADEMIC PROTOCOL</span>
              <h2 className="panel-title font-serif">TODAY'S TRAINING</h2>
            </div>
            <div className="training-counter-badge font-mono">
              <span className="counter-curr">{completedTrainingCount}</span>
              <span className="counter-slash">/</span>
              <span className="counter-total">{totalTrainingCount} COMPLETED</span>
            </div>
          </div>

          <div className="training-tasks-list">
            {user.todayTraining.map((task) => (
              <div
                key={task.id}
                className={`task-row-card ${task.completed ? 'task-done' : ''}`}
              >
                <div className="task-status-btn-wrap">
                  <button
                    type="button"
                    className="task-check-button"
                    onClick={() => completeDailyTraining(task.id)}
                    title={task.completed ? 'Selesai diverifikasi' : 'Tandai selesai'}
                  >
                    {task.completed ? (
                      <CheckCircle2 size={20} className="text-sage" />
                    ) : (
                      <Circle size={20} className="text-muted" />
                    )}
                  </button>
                </div>

                <div className="task-info">
                  <div className="task-subject-name font-sans">{task.subject}</div>
                  <div className="task-metadata font-mono">
                    <span>{task.count} QUESTIONS</span>
                    <span className="meta-dot">•</span>
                    <span className="text-gold">+{task.xp} XP</span>
                  </div>
                </div>

                <div className="task-action">
                  {task.completed ? (
                    <span className="badge-verified font-mono">VERIFIED</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-task-start font-mono"
                      onClick={() => handleLaunchTraining(task.subjectId)}
                    >
                      <span>TRAIN</span>
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer-action">
            <button
              type="button"
              id="btn-start-daily-full"
              className="btn-latveria-primary w-full"
              onClick={() => handleLaunchTraining('PU')}
            >
              <span>LANJUTKAN TRAINING HARIAN</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>

        {/* Right Column: Weekly Academic Progress */}
        <section className="dashboard-panel analytics-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">COGNITIVE RECORD</span>
              <h2 className="panel-title font-serif">WEEKLY PROGRESS</h2>
            </div>

            {/* Metric Switcher Toggles */}
            <div className="chart-metric-switch font-mono">
              <button
                type="button"
                className={`metric-btn ${chartMetric === 'questions' ? 'active' : ''}`}
                onClick={() => setChartMetric('questions')}
              >
                SOAL
              </button>
              <button
                type="button"
                className={`metric-btn ${chartMetric === 'xp' ? 'active' : ''}`}
                onClick={() => setChartMetric('xp')}
              >
                XP
              </button>
              <button
                type="button"
                className={`metric-btn ${chartMetric === 'accuracy' ? 'active' : ''}`}
                onClick={() => setChartMetric('accuracy')}
              >
                AKURASI %
              </button>
            </div>
          </div>

          {/* Minimalist Academic Bar Chart */}
          <div className="weekly-chart-wrapper">
            <div className="chart-bars-row">
              {user.weeklyChartData.map((item, idx) => {
                const val = item[chartMetric];
                const heightPercent = Math.max(12, Math.round((val / maxMetricVal) * 100));

                return (
                  <div key={idx} className="chart-day-column" title={`${item.fullDay}: ${val} ${chartMetric}`}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
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
                {user.weeklyChartData.reduce((acc, d) => acc + d.questions, 0)} Soal
              </span>
            </div>
            <div className="chart-stat-tile">
              <span className="stat-label font-mono">RATA-RATA AKURASI</span>
              <span className="stat-val font-serif text-sage">85.4%</span>
            </div>
            <div className="chart-stat-tile">
              <span className="stat-label font-mono">AKUMULASI XP</span>
              <span className="stat-val font-serif text-gold">+2,690 XP</span>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Grid: Statistics & Recent Activities */}
      <div className="dashboard-grid-dual secondary-grid">
        {/* Academic Statistical Records */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">CUMULATIVE PERFORMANCE</span>
              <h2 className="panel-title font-serif">STATISTIK BELAJAR</h2>
            </div>
            <span className="badge-record-archive font-mono">ARCHIVED</span>
          </div>

          <div className="stat-tiles-quad">
            <div className="quad-tile">
              <div className="quad-top font-mono">QUESTIONS COMPLETED</div>
              <div className="quad-number font-serif">{user.questionsCompleted}</div>
              <div className="quad-bottom font-mono text-sage">TARGET: 1,000 SOAL</div>
            </div>

            <div className="quad-tile">
              <div className="quad-top font-mono">PRACTICE HOURS</div>
              <div className="quad-number font-serif">{user.practiceHours}h</div>
              <div className="quad-bottom font-mono text-gold">DEDIKASI TERVERIFIKASI</div>
            </div>

            <div className="quad-tile">
              <div className="quad-top font-mono">GLOBAL RANK</div>
              <div className="quad-number font-serif">#{user.currentRank}</div>
              <div className="quad-bottom font-mono text-sage">TOP 2% OF COHORT</div>
            </div>

            <div className="quad-tile">
              <div className="quad-top font-mono">ACCURACY BENCHMARK</div>
              <div className="quad-number font-serif">{user.accuracy}%</div>
              <div className="quad-bottom font-mono text-gold">TIER-1 EXCELLENCE</div>
            </div>
          </div>
        </section>

        {/* Recent Activity Stream */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">AUDIT TRAIL</span>
              <h2 className="panel-title font-serif">RECENT ACTIVITY</h2>
            </div>
            <span className="meta-tag-id font-mono">LOG.HIST-0824</span>
          </div>

          <div className="activity-stream-list">
            {user.recentActivities.map((act) => (
              <div key={act.id} className="activity-stream-item">
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
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
