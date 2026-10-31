import React, { useEffect, useState, useCallback } from "react";
import {
  Award,
  Calendar,
  Check,
  Flame,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  Swords,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import type { PublicLearnerProfile } from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { AppDialog } from "../app-dialog";
import { Button } from "../ui/button";

interface PublicProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConnectChanged?: () => void;
}

export function PublicProfileModal({
  userId,
  isOpen,
  onClose,
  onConnectChanged,
}: PublicProfileModalProps) {
  const { user: currentUser, setCurrentTab } = useApp();
  const [profile, setProfile] = useState<PublicLearnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setConfirmDelete(false);
    try {
      const data = await api<PublicLearnerProfile>(`/learner/profile/${id}`);
      setProfile(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat profil pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      void fetchProfile(userId);
    } else {
      setProfile(null);
      setError(null);
      setActionError(null);
      setConfirmDelete(false);
    }
  }, [isOpen, userId, fetchProfile]);

  const handleSendRequest = async () => {
    if (!profile || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await api("/friends/request", {
        method: "POST",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile((prev) => (prev ? { ...prev, friendshipStatus: "pending_outgoing" } : null));
      onConnectChanged?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal mengirim permintaan koneksi.");
    } finally {
      setActionPending(false);
    }
  };

  const handleRespond = async (action: "accept" | "decline") => {
    if (!profile || !profile.friendshipId || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await api(`/friends/request/${profile.friendshipId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (action === "accept") {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                friendshipStatus: "friends",
                connectedCount: prev.connectedCount + 1,
              }
            : null,
        );
      } else {
        setProfile((prev) =>
          prev ? { ...prev, friendshipStatus: "none", friendshipId: null } : null,
        );
      }
      onConnectChanged?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal merespons permintaan koneksi.");
    } finally {
      setActionPending(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await api(`/friends/${profile.id}`, { method: "DELETE" });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: "none",
              friendshipId: null,
              connectedCount: Math.max(0, prev.connectedCount - 1),
            }
          : null,
      );
      setConfirmDelete(false);
      onConnectChanged?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus pertemanan.");
    } finally {
      setActionPending(false);
    }
  };

  const handleOpenChat = () => {
    if (!profile) return;
    onClose();
    setCurrentTab("chat", { dm: profile.id });
  };

  const handleInviteBattle = () => {
    if (!profile) return;
    onClose();
    setCurrentTab("warrior");
  };

  const isSelf = profile?.id === currentUser?.id || profile?.friendshipStatus === "self";

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Profil Siswa"
      className="max-w-md w-full"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Memuat profil…</span>
        </div>
      ) : error || !profile ? (
        <div className="py-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-danger mx-auto opacity-80" />
          <p className="text-sm text-danger font-medium">{error || "Profil tidak ditemukan."}</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Header Card */}
          <div className="flex items-start gap-3.5 pb-4 border-b border-[var(--edge)]">
            <div className="relative">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[var(--edge)] ring-2 ring-gold/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--surface-muted)] border-2 border-[var(--edge)] flex items-center justify-center text-lg font-bold text-gold ring-2 ring-gold/20">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {profile.friendshipStatus === "friends" && (
                <span
                  title="Connected / Berteman"
                  className="absolute -bottom-1 -right-1 bg-sage text-black rounded-full p-0.5 border border-[var(--surface)]"
                >
                  <UserCheck size={12} />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-[var(--ink)] leading-snug truncate">
                  {profile.name}
                </h3>
                {profile.friendshipStatus === "friends" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-sage/15 text-sage border border-sage/30">
                    <Check size={10} /> Connected
                  </span>
                )}
                {profile.friendshipStatus === "pending_outgoing" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-gold/15 text-gold border border-gold/30">
                    Terkirim
                  </span>
                )}
                {profile.friendshipStatus === "pending_incoming" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-accent/20 text-accent border border-accent/30 animate-pulse">
                    Minta Koneksi
                  </span>
                )}
              </div>

              {profile.codename && (
                <p className="text-xs font-mono text-[var(--ink-muted)]">@{profile.codename}</p>
              )}

              {profile.targetUniversity ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gold/90 truncate">
                  <GraduationCap size={13} className="shrink-0" />
                  <span className="truncate">{profile.targetUniversity}</span>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--ink-muted)] mt-1 italic">
                  Belum menetapkan target PTN
                </div>
              )}
            </div>
          </div>

          {/* Bio & Motto */}
          {(profile.bio || profile.motto) && (
            <div className="space-y-2 text-xs bg-[var(--surface-muted)]/50 p-3 rounded-lg border border-[var(--edge)]">
              {profile.motto && <p className="italic text-gold font-serif">“{profile.motto}”</p>}
              {profile.bio && (
                <p className="text-[var(--ink-muted)] leading-relaxed">{profile.bio}</p>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-[var(--surface-muted)]/40 border border-[var(--edge)]">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Award size={12} className="text-gold" />
                <span>LEVEL & XP</span>
              </div>
              <div className="font-mono font-bold text-sm text-[var(--ink)]">
                LVL {profile.level}
              </div>
              <div className="text-[10px] font-mono text-gold truncate">
                {profile.totalXP.toLocaleString()} XP
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface-muted)]/40 border border-[var(--edge)]">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Flame size={12} className="text-amber-500" />
                <span>STREAK</span>
              </div>
              <div className="font-mono font-bold text-sm text-[var(--ink)]">
                {profile.streakDays} Hari
              </div>
              <div className="text-[10px] font-mono text-[var(--ink-muted)]">Konsisten</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface-muted)]/40 border border-[var(--edge)]">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Users size={12} className="text-sky-400" />
                <span>KONEKSI</span>
              </div>
              <div className="font-mono font-bold text-sm text-[var(--ink)]">
                {profile.connectedCount}
              </div>
              <div className="text-[10px] font-mono text-[var(--ink-muted)]">Teman</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface-muted)]/40 border border-[var(--edge)]">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Calendar size={12} className="text-sage" />
                <span>AKURASI</span>
              </div>
              <div className="font-mono font-bold text-sm text-[var(--ink)]">
                {profile.accuracy !== null && profile.accuracy !== undefined
                  ? `${profile.accuracy}%`
                  : "Privat"}
              </div>
              <div className="text-[10px] font-mono text-[var(--ink-muted)]">
                {profile.totalAnswered !== null && profile.totalAnswered !== undefined
                  ? `${profile.totalAnswered} Soal`
                  : "Detail rahasia"}
              </div>
            </div>
          </div>

          {/* Action Error Message */}
          {actionError && (
            <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
              {actionError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
            {isSelf ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs"
                onClick={() => {
                  onClose();
                  setCurrentTab("profile");
                }}
              >
                Buka Profil Saya
              </Button>
            ) : profile.friendshipStatus === "friends" ? (
              confirmDelete ? (
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <span className="text-[11px] text-danger">Hapus koneksi?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setConfirmDelete(false)}
                    disabled={actionPending}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-7 px-2.5 bg-danger text-white hover:bg-danger/90"
                    onClick={handleRemoveFriend}
                    disabled={actionPending}
                  >
                    Ya, Putus
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-danger/80 hover:text-danger hover:bg-danger/10"
                    onClick={() => setConfirmDelete(true)}
                    disabled={actionPending}
                  >
                    <UserX size={13} className="mr-1.5" />
                    Putus Koneksi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleInviteBattle}
                  >
                    <Swords size={13} className="mr-1.5 text-gold" />
                    Ajak Battle
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs bg-gold text-black hover:bg-gold/90"
                    onClick={handleOpenChat}
                  >
                    <MessageSquare size={13} className="mr-1.5" />
                    Kirim Pesan
                  </Button>
                </>
              )
            ) : profile.friendshipStatus === "pending_incoming" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-danger"
                  onClick={() => handleRespond("decline")}
                  disabled={actionPending}
                >
                  Tolak
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs bg-sage text-black hover:bg-sage/90"
                  onClick={() => handleRespond("accept")}
                  disabled={actionPending}
                >
                  <UserCheck size={13} className="mr-1.5" />
                  Terima Permintaan
                </Button>
              </>
            ) : profile.friendshipStatus === "pending_outgoing" ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-[var(--ink-muted)]"
                disabled
              >
                Permintaan Terkirim (Menunggu Respon)
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="text-xs bg-gold text-black hover:bg-gold/90 font-medium"
                onClick={handleSendRequest}
                disabled={actionPending}
              >
                <UserPlus size={13} className="mr-1.5" />
                Hubungkan (Add Friend)
              </Button>
            )}
          </div>
        </div>
      )}
    </AppDialog>
  );
}
