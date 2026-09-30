import React, { useState } from 'react';
import { LogoutButton } from '../components/logout-button';
import { useApp } from '../context/AppContext';
import { LatveriaWatermark } from '../components/LatveriaSeal';
import {
  Settings,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Clock,
  Shield,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Bell,
  Sparkles
} from 'lucide-react';
import { sound } from '../utils/audioFeedback';
import { DEFAULT_USER } from '../data/userData';

export const SettingsView = () => {
  const {
    theme,
    setTheme,
    soundEnabled,
    setSoundEnabled,
    user,
    setUser,
    showToast
  } = useApp();

  // Settings local state
  const [timerDuration, setTimerDuration] = useState(90);
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleResetData = () => {
    sound.playSelect();
    setUser(DEFAULT_USER);
    localStorage.removeItem('latveria_user');
    setShowConfirmReset(false);
    showToast('DATA TERESET', 'Sistem Latveria telah dikembalikan ke kalibrasi awal.', 'info');
  };

  return (
    <div className="latveria-view-container settings-view">
      <LatveriaWatermark size={360} opacity={0.03} />

      {/* Header */}
      <section className="settings-header-card">
        <h1 className="settings-title font-serif">Pengaturan</h1>
      </section>

      <div className="settings-sections-wrapper">
        <section className="settings-group-panel">
          <h2 className="group-title font-serif">Akun</h2>
          <div className="settings-items-list">
            <div className="setting-row">
              <LogoutButton className="btn-latveria-secondary" />
            </div>
          </div>
        </section>
        {/* Appearance Group */}
        <section className="settings-group-panel">
          <div className="group-header">
            <span className="group-title font-serif">Tampilan & Estetika Antarmuka</span>
            <span className="group-sub font-mono">VISUAL ENVIRONMENT</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Tema Visual Latveria</span>
                <span className="setting-desc">
                  Pilih antara mode Latveria Obsidian (hutan hijau gelap) atau Imperial Parchment (kertas arsip bertekstur).
                </span>
              </div>
              <div className="theme-toggle-options font-mono">
                <button
                  type="button"
                  className={`theme-opt-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    sound.playClick();
                    setTheme('dark');
                  }}
                >
                  <Moon size={16} />
                  <span>LATVERIA OBSIDIAN</span>
                </button>
                <button
                  type="button"
                  className={`theme-opt-btn ${theme === 'parchment' ? 'active' : ''}`}
                  onClick={() => {
                    sound.playClick();
                    setTheme('parchment');
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
                className={`switch-btn font-mono ${soundEnabled ? 'active' : ''}`}
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
                <span className="setting-name font-sans">Alokasi Waktu per Butir Soal (Timed Mode)</span>
                <span className="setting-desc">
                  Standar BP3 UTBK: Rata-rata 90 detik per soal untuk tes skolastik dan literasi.
                </span>
              </div>
              <div className="timer-select-group font-mono">
                {[60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`time-opt-btn ${timerDuration === dur ? 'active' : ''}`}
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
                  Tampilkan seluruh anotasi mendalam, rujukan konsep, dan analisis jebakan di akhir tes.
                </span>
              </div>
              <div className="badge-verified font-mono">STANDAR INSTITUSI (AKTIF)</div>
            </div>
          </div>
        </section>

        {/* Account & Archival Reset */}
        <section className="settings-group-panel danger-panel">
          <div className="group-header">
            <span className="group-title font-serif text-crimson">Kalibrasi & Reset Arsip</span>
            <span className="group-sub font-mono text-crimson">MAINTENANCE PROTOCOL</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Reset Rekam Jejak Belajar</span>
                <span className="setting-desc">
                  Kembalikan nilai XP, streak, dan progres subtes ke kondisi awal kadet terdaftar.
                </span>
              </div>
              <button
                type="button"
                className="btn-reset-danger font-mono"
                onClick={() => setShowConfirmReset(true)}
              >
                <RotateCcw size={15} />
                <span>RESET REKAM JEJAK</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div className="modal-backdrop" onClick={() => setShowConfirmReset(false)}>
          <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-stamp-mono font-mono text-crimson">
                <span className="dot-stamp" style={{ background: '#b44343' }} />
                <span>IRREVERSIBLE ACTION CONFIRMATION</span>
              </div>
              <h2 className="modal-title font-serif text-crimson">Konfirmasi Reset Arsip</h2>
            </div>
            <p className="modal-prompt-text font-serif">
              Apakah Anda yakin ingin mengatur ulang data perkembangan belajar kadet #{user.id}? Tindakan ini akan mengembalikan XP dan statistik ke konfigurasi awal institusi.
            </p>
            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn-latveria-secondary"
                onClick={() => setShowConfirmReset(false)}
              >
                BATALKAN
              </button>
              <button
                type="button"
                className="btn-latveria-primary btn-crimson-solid font-mono"
                onClick={handleResetData}
              >
                <span>YA, RESET ARSIP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
