import React, { useEffect, useState, useCallback } from "react";
import {
  Award,
  Check,
  Flame,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  Swords,
  Target,
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
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--gold)]">
            Dossier Siswa
          </span>
          {profile?.codename && (
            <span className="text-xs font-mono text-[var(--ink-muted)]">@{profile.codename}</span>
          )}
        </div>
      }
      className="w-full max-w-lg md:max-w-2xl p-4 sm:p-6"
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted">
          <div className="size-7 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[var(--ink-muted)]">
            Mengambil data siswa Latveria…
          </span>
        </div>
      ) : error || !profile ? (
        <div className="py-10 text-center space-y-3">
          <ShieldAlert className="size-10 text-danger mx-auto opacity-80" />
          <p className="text-sm text-danger font-medium">{error || "Profil tidak ditemukan."}</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5 pt-1">
          {/* Header Card: Identity & Status */}
          <div className="flex items-start gap-3.5 sm:gap-4 p-3 sm:p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)]">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="size-12 sm:size-16 rounded-full object-cover border-2 border-[var(--edge)] ring-2 ring-[var(--gold)]/30"
                />
              ) : (
                <div className="size-12 sm:size-16 rounded-full bg-[var(--surface-subtle)] border-2 border-[var(--edge)] flex items-center justify-center font-serif font-bold text-lg sm:text-2xl text-[var(--gold)] ring-2 ring-[var(--gold)]/20">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {profile.friendshipStatus === "friends" && (
                <span
                  title="Connected / Berteman"
                  className="absolute -bottom-1 -right-1 bg-sage text-black rounded-full p-1 border-2 border-[var(--surface)] shadow-xs"
                >
                  <UserCheck size={11} strokeWidth={2.5} />
                </span>
              )}
            </div>

            {/* Core Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--ink)] leading-snug truncate">
                  {profile.name}
                </h3>
                {profile.friendshipStatus === "friends" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-sage/15 text-sage border border-sage/30">
                    <Check size={10} strokeWidth={2.5} /> Berteman
                  </span>
                )}
                {profile.friendshipStatus === "pending_outgoing" && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                    Permintaan Terkirim
                  </span>
                )}
                {profile.friendshipStatus === "pending_incoming" && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded bg-accent/20 text-accent border border-accent/30 animate-pulse font-medium">
                    Menunggu Responmu
                  </span>
                )}
              </div>

              {profile.targetUniversity ? (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 text-xs font-mono">
                  <GraduationCap size={13} className="shrink-0" />
                  <span className="truncate">{profile.targetUniversity}</span>
                </div>
              ) : (
                <p className="text-xs text-[var(--ink-muted)] italic">
                  Belum menetapkan target universitas
                </p>
              )}
            </div>
          </div>

          {/* Bio & Motto Quote */}
          {(profile.bio || profile.motto) && (
            <div className="p-3 sm:p-3.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-subtle)] space-y-1.5">
              {profile.motto && (
                <p className="font-serif italic text-xs sm:text-sm text-[var(--gold)] leading-relaxed">
                  “{profile.motto}”
                </p>
              )}
              {profile.bio && (
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">{profile.bio}</p>
              )}
            </div>
          )}

          {/* Academic & Battle Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Level & XP */}
            <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Award size={13} className="text-[var(--gold)]" />
                <span>LEVEL & EXP</span>
              </div>
              <div>
                <div className="font-serif font-bold text-sm sm:text-base text-[var(--ink)]">
                  LVL {profile.level}
                </div>
                <div className="text-[10px] font-mono text-[var(--gold)] truncate">
                  {profile.totalXP.toLocaleString()} XP
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Flame size={13} className="text-orange" />
                <span>STREAK</span>
              </div>
              <div>
                <div className="font-serif font-bold text-sm sm:text-base text-[var(--ink)]">
                  {profile.streakDays} Hari
                </div>
                <div className="text-[10px] font-mono text-sage">Konsisten</div>
              </div>
            </div>

            {/* Akurasi */}
            <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Target size={13} className="text-sage" />
                <span>AKURASI</span>
              </div>
              <div>
                <div className="font-serif font-bold text-sm sm:text-base text-sage">
                  {profile.accuracy !== null && profile.accuracy !== undefined
                    ? `${profile.accuracy}%`
                    : "Privat"}
                </div>
                <div className="text-[10px] font-mono text-[var(--ink-muted)] truncate">
                  {profile.totalAnswered !== null && profile.totalAnswered !== undefined
                    ? `${profile.totalAnswered} Soal`
                    : "Dirahasiakan"}
                </div>
              </div>
            </div>

            {/* Koneksi */}
            <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                <Users size={13} className="text-[var(--gold)]" />
                <span>LINGKARAN</span>
              </div>
              <div>
                <div className="font-serif font-bold text-sm sm:text-base text-[var(--ink)]">
                  {profile.connectedCount}
                </div>
                <div className="text-[10px] font-mono text-[var(--ink-muted)]">Teman Terhubung</div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {actionError && (
            <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
              {actionError}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="pt-2 flex items-center justify-end gap-2 flex-wrap border-t border-[var(--edge)]">
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
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-danger font-mono">Hapus dari pertemanan?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    onClick={() => setConfirmDelete(false)}
                    disabled={actionPending}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-8 px-3 bg-danger text-white hover:bg-danger/90"
                    onClick={handleRemoveFriend}
                    disabled={actionPending}
                  >
                    Ya, Putus
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-danger/80 hover:text-danger hover:bg-danger/10"
                    onClick={() => setConfirmDelete(true)}
                    disabled={actionPending}
                  >
                    <UserX size={14} className="mr-1" />
                    Putus Pertemanan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-[var(--gold)] hover:border-[var(--gold)]"
                    onClick={handleInviteBattle}
                  >
                    <Swords size={14} className="mr-1" />
                    Ajak Duel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium"
                    onClick={handleOpenChat}
                  >
                    <MessageSquare size={14} className="mr-1" />
                    Kirim Pesan
                  </Button>
                </div>
              )
            ) : profile.friendshipStatus === "pending_incoming" ? (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => handleRespond("decline")}
                  disabled={actionPending}
                >
                  Tolak
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-8 bg-sage text-black hover:bg-sage/90 font-medium"
                  onClick={() => handleRespond("accept")}
                  disabled={actionPending}
                >
                  <Check size={13} className="mr-1" />
                  Terima Permintaan
                </Button>
              </div>
            ) : profile.friendshipStatus === "pending_outgoing" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--ink-muted)]">
                  Menunggu konfirmasi penerima
                </span>
                <Button variant="outline" size="sm" className="text-xs" disabled>
                  Terkirim
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full sm:w-auto text-xs bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium"
                onClick={handleSendRequest}
                disabled={actionPending}
              >
                <UserPlus size={14} className="mr-1" />
                Tambah Sebagai Teman
              </Button>
            )}
          </div>
        </div>
      )}
    </AppDialog>
  );
}
