import React, { useState } from "react";
import { ProfileEditorDialog } from "../components/profile-editor-dialog";
import { useApp } from "../context/AppContext";
import { ACHIEVEMENTS_LIST } from "../data/achievementsData";
import {
  Award,
  Flame,
  ShieldCheck,
  Edit3,
  Crosshair,
  Moon,
  Archive,
  Layers,
  UserRound,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { PageHeading, ProgressBar } from "../components/ui/dashboard";
import { api } from "../lib/api";

export const ProfileView = () => {
  const { user, setUser, showToast, profileLoaded, profileError, loadProfile } = useApp();

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast("FORMAT TIDAK VALID", "Gunakan format JPG, PNG, WebP, atau GIF.", "error");
      return;
    }

    if (file.size < 5120) {
      showToast("FOTO TERLALU KECIL", "Ukuran foto minimal 5 KB.", "error");
      return;
    }

    if (file.size > 3145728) {
      showToast("FOTO TERLALU BESAR", "Ukuran foto maksimal 3 MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api("/learner/profile/avatar", {
        method: "POST",
        body: formData,
      });
      setUser((prev) => ({ ...prev, image: res.image }));
      sound.playSelect();
      showToast("FOTO DIPERBARUI", "Foto profil berhasil diperbarui.", "info");
    } catch (err) {
      showToast(
        "GAGAL UPLOAD",
        err instanceof Error ? err.message : "Gagal mengunggah foto profil.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setUploading(true);
    try {
      await api("/learner/profile/avatar", { method: "DELETE" });
      setUser((prev) => ({ ...prev, image: null }));
      sound.playClick();
      showToast("FOTO DIHAPUS", "Foto profil berhasil dihapus.", "info");
    } catch (err) {
      showToast(
        "GAGAL HAPUS",
        err instanceof Error ? err.message : "Gagal menghapus foto profil.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!profileLoaded || profileError)
    return (
      <div className="latveria-view-container profile-view">
        <PageHeading title="Profil" />
        {profileError ? (
          <>
            <p role="alert">{profileError}</p>
            <button type="button" className="btn-latveria-secondary" onClick={loadProfile}>
              Coba lagi
            </button>
          </>
        ) : (
          <p role="status">Memuat profil…</p>
        )}
      </div>
    );

  const getAchievementIcon = (iconName) => {
    switch (iconName) {
      case "Crosshair":
        return Crosshair;
      case "Flame":
        return Flame;
      case "Award":
        return Award;
      case "Moon":
        return Moon;
      case "Archive":
        return Archive;
      case "ShieldCheck":
        return ShieldCheck;
      case "Layers":
        return Layers;
      default:
        return Award;
    }
  };

  return (
    <div className="latveria-view-container profile-view">
      <PageHeading title="Profil" />

      {/* Official Academic ID Card / Dossier Record */}
      <section className="academic-id-card motion-fade-up">
        <div className="id-card-body">
          {/* Left: Avatar with Institutional Crest Frame */}
          <div className="id-avatar-column">
            <div className="id-photo-frame">
              <div className="id-photo-inner">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="id-photo-img" />
                ) : (
                  <UserRound
                    size={64}
                    className="text-gold"
                    role="img"
                    aria-label="Placeholder foto profil"
                  />
                )}
                {uploading && (
                  <div className="id-photo-overlay" aria-live="polite">
                    <Loader2 size={24} className="animate-spin text-gold" />
                  </div>
                )}
              </div>
            </div>

            <div className="id-avatar-actions">
              <label className="btn-avatar-action font-mono">
                <Camera size={12} />
                <span>{user.image ? "Ganti foto" : "Upload foto"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleAvatarUpload}
                />
              </label>

              {user.image && (
                <button
                  type="button"
                  className="btn-avatar-delete font-mono"
                  disabled={uploading}
                  onClick={handleAvatarDelete}
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn-edit-dossier font-mono transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={13} />
              <span>Edit profil</span>
            </button>
          </div>

          {/* Right: Academic Credentials & Metadata */}
          <div className="id-details-column">
            <div className="id-heading-group">
              <h2 className="id-candidate-name font-serif">{user.name}</h2>
            </div>

            <div className="id-info-grid font-mono">
              <div className="info-cell">
                <span className="info-lbl">Target PTN</span>
                <span className="info-val font-sans text-gold">{user.targetUniversity || "—"}</span>
              </div>
              <div className="info-cell">
                <span className="info-lbl">Nama panggilan</span>
                <span className="info-val font-sans">{user.codename || "—"}</span>
              </div>
              <div className="info-cell">
                <span className="info-lbl">Bio</span>
                <span className="info-val font-sans">{user.bio || "—"}</span>
              </div>
              {user.motto && (
                <div className="info-cell">
                  <span className="info-lbl">Motto</span>
                  <span className="info-val font-sans">{user.motto}</span>
                </div>
              )}
            </div>

            {/* Level and XP Progress */}
            <div className="id-xp-strip">
              <div className="id-xp-header font-mono">
                <span className="text-gold font-bold">
                  LEVEL {user.level < 10 ? `0${user.level}` : user.level}
                </span>
                <span>
                  {user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} XP (
                  {xpPercentage}%)
                </span>
              </div>
              <ProgressBar
                value={xpPercentage}
                label="EXP"
                className="id-xp-track"
                fillClassName="id-xp-fill"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Dual Grid: Subject Mastery & Institutional Achievements */}
      <div className="profile-grid-dual">
        {/* Left: UTBK 7-Subject Curriculum Mastery */}
        <section className="profile-panel mastery-panel motion-fade-up">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2 className="panel-title font-serif">Penguasaan subtes UTBK</h2>
            </div>
          </div>

          <div className="mastery-bars-list">
            {user.subjectMastery.map((item) => (
              <div key={item.id} className="mastery-item">
                <div className="mastery-info-row font-mono">
                  <div className="m-left">
                    <span className="m-code font-bold text-gold">{item.id}</span>
                    <span className="m-name font-sans">{item.name}</span>
                  </div>
                  <div className="m-right">
                    <span className="m-val">{item.mastery}%</span>
                    <span className="m-status text-sage font-serif">{item.status}</span>
                  </div>
                </div>
                <div className="mastery-track">
                  <div
                    className="mastery-fill transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]"
                    style={{ width: `${item.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Institutional Achievements / Records */}
        <section className="profile-panel achievements-panel motion-fade-up">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2 className="panel-title font-serif">Prestasi</h2>
            </div>
          </div>

          <div className="achievements-card-list">
            {ACHIEVEMENTS_LIST.map((ach) => {
              const Icon = getAchievementIcon(ach.icon);

              return (
                <div
                  key={ach.id}
                  className={`achievement-tile ${ach.unlocked ? "is-unlocked" : "is-locked"}`}
                >
                  <div className="ach-icon-cell">
                    <div className="ach-icon-circle">
                      <Icon size={20} className={ach.unlocked ? "text-gold" : "text-muted"} />
                    </div>
                  </div>

                  <div className="ach-info-cell">
                    <div className="ach-title-row">
                      <h4 className="ach-title font-serif">{ach.title}</h4>
                      <span className="ach-code-badge font-mono">{ach.code}</span>
                    </div>
                    <p className="ach-desc font-sans">{ach.description}</p>

                    {ach.unlocked ? (
                      <div className="ach-date font-mono text-sage">
                        DIVERIFIKASI: {ach.unlockedAt} • +{ach.xpReward} XP
                      </div>
                    ) : (
                      <div className="ach-progress-row font-mono">
                        <div className="ach-prog-track">
                          <div
                            className="ach-prog-fill"
                            style={{ width: `${(ach.currentProgress / ach.target) * 100}%` }}
                          />
                        </div>
                        <span className="text-muted">
                          {ach.currentProgress} / {ach.target}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <ProfileEditorDialog
          profile={user}
          onOpenChange={setIsEditing}
          onSaved={(profile) => {
            setUser((previous) => ({ ...previous, ...profile }));
            sound.playSelect();
            setIsEditing(false);
            showToast("Profil disimpan", "", "success");
          }}
        />
      )}
    </div>
  );
};
