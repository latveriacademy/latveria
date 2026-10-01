import { useApp } from '../context/AppContext';
import { DashboardHeader } from './ui/dashboard-shell';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Flame,
  Award,
} from 'lucide-react';

export const HeaderBar = () => {
  const { user, theme, setTheme, soundEnabled, setSoundEnabled, setCurrentTab, toggleSidebar, sidebarOpen } = useApp();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'parchment' : 'dark');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <DashboardHeader home="/dashboard" onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen}>
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

    </DashboardHeader>
  );
};
