import { useApp } from "../context/AppContext";
import { DashboardHeader } from "./ui/dashboard-shell";
import { AnimatedNumber } from "../lib/motion";
import { Volume2, VolumeX, Sun, Moon, Flame, Award } from "lucide-react";

export const HeaderBar = () => {
  const {
    user,
    theme,
    setTheme,
    soundEnabled,
    setSoundEnabled,
    setCurrentTab,
    toggleSidebar,
    sidebarOpen,
  } = useApp();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "parchment" : "dark");
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <DashboardHeader home="/" onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen}>
      {/* Streak Pill */}
      <div
        className="header-stat-pill transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] cursor-default"
        title={`Streak ${user.streakDays} hari. Selesaikan minimal satu latihan per hari WIB.${user.practicedToday ? " Latihan hari ini sudah selesai." : " Belum latihan hari ini."}`}
      >
        <Flame
          size={14}
          className="text-orange transition-transform duration-200 group-hover:scale-110"
        />
        <span className="stat-pill-val font-mono">
          <AnimatedNumber value={user.streakDays} />
        </span>
        <span className="stat-pill-label">DAY STREAK</span>
      </div>

      {/* XP Quick Pill */}
      <div
        className="header-stat-pill xp-pill transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        onClick={() => setCurrentTab("profile")}
        title="Klik untuk membuka Profil & Catatan Prestasi"
      >
        <Award
          size={14}
          className="text-gold transition-transform duration-200 group-hover:scale-110"
        />
        <span className="stat-pill-val font-mono">
          <AnimatedNumber value={user.totalXP} />
        </span>
        <span className="stat-pill-label">EXP</span>
      </div>

      {/* Sound Toggle */}
      <button
        type="button"
        id="sound-toggle-btn"
        className={`header-tool-btn transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 active:scale-95 ${soundEnabled ? "active" : ""}`}
        onClick={toggleSound}
        title={soundEnabled ? "Acoustic Sound: Aktif" : "Acoustic Sound: Hening"}
        aria-label="Toggle Efek Suara Taktil"
      >
        {soundEnabled ? (
          <Volume2 size={16} className="transition-transform duration-200" />
        ) : (
          <VolumeX size={16} className="transition-transform duration-200" />
        )}
      </button>

      {/* Theme Toggle (Dark Green Obsidian vs Imperial Parchment) */}
      <button
        type="button"
        id="theme-toggle-btn"
        className="header-tool-btn transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 active:scale-95"
        onClick={toggleTheme}
        title={
          theme === "dark" ? "Ganti ke Mode Imperial Parchment" : "Ganti ke Mode Latveria Obsidian"
        }
        aria-label="Toggle Tema Tampilan"
      >
        {theme === "dark" ? (
          <Sun size={16} className="transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon size={16} className="transition-transform duration-200 rotate-0 hover:-rotate-12" />
        )}
      </button>
    </DashboardHeader>
  );
};
