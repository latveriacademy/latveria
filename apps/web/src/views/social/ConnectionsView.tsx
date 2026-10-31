import React, { useEffect, useState, useCallback } from "react";
import { Search, UserCheck, Users, Clock } from "lucide-react";
import type { FriendUserDto, FriendshipDto } from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { PublicProfileModal } from "../../components/social/PublicProfileModal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  FriendItemCard,
  RequestItemCard,
  SearchUserCard,
  type SearchUserResult,
} from "./ConnectionsComponents";

export function ConnectionsView() {
  const { setCurrentTab } = useApp();
  const [activeTab, setActiveTab] = useState<"connected" | "search" | "requests">("connected");
  const [friends, setFriends] = useState<FriendUserDto[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendshipDto[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendshipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Action pending state
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

  // Selected profile to view modal
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  const fetchFriendsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
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
    void fetchFriendsData();
  }, [fetchFriendsData]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setActionError(null);
    try {
      const data = await api<{ users: SearchUserResult[] }>(
        `/friends/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(data.users || []);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Pencarian gagal.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    setPendingActionId(targetUserId);
    setActionError(null);
    try {
      await api("/friends/request", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, friendshipStatus: "pending_outgoing" } : u,
        ),
      );
      await fetchFriendsData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRespondRequest = async (requestId: string, action: "accept" | "decline") => {
    setPendingActionId(requestId);
    setActionError(null);
    try {
      await api(`/friends/request/${requestId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await fetchFriendsData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal merespons permintaan.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRemoveFriend = async (targetUserId: string) => {
    setPendingActionId(targetUserId);
    setActionError(null);
    try {
      await api(`/friends/${targetUserId}`, { method: "DELETE" });
      setConfirmRemoveUserId(null);
      await fetchFriendsData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus pertemanan.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--edge)] pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gold/10 text-gold border border-gold/20">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight">Hub Koneksi</h1>
            <p className="text-xs text-[var(--ink-muted)]">
              Terhubung dengan sesama pejuang UTBK-SNBT, belajar bareng, dan adu kemampuan di
              Warrior Battle.
            </p>
          </div>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-muted)]/60 p-1 rounded-lg border border-[var(--edge)] text-xs">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "connected"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm border border-[var(--edge)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            onClick={() => setActiveTab("connected")}
          >
            Teman Terhubung ({friends.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "search"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm border border-[var(--edge)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            onClick={() => setActiveTab("search")}
          >
            Cari Siswa
          </button>
          <button
            type="button"
            className={`relative px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "requests"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm border border-[var(--edge)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            onClick={() => setActiveTab("requests")}
          >
            Permintaan
            {pendingIncoming.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-gold text-black rounded-full font-mono text-[10px] font-bold">
                {pendingIncoming.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
          {actionError}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Memuat data koneksi…</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-danger space-y-2">
          <p className="text-sm font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchFriendsData()}>
            Coba Lagi
          </Button>
        </div>
      ) : activeTab === "connected" ? (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-[var(--edge)] bg-[var(--surface-muted)]/30 space-y-3">
              <Users className="w-12 h-12 text-[var(--ink-muted)] mx-auto opacity-40" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Belum ada teman terhubung</p>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Cari sesama pejuang kampus impian atau ajak teman dari leaderboard untuk saling
                  terhubung.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-gold text-black hover:bg-gold/90 font-medium text-xs mt-2"
                onClick={() => setActiveTab("search")}
              >
                <Search size={14} className="mr-1.5" />
                Cari Pejuang Lain
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {friends.map((friend) => (
                <FriendItemCard
                  key={friend.id}
                  friend={friend}
                  onInspect={() => setInspectUserId(friend.id)}
                  onBattle={() => setCurrentTab("warrior")}
                  onChat={() => setCurrentTab("chat", { dm: friend.id })}
                  onRemove={() => setConfirmRemoveUserId(friend.id)}
                  isRemoving={pendingActionId === friend.id}
                  confirmRemove={confirmRemoveUserId === friend.id}
                  onCancelRemove={() => setConfirmRemoveUserId(null)}
                  onConfirmRemove={() => handleRemoveFriend(friend.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "search" ? (
        <div className="space-y-5">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] w-4 h-4" />
              <Input
                type="text"
                placeholder="Cari nama siswa, codename (@...), atau email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-gold text-black hover:bg-gold/90 font-medium text-xs px-4"
              disabled={searching}
            >
              {searching ? "Mencari…" : "Cari"}
            </Button>
          </form>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {searchResults.map((u) => (
                <SearchUserCard
                  key={u.id}
                  user={u}
                  onInspect={() => setInspectUserId(u.id)}
                  onSendRequest={() => handleSendRequest(u.id)}
                  isPending={pendingActionId === u.id}
                />
              ))}
            </div>
          ) : searchQuery && !searching ? (
            <div className="py-12 text-center text-[var(--ink-muted)] text-xs border border-dashed border-[var(--edge)] rounded-xl">
              Tidak ada siswa yang cocok dengan &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="py-12 text-center text-[var(--ink-muted)] text-xs border border-dashed border-[var(--edge)] rounded-xl">
              Ketik nama atau codename pejuang UTBK untuk mulai mencari.
            </div>
          )}
        </div>
      ) : (
        /* Requests Tab */
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-2">
              <UserCheck size={14} className="text-gold" />
              Permintaan Masuk ({pendingIncoming.length})
            </h2>

            {pendingIncoming.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] italic py-3">
                Tidak ada permintaan koneksi baru saat ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingIncoming.map((req) => (
                  <RequestItemCard
                    key={req.id}
                    item={req}
                    isIncoming={true}
                    onInspect={() => setInspectUserId(req.friend.id)}
                    onRespond={(action) => handleRespondRequest(req.id, action)}
                    isPending={pendingActionId === req.id}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--edge)]">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-2">
              <Clock size={14} className="text-[var(--ink-muted)]" />
              Menunggu Konfirmasi ({pendingOutgoing.length})
            </h2>

            {pendingOutgoing.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] italic py-3">
                Tidak ada permintaan koneksi terkirim yang sedang menunggu.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingOutgoing.map((req) => (
                  <RequestItemCard
                    key={req.id}
                    item={req}
                    isIncoming={false}
                    onInspect={() => setInspectUserId(req.friend.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Public Profile Modal */}
      <PublicProfileModal
        userId={inspectUserId}
        isOpen={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
        onConnectChanged={() => void fetchFriendsData()}
      />
    </div>
  );
}
