import React, { useEffect, useState } from "react";
import { LogoutButton } from "../components/logout-button";
import { PageHeading } from "../components/ui/dashboard";
import { ConfirmDialog } from "../components/confirm-dialog";
import { useApp } from "../context/AppContext";
import { LatveriaWatermark } from "../components/LatveriaSeal";
import { Sun, Moon, Volume2, VolumeX, RotateCcw, Link2, CheckCircle2 } from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { authClient } from "../lib/auth-client";
import { api } from "../lib/api";

export const SettingsView = () => {
  const { theme, setTheme, soundEnabled, setSoundEnabled, showToast } = useApp();

  // Settings local state
  const [timerDuration, setTimerDuration] = useState(90);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Linked accounts state
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [discordLoading, setDiscordLoading] = useState(false);

  const fetchAccounts = () => {
    api("/learner/linked-accounts")
      .then((data) => setLinkedAccounts(data.accounts || []))
      .catch(() => setLinkedAccounts([]));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const discordAccount = linkedAccounts.find((a) => a.providerId === "discord");

  const handleLinkDiscord = async () => {
    sound.playSelect();
    setDiscordLoading(true);
    try {
      await authClient.linkSocial({
        provider: "discord",
        callbackURL: `${window.location.origin}/dashboard?tab=settings`,
      });
    } catch {
      showToast("Gagal Menautkan", "Terjadi kesalahan saat memulai koneksi Discord.", "error");
      setDiscordLoading(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!discordAccount) return;
    sound.playSelect();
    setDiscordLoading(true);
    try {
      const res = await authClient.unlinkAccount({ accountId: discordAccount.id });
      if (res.error) throw new Error(res.error.message);
      showToast("Tautan Diputus", "Akun Discord berhasil dilepas dari profil ini.", "success");
      fetchAccounts();
    } catch (err) {
      showToast("Gagal Melepas Akun", err.message || "Tidak dapat memutus akun saat ini.", "error");
    } finally {
      setDiscordLoading(false);
    }
  };

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

        {/* Integrasi Akun Pihak Ketiga */}
        <section className="settings-group-panel transition-all duration-150 hover:border-[var(--edge-strong)]">
          <div className="group-header">
            <span className="group-title font-serif">Integrasi & Tautan Akun</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans flex items-center gap-2">
                  <svg className="w-4 h-4 fill-[#5865F2]" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Discord</span>
                  {discordAccount ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Terhubung
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[var(--ink-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded border border-[var(--edge)]">
                      Belum Terhubung
                    </span>
                  )}
                </span>
                <span className="setting-desc">
                  {discordAccount
                    ? `Akun Discord (ID: ${discordAccount.accountId}) terhubung untuk akses instan.`
                    : "Hubungkan Discord untuk login langsung tanpa memasukkan email dan kata sandi."}
                </span>
              </div>
              <div>
                {discordAccount ? (
                  <button
                    type="button"
                    disabled={discordLoading}
                    onClick={handleUnlinkDiscord}
                    className="btn-latveria-secondary text-xs px-3 py-1.5 rounded text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                  >
                    {discordLoading ? "Memproses…" : "Putuskan Tautan"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={discordLoading}
                    onClick={handleLinkDiscord}
                    className="btn-latveria-secondary text-xs px-3 py-1.5 rounded flex items-center gap-1.5 border-[#5865F2]/40 hover:bg-[#5865F2]/10 hover:border-[#5865F2] text-[var(--ink)]"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#5865F2]" />
                    <span>{discordLoading ? "Mengarahkan…" : "Hubungkan"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        {/* Appearance Group */}
        <section className="settings-group-panel transition-all duration-150 hover:border-[var(--edge-strong)]">
          <div className="group-header">
            <span className="group-title font-serif">Tampilan & Tema</span>
          </div>

          <div className="settings-items-list">
            <div className="setting-row">
              <div className="setting-meta">
                <span className="setting-name font-sans">Tema Visual</span>
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
                <span className="setting-name font-sans">Efek Suara Audio</span>
                <span className="setting-desc">
                  Umpan balik audio lembut saat memilih jawaban, mengumpulkan latihan, dan navigasi.
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
              <div className="badge-verified font-mono">AKTIF</div>
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
