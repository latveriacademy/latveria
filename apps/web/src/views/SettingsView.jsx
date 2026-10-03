import React, { useState } from "react";
import { LogoutButton } from "../components/logout-button";
import { PageHeading } from "../components/ui/dashboard";
import { ConfirmDialog } from "../components/confirm-dialog";
import { useApp } from "../context/AppContext";
import { LatveriaWatermark } from "../components/LatveriaSeal";
import { Sun, Moon, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { sound } from "../utils/audioFeedback";

export const SettingsView = () => {
  const { theme, setTheme, soundEnabled, setSoundEnabled, showToast } = useApp();

  // Settings local state
  const [timerDuration, setTimerDuration] = useState(90);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleResetData = () => {
    sound.playSelect();
    setTheme("dark");
    setSoundEnabled(true);
    setTimerDuration(90);
    setShowConfirmReset(false);
    showToast("Preferensi direset", "Tema dan pengaturan lokal kembali ke nilai awal.", "info");
  };

  return (
    <div className="latveria-view-container settings-view">
      <LatveriaWatermark size={360} opacity={0.03} />

      {/* Header */}
      <PageHeading title="Setelan" />

      <div className="settings-sections-wrapper motion-fade-up">
        <section className="settings-group-panel transition-all duration-150 hover:border-[var(--edge-strong)]">
          <h2 className="group-title font-serif">Akun</h2>
          <div className="settings-items-list">
            <div className="setting-row">
              <LogoutButton className="btn-latveria-secondary" />
            </div>
          </div>
        </section>
        {/* Appearance Group */}
        <section className="settings-group-panel transition-all duration-150 hover:border-[var(--edge-strong)]">
          <div className="group-header">
            <span className="group-title font-serif">Tampilan & Estetika Antarmuka</span>
            <span className="group-sub font-mono">VISUAL ENVIRONMENT</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Tema Visual Latveria</span>
                <span className="setting-desc">
                  Pilih antara mode Latveria Obsidian (hutan hijau gelap) atau Imperial Parchment
                  (kertas arsip bertekstur).
                </span>
              </div>
              <div className="theme-toggle-options font-mono">
                <button
                  type="button"
                  className={`theme-opt-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => {
                    sound.playClick();
                    setTheme("dark");
                  }}
                >
                  <Moon size={16} />
                  <span>LATVERIA OBSIDIAN</span>
                </button>
                <button
                  type="button"
                  className={`theme-opt-btn ${theme === "parchment" ? "active" : ""}`}
                  onClick={() => {
                    sound.playClick();
                    setTheme("parchment");
                  }}
                >
                  <Sun size={16} />
                  <span>IMPERIAL PARCHMENT</span>
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Efek Suara Taktil (Web Audio Synth)</span>
                <span className="setting-desc">
                  Umpan balik klik mekanik dan denting institusional lembut saat interaksi sistem.
                </span>
              </div>
              <button
                type="button"
                className={`switch-btn font-mono ${soundEnabled ? "active" : ""}`}
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) sound.playClick();
                }}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 size={16} />
                    <span>AKTIF</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={16} />
                    <span>SENYAP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Practice Preferences Group */}
        <section className="settings-group-panel">
          <div className="group-header">
            <span className="group-title font-serif">Preferensi Latihan & Simulasi</span>
            <span className="group-sub font-mono">PRACTICE ENGINE CONFIGURATION</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">
                  Alokasi Waktu per Butir Soal (Timed Mode)
                </span>
                <span className="setting-desc">
                  Standar BP3 UTBK: Rata-rata 90 detik per soal untuk tes skolastik dan literasi.
                </span>
              </div>
              <div className="timer-select-group font-mono">
                {[60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`time-opt-btn ${timerDuration === dur ? "active" : ""}`}
                    onClick={() => {
                      sound.playClick();
                      setTimerDuration(dur);
                    }}
                  >
                    {dur} DETIK
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Mode Pembahasan Selesai Sesi</span>
                <span className="setting-desc">
                  Tampilkan seluruh anotasi mendalam, rujukan konsep, dan analisis jebakan di akhir
                  tes.
                </span>
              </div>
              <div className="badge-verified font-mono">STANDAR INSTITUSI (AKTIF)</div>
            </div>
          </div>
        </section>

        {/* Account & Archival Reset */}
        <section className="settings-group-panel danger-panel">
          <div className="group-header">
            <span className="group-title font-serif">Preferensi lokal</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Reset preferensi lokal</span>
                <span className="setting-desc">
                  Reset tema, suara, dan pengaturan latihan lokal. EXP dan streak tersimpan di
                  server.
                </span>
              </div>
              <button
                type="button"
                className="btn-reset-danger font-mono"
                onClick={() => setShowConfirmReset(true)}
              >
                <RotateCcw size={15} />
                <span>Reset preferensi</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showConfirmReset}
        onOpenChange={setShowConfirmReset}
        title="Reset preferensi lokal?"
        description="Tema, suara, dan pengaturan latihan lokal akan kembali ke nilai awal. Progres latihan tetap berasal dari data server."
        confirmLabel="Ya, reset preferensi"
        destructive
        onConfirm={handleResetData}
      />
    </div>
  );
};
