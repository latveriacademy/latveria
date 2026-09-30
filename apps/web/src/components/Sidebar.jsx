import React from 'react';
import { useApp } from '../context/AppContext';
import { LatveriaSeal } from './LatveriaSeal';
import { LogoutButton } from './logout-button';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  User,
  Settings,
  Shield,
  Flame,
  Award,
  CircleDot
} from 'lucide-react';

export const Sidebar = () => {
  const { currentTab, setCurrentTab, user, soundEnabled, setSoundEnabled } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Beranda',
      sublabel: 'Command Center',
      index: '01',
      icon: LayoutDashboard
    },
    {
      id: 'practice',
      label: 'Latihan',
      sublabel: 'Modul Pelatihan',
      index: '02',
      icon: BookOpen
    },
    {
      id: 'leaderboard',
      label: 'Peringkat',
      sublabel: 'Peringkat Kohort',
      index: '03',
      icon: Trophy
    },
    {
      id: 'profile',
      label: 'Profil',
      sublabel: 'Dossier Akademik',
      index: '04',
      icon: User
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      sublabel: 'Preferensi Sistem',
      index: '05',
      icon: Settings
    }
  ];

  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  return (
    <aside className="latveria-sidebar" aria-label="Navigasi Utama Latveria">
      {/* Institutional Header & Crest */}
      <div className="sidebar-brand-wrapper">
        <div className="brand-crest-box">
          <LatveriaSeal size={40} />
        </div>
        <div className="brand-text-block">
          <h1 className="brand-name">latveriacademy</h1>
        </div>
      </div>

      {/* Security & Cadet Dossier Badge */}
      <div className="sidebar-user-dossier">
        <div className="dossier-top">
          <span className="dossier-code">{user.id}</span>
          <span className="dossier-status">
            <span className="status-blink-dot" />
            ONLINE
          </span>
        </div>
        <div className="dossier-name-row">
          <span className="dossier-name">{user.name}</span>
          <span className="dossier-badge">LVL {user.level < 10 ? `0${user.level}` : user.level}</span>
        </div>

        {/* Progress Bar */}
        <div className="dossier-xp-container">
          <div className="dossier-xp-labels">
            <span className="xp-metric-text">{user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} XP</span>
            <span className="xp-percentage-text">{xpPercentage}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={xpPercentage} aria-valuemin="0" aria-valuemax="100">
            <div className="progress-fill gold-gradient" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  type="button"
                  id={`nav-btn-${item.id}`}
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentTab(item.id)}
                >
                  <span className="nav-icon-wrap">
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
                  </span>
                  <div className="nav-label-box">
                    <span className="nav-main-label">{item.label}</span>
                  </div>
                  {isActive && <span className="nav-active-pip" />}
                </button>
              </li>
            );
          })}
          {user?.role === 'admin' && (
            <li className="nav-item">
              <a
                href="/admin"
                id="nav-btn-admin"
                className="nav-button"
              >
                <span className="nav-index-mono font-mono text-gold">ADM</span>
                <span className="nav-icon-wrap">
                  <Shield size={18} className="text-gold" />
                </span>
                <div className="nav-label-box">
                  <span className="nav-main-label text-gold">Admin Portal</span>
                  <span className="nav-sub-label">Bank Soal & Pengelolaan</span>
                </div>
              </a>
            </li>
          )}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <LogoutButton className="nav-button" />
      </div>

    </aside>
  );
};
