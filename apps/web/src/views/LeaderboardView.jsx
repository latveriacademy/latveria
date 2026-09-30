import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LEADERBOARD_DATA } from '../data/leaderboardData';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
import {
  Trophy,
  Shield,
  Medal,
  TrendingUp,
  Search,
  Filter,
  Award,
  Crown,
  Sparkles
} from 'lucide-react';
import { sound } from '../utils/audioFeedback';

export const LeaderboardView = () => {
  const { user } = useApp();
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' | 'monthly' | 'allTime'
  const [searchQuery, setSearchQuery] = useState('');

  const currentList = LEADERBOARD_DATA[timeframe] || LEADERBOARD_DATA.weekly;

  const filteredList = currentList.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTabChange = (tf) => {
    sound.playClick();
    setTimeframe(tf);
  };

  return (
    <div className="latveria-view-container leaderboard-view">
      <LatveriaWatermark size={360} opacity={0.03} />

      {/* Header Banner */}
      <section className="leaderboard-header-card">
        <h1 className="leaderboard-title font-serif">Papan peringkat</h1>
      </section>

      {/* Controls & Filter Bar */}
      <div className="leaderboard-controls-bar">
        <div className="timeframe-pill-switch font-mono">
          {[
            { id: 'weekly', label: 'MINGGUAN // WEEKLY' },
            { id: 'monthly', label: 'BULANAN // MONTHLY' },
            { id: 'allTime', label: 'SEPANJANG MASA // ALL TIME' }
          ].map((tf) => (
            <button
              key={tf.id}
              type="button"
              className={`tf-btn ${timeframe === tf.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tf.id)}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="leaderboard-search-box">
          <Search size={15} className="text-muted" />
          <input
            type="text"
            className="search-input font-sans"
            placeholder="Cari kandidat atau nomor ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Podium Cards for Top 3 */}
      <div className="podium-trio-grid">
        {currentList.slice(0, 3).map((candidate, idx) => {
          const podiumRanks = ['RANK 01', 'RANK 02', 'RANK 03'];
          const podiumAccents = ['gold', 'silver', 'brass'];

          return (
            <div key={candidate.id} className={`podium-card podium-${podiumAccents[idx]}`}>
              <div className="podium-top font-mono">
                <span className="podium-rank-tag">{podiumRanks[idx]}</span>
                <span className="podium-id">{candidate.id}</span>
              </div>

              <div className="podium-crest">
                <LatveriaSeal size={42} />
              </div>

              <div className="podium-name-block">
                <h3 className="podium-candidate-name font-serif">{candidate.name}</h3>
                <span className="podium-status-tag font-mono">{candidate.status}</span>
              </div>

              <div className="podium-metrics-list font-mono">
                <div className="p-metric-row">
                  <span className="text-muted">LEVEL:</span>
                  <span className="font-bold">LVL {candidate.level}</span>
                </div>
                <div className="p-metric-row">
                  <span className="text-muted">TOTAL XP:</span>
                  <span className="text-gold font-bold">{candidate.xp.toLocaleString()} XP</span>
                </div>
                <div className="p-metric-row">
                  <span className="text-muted">AKURASI:</span>
                  <span className="text-sage">{candidate.accuracy}%</span>
                </div>
                <div className="p-metric-row">
                  <span className="text-muted">SOAL SELESAI:</span>
                  <span>{candidate.questions} Q</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Institutional Table Roster */}
      <div className="roster-table-container">
        <table className="roster-table" aria-label="Tabel Peringkat Akademik">
          <thead>
            <tr className="font-mono">
              <th className="th-rank">RANK</th>
              <th className="th-candidate">KANDIDAT & IDENTITAS</th>
              <th className="th-level">LEVEL</th>
              <th className="th-xp">ACCUMULATED XP</th>
              <th className="th-acc">ACCURACY</th>
              <th className="th-questions">QUESTIONS</th>
              <th className="th-status">INSTITUTIONAL STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((cand) => {
              const isUser = cand.isCurrentUser;
              return (
                <tr
                  key={cand.id}
                  className={`roster-row ${isUser ? 'user-highlight-row' : ''}`}
                >
                  <td className="td-rank font-mono">
                    <div className="rank-cell-wrapper">
                      {cand.rank <= 3 ? (
                        <span className="rank-crown-pill font-mono">#{cand.rank}</span>
                      ) : (
                        <span className="rank-num font-mono">#{cand.rank < 10 ? `0${cand.rank}` : cand.rank}</span>
                      )}
                    </div>
                  </td>

                  <td className="td-candidate">
                    <div className="candidate-cell">
                      <div className="avatar-chip font-serif">
                        {cand.name.charAt(0)}
                      </div>
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
                    <span className="level-badge">LVL {cand.level < 10 ? `0${cand.level}` : cand.level}</span>
                  </td>

                  <td className="td-xp font-mono">
                    <span className="text-gold font-bold">{cand.xp.toLocaleString()} XP</span>
                  </td>

                  <td className="td-acc font-mono">
                    <span className="text-sage font-bold">{cand.accuracy}%</span>
                  </td>

                  <td className="td-questions font-mono">
                    <span>{cand.questions} Q</span>
                  </td>

                  <td className="td-status font-mono">
                    <span className="cohort-status-tag">{cand.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
