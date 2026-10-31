import React, { useEffect, useState, useCallback } from "react";
import { Bell, Check, MessageSquare, Swords, UserCheck, Users, X } from "lucide-react";
import type {
  FriendshipDto,
  BattleInviteDto,
  ChatMessage,
  ChatConversationSummary,
} from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { AppDialog } from "../app-dialog";
import { Button } from "../ui/button";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  chatNotifications: { global: ChatMessage[]; direct: ChatConversationSummary[] };
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  onCountChange,
  chatNotifications,
}: NotificationCenterModalProps) {
  const { setCurrentTab } = useApp();
  const [friendRequests, setFriendRequests] = useState<FriendshipDto[]>([]);
  const [battleInvites, setBattleInvites] = useState<BattleInviteDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [friendsData, battleData] = await Promise.allSettled([
        api<{ pendingIncoming: FriendshipDto[] }>("/friends"),
        api<{ invites: BattleInviteDto[] }>("/warrior/invites"),
      ]);

      const reqs =
        friendsData.status === "fulfilled" ? friendsData.value.pendingIncoming || [] : [];
      const invites = battleData.status === "fulfilled" ? battleData.value.invites || [] : [];

      setFriendRequests(reqs);
      setBattleInvites(invites);
      onCountChange?.(reqs.length + invites.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleFriendRespond = async (requestId: string, action: "accept" | "decline") => {
    setActionPendingId(requestId);
    setErrorMessage(null);
    try {
      await api(`/friends/request/${requestId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      onCountChange?.(friendRequests.length - 1 + battleInvites.length);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal merespons permintaan teman.");
    } finally {
      setActionPendingId(null);
    }
  };

  const handleBattleRespond = async (inviteId: string, action: "accept" | "decline") => {
    setActionPendingId(inviteId);
    setErrorMessage(null);
    try {
      const res = await api<{ success: boolean; battleId?: string }>(
        `/warrior/invites/${inviteId}/respond`,
        {
          method: "POST",
          body: JSON.stringify({ action }),
        },
      );
      setBattleInvites((prev) => prev.filter((i) => i.id !== inviteId));
      onCountChange?.(friendRequests.length + battleInvites.length - 1);
      if (action === "accept" && res.battleId) {
        onClose();
        setCurrentTab("warrior");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal merespons undangan battle.");
    } finally {
      setActionPendingId(null);
    }
  };

  const chatCount =
    chatNotifications.global.length +
    chatNotifications.direct.reduce((count, item) => count + item.unreadCount, 0);
  const totalCount = friendRequests.length + battleInvites.length + chatCount;

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gold" />
          <span>Pusat Notifikasi</span>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-gold text-black text-[10px] font-mono font-bold">
              {totalCount}
            </span>
          )}
        </div>
      }
      description="Pemberitahuan aktivitas, undangan duel belajar, dan permintaan koneksi siswa."
      className="max-w-md w-full"
    >
      <div className="space-y-4 pt-1 max-h-[65vh] overflow-y-auto pr-1">
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
            {errorMessage}
          </div>
        )}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--ink-muted)]">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Memuat notifikasi…</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Bell className="w-10 h-10 text-[var(--ink-muted)] mx-auto opacity-30" />
            <p className="text-xs text-[var(--ink-muted)]">Tidak ada notifikasi baru saat ini.</p>
          </div>
        ) : (
          <>
            {chatCount > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-gold flex items-center gap-1.5">
                  <MessageSquare size={13} /> Pesan Baru ({chatCount})
                </div>
                {chatNotifications.global.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      onClose();
                      setCurrentTab("chat");
                    }}
                  >
                    Saluran Global · {chatNotifications.global.length} pesan baru
                  </Button>
                )}
                {chatNotifications.direct.map((conversation) => (
                  <Button
                    key={conversation.userId}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      onClose();
                      setCurrentTab("chat", { dm: conversation.userId });
                    }}
                  >
                    {conversation.name} · {conversation.unreadCount} pesan baru
                  </Button>
                ))}
              </div>
            )}
            {/* Undangan Battle */}
            {battleInvites.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-gold flex items-center gap-1.5">
                  <Swords size={13} />
                  <span>Undangan Warrior Battle ({battleInvites.length})</span>
                </div>

                <div className="space-y-2">
                  {battleInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-3 rounded-lg border border-gold/30 bg-gold/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[var(--ink)] truncate">
                            {invite.sender.name}
                          </span>
                          <span className="text-[10px] text-gold font-mono">mengundang battle</span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1 mt-0.5">
                          <span>Room: {invite.battleCode}</span>
                          {invite.subtestName && (
                            <>
                              <span>·</span>
                              <span className="truncate">{invite.subtestName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-danger hover:bg-danger/10"
                          onClick={() => handleBattleRespond(invite.id, "decline")}
                          disabled={actionPendingId === invite.id}
                        >
                          <X size={13} />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-gold text-black hover:bg-gold/90 font-medium"
                          onClick={() => handleBattleRespond(invite.id, "accept")}
                          disabled={actionPendingId === invite.id}
                        >
                          <Check size={13} className="mr-1" />
                          Gabung
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permintaan Koneksi */}
            {friendRequests.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-sage flex items-center gap-1.5">
                  <UserCheck size={13} />
                  <span>Permintaan Terhubung ({friendRequests.length})</span>
                </div>

                <div className="space-y-2">
                  {friendRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-muted)]/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        {req.friend.image ? (
                          <img
                            src={req.friend.image}
                            alt={req.friend.name}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--edge)]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--edge)] flex items-center justify-center font-bold text-xs text-gold">
                            {req.friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-[var(--ink)] truncate">
                            {req.friend.name}
                          </p>
                          {req.friend.codename && (
                            <p className="text-[10px] font-mono text-[var(--ink-muted)]">
                              @{req.friend.codename}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-danger"
                          onClick={() => handleFriendRespond(req.id, "decline")}
                          disabled={actionPendingId === req.id}
                        >
                          Tolak
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-sage text-black hover:bg-sage/90 font-medium"
                          onClick={() => handleFriendRespond(req.id, "accept")}
                          disabled={actionPendingId === req.id}
                        >
                          Terima
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-3 border-t border-[var(--edge)] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
            onClick={() => {
              onClose();
              setCurrentTab("connections");
            }}
          >
            <Users size={13} className="mr-1.5" />
            Buka Hub Koneksi
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
