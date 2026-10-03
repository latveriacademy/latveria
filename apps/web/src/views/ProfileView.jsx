import React, { useState, useRef, useEffect } from "react";
import { profileSchema } from "@latveria/shared";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { ACHIEVEMENTS_LIST } from "../data/achievementsData";
import { LatveriaSeal, LatveriaWatermark } from "../components/LatveriaSeal";
import {
  Award,
  Flame,
  Target,
  Clock,
  ShieldCheck,
  Edit3,
  Check,
  BookOpen,
  Crosshair,
  Moon,
  Archive,
  Layers,
  GraduationCap,
  Sparkles,
  FileBadge,
} from "lucide-react";
import { UserRound } from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { PageHeading, ProgressBar } from "../components/ui/dashboard";

export const ProfileView = () => {
  const { user, setUser, showToast, profileLoaded, profileError, loadProfile } = useApp();

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    if (isEditing) dialog.current?.showModal();
  }, [isEditing]);
  const [formData, setFormData] = useState({
    name: user.name,
    codename: user.codename,
    bio: user.bio,
    motto: user.motto,
    targetUniversity: user.targetUniversity,
  });

  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (pending) return;
    setSaveError("");
    const parsed = profileSchema.safeParse(formData);
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    try {
      const profile = await api("/learner/profile", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      setUser((prev) => ({ ...prev, ...profile }));
      sound.playSelect();
      setIsEditing(false);
      showToast("Profil disimpan", "", "success");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan profil. Coba lagi.");
    } finally {
      setPending(false);
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
                <UserRound
                  size={64}
                  className="text-gold"
                  role="img"
                  aria-label="Placeholder foto profil"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-edit-dossier font-mono transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => {
                setFormData({
                  name: user.name,
                  codename: user.codename,
                  targetUniversity: user.targetUniversity,
                  motto: user.motto,
                  bio: user.bio,
                });
                setSaveError("");
                setIsEditing(true);
              }}
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
        <dialog
          ref={dialog}
          className="profile-edit-dialog"
          aria-labelledby="edit-profile-title"
          onCancel={(event) => {
            if (pending) event.preventDefault();
            else setIsEditing(false);
          }}
        >
          <div className="config-modal-card">
            <div className="modal-header">
              <h2 id="edit-profile-title" className="modal-title font-serif">
                Edit profil
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-body-form">
              <div className="form-group">
                <label htmlFor="profile-name" className="form-label-mono font-mono">
                  Nama
                </label>
                <input
                  type="text"
                  id="profile-name"
                  autoComplete="name"
                  maxLength={100}
                  disabled={pending}
                  className="latveria-input font-sans"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-codename" className="form-label-mono font-mono">
                  Nama panggilan
                </label>
                <input
                  type="text"
                  id="profile-codename"
                  autoComplete="nickname"
                  maxLength={100}
                  disabled={pending}
                  className="latveria-input font-sans"
                  value={formData.codename}
                  onChange={(e) => setFormData({ ...formData, codename: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-target" className="form-label-mono font-mono">
                  Target PTN dan program studi
                </label>
                <input
                  type="text"
                  id="profile-target"
                  maxLength={200}
                  disabled={pending}
                  className="latveria-input font-sans"
                  value={formData.targetUniversity}
                  onChange={(e) => setFormData({ ...formData, targetUniversity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-motto" className="form-label-mono font-mono">
                  Motto
                </label>
                <input
                  type="text"
                  id="profile-motto"
                  maxLength={200}
                  disabled={pending}
                  className="latveria-input font-serif"
                  value={formData.motto}
                  onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-bio" className="form-label-mono font-mono">
                  Bio
                </label>
                <textarea
                  rows="3"
                  id="profile-bio"
                  maxLength={500}
                  disabled={pending}
                  className="latveria-input font-sans"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              {saveError && <p role="alert">{saveError}</p>}
              <div className="modal-actions-footer">
                <button
                  type="button"
                  disabled={pending}
                  className="btn-latveria-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-latveria-primary btn-gold-solid font-mono"
                >
                  <Check size={16} />
                  <span>{pending ? "Menyimpan…" : "Simpan perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
};
