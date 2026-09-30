import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LatveriaSeal } from './LatveriaSeal';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Flame,
  Award,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const HeaderBar = () => {
  const { user, theme, setTheme, soundEnabled, setSoundEnabled, setCurrentTab } = useApp();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'parchment' : 'dark');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <header className="latveria-header-bar" role="banner">
      {/* Mobile Branding (Visible only on small screens) */}
      <div className="mobile-brand-slot">
        <LatveriaSeal size={32} />
        <div className="mobile-brand-text">
          <span className="mobile-title">latveriacademy</span>
        </div>
      </div>

      {/* Institutional Metadata & Clocks */}
      <div className="header-meta-group">

        <div className="live-clock-panel font-mono">
          <Clock size={13} className="text-gold" />
          <span>{dateStr}</span>
          <span className="divider-slash">/</span>
          <span className="clock-digits">{timeStr}</span>
          <span className="timezone-tag">WIB</span>
        </div>
      </div>

      {/* Header Quick Controls */}
      <div className="header-actions-group">
        {/* Streak Pill */}
        <div
          className="header-stat-pill"
          title={`Streak: ${user.streakDays} Hari Belajar Berturut-turut`}
        >
          <Flame size={14} className="text-orange" />
          <span className="stat-pill-val font-mono">{user.streakDays}</span>
          <span className="stat-pill-label">DAY STREAK</span>
        </div>

        {/* XP Quick Pill */}
        <div
          className="header-stat-pill xp-pill"
          onClick={() => setCurrentTab('profile')}
          title="Klik untuk membuka Profil & Catatan Prestasi"
        >
          <Award size={14} className="text-gold" />
          <span className="stat-pill-val font-mono">{user.currentXP.toLocaleString()}</span>
          <span className="stat-pill-label">XP</span>
        </div>

        {/* Sound Toggle */}
        <button
          type="button"
          id="sound-toggle-btn"
          className={`header-tool-btn ${soundEnabled ? 'active' : ''}`}
          onClick={toggleSound}
          title={soundEnabled ? 'Acoustic Sound: Aktif' : 'Acoustic Sound: Hening'}
          aria-label="Toggle Efek Suara Taktil"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Theme Toggle (Dark Green Obsidian vs Imperial Parchment) */}
        <button
          type="button"
          id="theme-toggle-btn"
          className="header-tool-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Mode Imperial Parchment' : 'Ganti ke Mode Latveria Obsidian'}
          aria-label="Toggle Tema Tampilan"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Quick Profile Avatar */}
        <button
          type="button"
          id="header-profile-btn"
          className="header-avatar-btn"
          onClick={() => setCurrentTab('profile')}
          title="Dossier Akademik"
        >
          <span className="avatar-initials font-serif">{user.name?.slice(0, 1)}</span>
        </button>
      </div>
    </header>
  );
};
