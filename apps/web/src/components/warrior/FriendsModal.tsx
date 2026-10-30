import React, { useEffect, useState, useCallback } from "react";
import { Check, Search, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import type { FriendUserDto, FriendshipDto } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./friends-modal.module.css";

interface SearchUserResult extends FriendUserDto {
  friendshipStatus?: "none" | "pending_incoming" | "pending_outgoing" | "friends";
}

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBattleId?: string | null;
  invitedFriendIds?: Set<string>;
  onInviteSent?: (friendId: string) => void;
}

export function FriendsModal({
  isOpen,
  onClose,
  activeBattleId = null,
  invitedFriendIds = new Set(),
  onInviteSent,
}: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("friends");
  const [friends, setFriends] = useState<FriendUserDto[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendshipDto[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendshipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Action pending state
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const fetchFriendsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        friends: FriendUserDto[];
        pendingIncoming: FriendshipDto[];
        pendingOutgoing: FriendshipDto[];
      }>("/friends");
      setFriends(data.friends || []);
      setPendingIncoming(data.pendingIncoming || []);
      setPendingOutgoing(data.pendingOutgoing || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data teman.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchFriendsData();
    }
  }, [isOpen, fetchFriendsData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api<{ users: SearchUserResult[] }>(
        `/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      setSearchResults(res.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mencari pengguna.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    setPendingActionId(targetUserId);
    setError(null);
    try {
      await api("/friends/request", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      // Update local state
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, friendshipStatus: "pending_outgoing" } : u,
        ),
      );
      void fetchFriendsData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRespondRequest = async (friendshipId: string, action: "accept" | "decline") => {
    setPendingActionId(friendshipId);
    setError(null);
    try {
      await api(`/friends/request/${friendshipId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      void fetchFriendsData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memproses permintaan.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setPendingActionId(friendId);
    setError(null);
    try {
      await api(`/friends/${friendId}`, { method: "DELETE" });
      void fetchFriendsData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menghapus teman.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleInviteToBattle = async (friendId: string) => {
    if (!activeBattleId) return;
    setPendingActionId(friendId);
    setError(null);
    try {
      await api("/warrior/invites", {
        method: "POST",
        body: JSON.stringify({ battleId: activeBattleId, recipientId: friendId }),
      });
      onInviteSent?.(friendId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengundang teman ke battle.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Pertemanan & Undang Battle</DialogTitle>
          <DialogDescription>
            {activeBattleId
              ? "Undang temanmu langsung ke room battle tanpa perlu memasukkan kode secara manual."
              : "Kelola teman, terima permintaan duel, atau cari kawan belajar baru."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            className="p-3 text-xs rounded bg-red-950/40 border border-red-500/50 text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={styles.tabList}>
            <TabsTrigger value="friends" className={styles.tabTrigger}>
              <Users size={14} />
              <span>Teman ({friends.length})</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className={styles.tabTrigger}>
              <UserCheck size={14} />
              <span>Permintaan</span>
              {pendingIncoming.length > 0 && (
                <span className={styles.badge}>{pendingIncoming.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className={styles.tabTrigger}>
              <Search size={14} />
              <span>Cari</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FRIENDS LIST */}
          <TabsContent value="friends" className={styles.tabContent}>
            {loading ? (
              <p className={styles.emptyState}>Memuat daftar teman…</p>
            ) : friends.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Belum ada teman terdaftar.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("search")}>
                  <UserPlus size={14} className="mr-1" />
                  Cari Pengguna Lain
                </Button>
              </div>
            ) : (
              <ul className={styles.userList}>
                {friends.map((friend) => {
                  const isInvited = invitedFriendIds.has(friend.id);
                  const isBusy = pendingActionId === friend.id;

                  return (
                    <li key={friend.id} className={styles.userCard}>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {friend.image ? (
                            <img src={friend.image} alt="" className={styles.avatarImg} />
                          ) : (
                            friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.name}>{friend.name}</span>
                          <span className={styles.subtitle}>
                            {friend.targetUniversity || friend.codename || "Siswa Latveria"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        {activeBattleId && (
                          <Button
                            size="sm"
                            className={
                              isInvited ? "bg-emerald-800 text-emerald-100" : "btn-gold-solid"
                            }
                            disabled={isInvited || isBusy}
                            onClick={() => handleInviteToBattle(friend.id)}
                          >
                            {isInvited ? (
                              <>
                                <Check size={14} className="mr-1" />
                                Terkirim
                              </>
                            ) : isBusy ? (
                              "Mengirim…"
                            ) : (
                              "Undang Battle"
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => handleRemoveFriend(friend.id)}
                          title="Hapus Teman"
                        >
                          <UserX size={16} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* TAB 2: REQUESTS */}
          <TabsContent value="requests" className={styles.tabContent}>
            {loading ? (
              <p className={styles.emptyState}>Memuat permintaan…</p>
            ) : pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
              <div className={styles.emptyState}>Tidak ada permintaan pertemanan tertunda.</div>
            ) : (
              <div className="space-y-4">
                {pendingIncoming.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">
                      Permintaan Masuk ({pendingIncoming.length})
                    </h4>
                    <ul className={styles.userList}>
                      {pendingIncoming.map((req) => (
                        <li key={req.id} className={styles.userCard}>
                          <div className={styles.userInfo}>
                            <div className={styles.avatar}>
                              {req.friend.image ? (
                                <img src={req.friend.image} alt="" className={styles.avatarImg} />
                              ) : (
                                req.friend.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className={styles.meta}>
                              <span className={styles.name}>{req.friend.name}</span>
                              <span className={styles.subtitle}>
                                {req.friend.targetUniversity ||
                                  req.friend.codename ||
                                  "Siswa Latveria"}
                              </span>
                            </div>
                          </div>
                          <div className={styles.actions}>
                            <Button
                              size="sm"
                              className="btn-gold-solid"
                              disabled={pendingActionId === req.id}
                              onClick={() => handleRespondRequest(req.id, "accept")}
                            >
                              Terima
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pendingActionId === req.id}
                              onClick={() => handleRespondRequest(req.id, "decline")}
                            >
                              Tolak
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pendingOutgoing.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">
                      Permintaan Terkirim ({pendingOutgoing.length})
                    </h4>
                    <ul className={styles.userList}>
                      {pendingOutgoing.map((req) => (
                        <li key={req.id} className={styles.userCard}>
                          <div className={styles.userInfo}>
                            <div className={styles.avatar}>
                              {req.friend.image ? (
                                <img src={req.friend.image} alt="" className={styles.avatarImg} />
                              ) : (
                                req.friend.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className={styles.meta}>
                              <span className={styles.name}>{req.friend.name}</span>
                              <span className={styles.subtitle}>Menunggu konfirmasi…</span>
                            </div>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] italic">
                            Tertunda
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: SEARCH */}
          <TabsContent value="search" className={styles.tabContent}>
            <form onSubmit={handleSearch} className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Cari nama atau email pengguna…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" disabled={searching || !searchQuery.trim()}>
                {searching ? "Mencari…" : "Cari"}
              </Button>
            </form>

            <div className="flex-1 overflow-y-auto mt-2">
              {searchResults.length === 0 ? (
                <p className={styles.emptyState}>
                  {searchQuery ? "Pengguna tidak ditemukan." : "Ketik nama untuk mencari pengguna."}
                </p>
              ) : (
                <ul className={styles.userList}>
                  {searchResults.map((user) => {
                    const isBusy = pendingActionId === user.id;

                    return (
                      <li key={user.id} className={styles.userCard}>
                        <div className={styles.userInfo}>
                          <div className={styles.avatar}>
                            {user.image ? (
                              <img src={user.image} alt="" className={styles.avatarImg} />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className={styles.meta}>
                            <span className={styles.name}>{user.name}</span>
                            <span className={styles.subtitle}>
                              {user.targetUniversity || user.codename || "Siswa Latveria"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.actions}>
                          {user.friendshipStatus === "friends" ? (
                            <span className="text-xs text-emerald-400 font-medium px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40">
                              Sudah Berteman
                            </span>
                          ) : user.friendshipStatus === "pending_outgoing" ? (
                            <span className="text-xs text-amber-400 font-medium px-2 py-1 rounded bg-amber-950/40 border border-amber-800/40">
                              Permintaan Terkirim
                            </span>
                          ) : user.friendshipStatus === "pending_incoming" ? (
                            <Button
                              size="sm"
                              className="btn-gold-solid"
                              disabled={isBusy}
                              onClick={() => {
                                const req = pendingIncoming.find((r) => r.friend.id === user.id);
                                if (req) void handleRespondRequest(req.id, "accept");
                              }}
                            >
                              Terima Permintaan
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleSendRequest(user.id)}
                            >
                              <UserPlus size={14} className="mr-1" />
                              {isBusy ? "Mengirim…" : "Tambah Teman"}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
