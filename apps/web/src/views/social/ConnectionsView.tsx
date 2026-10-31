import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Clock, Search, UserCheck, UserPlus, Users } from "lucide-react";
import type { FriendUserDto, FriendshipDto } from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { PublicProfileModal } from "../../components/social/PublicProfileModal";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel, StatTile } from "../../components/ui/dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { SearchBar } from "../../components/ui/search-bar";
import {
  FriendItemCard,
  RequestItemCard,
  SearchUserCard,
  type SearchUserResult,
} from "./ConnectionsComponents";

export function ConnectionsView() {
  const { setCurrentTab } = useApp();
  const [activeTab, setActiveTab] = useState("connected");
  const [friends, setFriends] = useState<FriendUserDto[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendshipDto[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendshipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Local filter for connected friends
  const [friendsFilter, setFriendsFilter] = useState("");

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Action pending state
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

  // Selected profile for modal
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

  const filteredFriends = useMemo(() => {
    const q = friendsFilter.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.codename && f.codename.toLowerCase().includes(q)) ||
        (f.targetUniversity && f.targetUniversity.toLowerCase().includes(q)),
    );
  }, [friends, friendsFilter]);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Page Heading using House Reusable Component */}
      <PageHeading
        title="Hub Koneksi"
        description="Jejaring pejuang UTBK-SNBT: bangun relasi, pantau progres rekan belajar, dan tantang kemampuan di Warrior Battle."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-[var(--gold)] hover:border-[var(--gold)]"
            onClick={() => setActiveTab("search")}
          >
            <UserPlus size={14} className="mr-1.5" />
            Cari Kawan Belajar
          </Button>
        }
      />

      {/* Top Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile
          label="TEMAN TERHUBUNG"
          value={friends.length}
          icon={<Users size={20} className="text-[var(--gold)]" />}
        >
          <span className="metric-sub-note">Rekan seperjuangan aktif</span>
        </StatTile>

        <StatTile
          label="PERMINTAAN MASUK"
          value={pendingIncoming.length}
          icon={
            <Clock size={20} className={pendingIncoming.length > 0 ? "text-sage" : "text-muted"} />
          }
        >
          <span className="metric-sub-note">
            {pendingIncoming.length > 0
              ? `${pendingIncoming.length} siswa menunggu responmu`
              : "Semua permintaan telah diproses"}
          </span>
        </StatTile>

        <StatTile
          label="PERMINTAAN TERKIRIM"
          value={pendingOutgoing.length}
          icon={<UserCheck size={20} className="text-muted" />}
        >
          <span className="metric-sub-note">Menunggu konfirmasi penerima</span>
        </StatTile>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
          {actionError}
        </div>
      )}

      {/* Tab Navigation using House Reusable Tabs Component */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList aria-label="Navigasi Hub Koneksi" className="w-full sm:w-auto">
          <TabsTrigger value="connected" className="flex-1 sm:flex-initial">
            <Users size={14} className="mr-1.5" />
            Teman Terhubung ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 sm:flex-initial">
            <Search size={14} className="mr-1.5" />
            Cari Siswa
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 sm:flex-initial relative">
            <Clock size={14} className="mr-1.5" />
            Permintaan
            {pendingIncoming.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-[var(--gold)] text-black rounded-full font-mono text-[10px] font-bold">
                {pendingIncoming.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Teman Terhubung */}
        <TabsContent value="connected" className="space-y-4">
          {friends.length > 0 && (
            <div className="max-w-md">
              <SearchBar
                value={friendsFilter}
                onChange={(e) => setFriendsFilter(e.target.value)}
                onClear={() => setFriendsFilter("")}
                placeholder="Filter nama, @codename, atau universitas target…"
                sizeVariant="sm"
              />
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
              <div className="size-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-[var(--ink-muted)]">
                Memuat daftar rekan belajar…
              </span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-danger space-y-3">
              <p className="text-sm font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchFriendsData()}>
                Coba Lagi
              </Button>
            </div>
          ) : friends.length === 0 ? (
            <Panel className="py-16 text-center space-y-4">
              <Users className="size-12 text-[var(--gold)] mx-auto opacity-40" />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-[var(--ink)]">
                  Belum ada rekan belajar yang terhubung
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
                  Cari sesama pejuang kampus impian atau ajak siswa dari leaderboard untuk saling
                  terhubung, berlatih soal bersama, dan beradu ketangkasan.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium text-xs"
                onClick={() => setActiveTab("search")}
              >
                <Search size={13} className="mr-1.5" />
                Cari Kawan Belajar Sekarang
              </Button>
            </Panel>
          ) : filteredFriends.length === 0 ? (
            <Panel className="py-10 text-center space-y-2">
              <p className="text-xs text-[var(--ink-muted)]">
                Tidak ditemukan teman dengan kata kunci &ldquo;{friendsFilter}&rdquo;.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setFriendsFilter("")}>
                Bersihkan filter
              </Button>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFriends.map((friend) => (
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
        </TabsContent>

        {/* Tab 2: Cari Siswa */}
        <TabsContent value="search" className="space-y-4">
          <Panel className="p-4 sm:p-5 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                  placeholder="Ketik nama, @codename, atau target PTN siswa lain…"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="default"
                size="default"
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium px-4"
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? "Mencari…" : "Cari"}
              </Button>
            </form>

            <p className="text-[11px] text-[var(--ink-muted)]">
              Tips: Kamu dapat mencari kawan satu target kampus untuk berdiskusi strategi latihan
              dan subtes favorit.
            </p>
          </Panel>

          {searching ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted">
              <div className="size-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-[var(--ink-muted)]">
                Menelusuri database siswa…
              </span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((user) => (
                <SearchUserCard
                  key={user.id}
                  user={user}
                  onInspect={() => setInspectUserId(user.id)}
                  onConnect={() => handleSendRequest(user.id)}
                  isProcessing={pendingActionId === user.id}
                  onChat={
                    user.friendshipStatus === "friends"
                      ? () => setCurrentTab("chat", { dm: user.id })
                      : undefined
                  }
                />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <Panel className="py-12 text-center space-y-2">
              <p className="text-xs text-[var(--ink-muted)]">
                Tidak ada siswa yang cocok dengan &ldquo;{searchQuery}&rdquo;.
              </p>
            </Panel>
          ) : null}
        </TabsContent>

        {/* Tab 3: Permintaan Koneksi */}
        <TabsContent value="requests" className="space-y-6">
          {/* Permintaan Masuk */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <span>Permintaan Masuk</span>
                <span className="text-xs font-mono text-[var(--gold)]">
                  ({pendingIncoming.length})
                </span>
              </h3>
            </div>

            {pendingIncoming.length === 0 ? (
              <Panel className="py-8 text-center text-xs text-[var(--ink-muted)]">
                Tidak ada permintaan pertemanan tertunda.
              </Panel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingIncoming.map((req) => (
                  <RequestItemCard
                    key={req.id}
                    request={req}
                    onAccept={() => handleRespondRequest(req.id, "accept")}
                    onDecline={() => handleRespondRequest(req.id, "decline")}
                    isProcessing={pendingActionId === req.id}
                    onInspect={() => setInspectUserId(req.friend.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Permintaan Terkirim */}
          {pendingOutgoing.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-serif font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <span>Permintaan Terkirim</span>
                <span className="text-xs font-mono text-[var(--ink-muted)]">
                  ({pendingOutgoing.length})
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingOutgoing.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)]"
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => setInspectUserId(req.friend.id)}
                    >
                      <div className="size-9 rounded-full bg-[var(--surface-subtle)] border border-[var(--edge)] flex items-center justify-center font-serif font-bold text-xs text-[var(--gold)] shrink-0">
                        {req.friend.image ? (
                          <img
                            src={req.friend.image}
                            alt={req.friend.name}
                            className="size-full rounded-full object-cover"
                          />
                        ) : (
                          req.friend.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-serif font-bold text-xs text-[var(--ink)] truncate block hover:text-[var(--gold)]">
                          {req.friend.name}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                          Menunggu konfirmasi
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
                      Terkirim
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dossier Modal */}
      <PublicProfileModal
        userId={inspectUserId}
        isOpen={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
        onConnectChanged={fetchFriendsData}
      />
    </div>
  );
}
