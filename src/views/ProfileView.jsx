import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ACHIEVEMENTS_LIST } from '../data/achievementsData';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
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
  FileBadge
} from 'lucide-react';
import { sound } from '../utils/audioFeedback';

export const ProfileView = () => {
  const { user, setUser, showToast } = useApp();

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    codename: user.codename,
    bio: user.bio,
    motto: user.motto,
    targetUniversity: user.targetUniversity
  });

  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));

  const handleSaveProfile = (e) => {
    e.preventDefault();
    sound.playSelect();
    setUser((prev) => ({
      ...prev,
      name: formData.name,
      codename: formData.codename,
      bio: formData.bio,
      motto: formData.motto,
      targetUniversity: formData.targetUniversity
    }));
    setIsEditing(false);
    showToast('DOSSIER DIUPDATE', 'Data profil kadet berhasil diperbarui dalam arsip.', 'success');
  };

  const getAchievementIcon = (iconName) => {
    switch (iconName) {
      case 'Crosshair': return Crosshair;
      case 'Flame': return Flame;
      case 'Award': return Award;
      case 'Moon': return Moon;
      case 'Archive': return Archive;
      case 'ShieldCheck': return ShieldCheck;
      case 'Layers': return Layers;
      default: return Award;
    }
  };

  return (
    <div className="latveria-view-container profile-view">
      <LatveriaWatermark size={380} opacity={0.03} />

      {/* Official Academic ID Card / Dossier Record */}
      <section className="academic-id-card">
        {/* Background Decorative Guilloche / Border Pattern */}
        <div className="id-card-top-strip font-mono">
          <div className="id-strip-left">
            <span className="dot-stamp" />
            <span>LATVERIA ACADEMIC ARCHIVES // STUDENT DOSSIER RECORD</span>
          </div>
          <div className="id-strip-right">
            <span>CLEARANCE: {user.securityClearance}</span>
          </div>
        </div>

        <div className="id-card-body">
          {/* Left: Avatar with Institutional Crest Frame */}
          <div className="id-avatar-column">
            <div className="id-photo-frame">
              <div className="id-photo-inner">
                <span className="id-photo-initial font-serif">{user.name.charAt(0)}</span>
                <div className="official-stamp-watermark font-mono">
                  VERIFIED<br />LATVERIA
                </div>
              </div>
              <div className="id-badge-tier font-mono">CADET-0824</div>
            </div>

            <button
              type="button"
              className="btn-edit-dossier font-mono"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={13} />
              <span>EDIT DOSSIER</span>
            </button>
          </div>

          {/* Right: Academic Credentials & Metadata */}
          <div className="id-details-column">
            <div className="id-heading-group">
              <div className="id-meta-line font-mono">
                <span className="text-gold font-bold">ID: {user.id}</span>
                <span className="meta-dot">•</span>
                <span className="text-sage font-bold">STATUS: {user.status}</span>
                <span className="meta-dot">•</span>
                <span>SINCE: {user.joinedDate}</span>
              </div>
              <h1 className="id-candidate-name font-serif">{user.name}</h1>
              <p className="id-motto font-serif italic">"{user.motto}"</p>
            </div>

            <div className="id-info-grid font-mono">
              <div className="info-cell">
                <span className="info-lbl">INSTITUSI:</span>
                <span className="info-val font-sans">{user.institution}</span>
              </div>
              <div className="info-cell">
                <span className="info-lbl">TARGET PTN (P1):</span>
                <span className="info-val font-sans text-gold">{user.targetUniversity}</span>
              </div>
              <div className="info-cell">
                <span className="info-lbl">CODENAME:</span>
                <span className="info-val font-sans">{user.codename}</span>
              </div>
              <div className="info-cell">
                <span className="info-lbl">CATATAN EVALUASI:</span>
                <span className="info-val font-sans">{user.bio}</span>
              </div>
            </div>

            {/* Level and XP Progress */}
            <div className="id-xp-strip">
              <div className="id-xp-header font-mono">
                <span className="text-gold font-bold">LEVEL {user.level < 10 ? `0${user.level}` : user.level}</span>
                <span>{user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} XP ({xpPercentage}%)</span>
              </div>
              <div className="id-xp-track">
                <div className="id-xp-fill" style={{ width: `${xpPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dual Grid: Subject Mastery & Institutional Achievements */}
      <div className="profile-grid-dual">
        {/* Left: UTBK 7-Subject Curriculum Mastery */}
        <section className="profile-panel mastery-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">DIAGNOSTIC MATRIX</span>
              <h2 className="panel-title font-serif">PENGUASAAN SUBTES UTBK</h2>
            </div>
            <span className="badge-record-archive font-mono">7 DOMAIN</span>
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
                    className="mastery-fill"
                    style={{ width: `${item.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Institutional Achievements / Records */}
        <section className="profile-panel achievements-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-eyebrow font-mono">HONORARY PROTOCOLS</span>
              <h2 className="panel-title font-serif">CATATAN PRESTASI & PENGHARGAAN</h2>
            </div>
            <span className="badge-record-archive font-mono">ARCHIVED</span>
          </div>

          <div className="achievements-card-list">
            {ACHIEVEMENTS_LIST.map((ach) => {
              const Icon = getAchievementIcon(ach.icon);

              return (
                <div
                  key={ach.id}
                  className={`achievement-tile ${ach.unlocked ? 'is-unlocked' : 'is-locked'}`}
                >
                  <div className="ach-icon-cell">
                    <div className="ach-icon-circle">
                      <Icon size={20} className={ach.unlocked ? 'text-gold' : 'text-muted'} />
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
        <div className="modal-backdrop" onClick={() => setIsEditing(false)}>
          <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-stamp-mono font-mono">
                <span className="dot-stamp" />
                <span>DOSSIER MODIFICATION PROTOCOL</span>
              </div>
              <h2 className="modal-title font-serif">Edit Catatan Akademik</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-body-form">
              <div className="form-group">
                <label className="form-label-mono font-mono">NAMA LENGKAP KANDIDAT</label>
                <input
                  type="text"
                  className="latveria-input font-sans"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-mono font-mono">CODENAME / PANGGILAN</label>
                <input
                  type="text"
                  className="latveria-input font-sans"
                  value={formData.codename}
                  onChange={(e) => setFormData({ ...formData, codename: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-mono font-mono">TARGET UNIVERSITAS & PROGRAM STUDI</label>
                <input
                  type="text"
                  className="latveria-input font-sans"
                  value={formData.targetUniversity}
                  onChange={(e) => setFormData({ ...formData, targetUniversity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-mono font-mono">MOTTO AKADEMIK</label>
                <input
                  type="text"
                  className="latveria-input font-serif"
                  value={formData.motto}
                  onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-mono font-mono">CATATAN DEDIKASI / BIO</label>
                <textarea
                  rows="3"
                  className="latveria-input font-sans"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-latveria-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="btn-latveria-primary btn-gold-solid font-mono"
                >
                  <Check size={16} />
                  <span>SIMPAN DOSSIER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
