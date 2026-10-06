/* eslint-disable no-alert */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowLeft,
  User,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  Download,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading, StatTile } from "../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, ApiError } from "../../lib/api";

interface OverviewStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  deactivatedCount: number;
  demoCount: number;
  totalPracticeTime: number;
  totalQuestionsAnswered: number;
  avgAccuracy: number;
  growthData: Array<{ date: string; count: number }>;
}

interface UserStats {
  id: string;
  name: string;
  codename: string;
  email: string;
  isDemo: boolean;
  hideFromLeaderboard: boolean;
  createdAt: string;
  isDeactivated: boolean;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  answered: number;
  correct: number;
  accuracy: number;
  totalXP: number;
  level: number;
  timeSpent: number;
  lastActivity: string | null;
}

interface UserListResponse {
  rows: UserStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

interface UserDetail extends UserStats {
  role: string;
  accountNotes: string;
  failedLoginAttempts: number;
  currentXP: number;
  nextLevelXP: number;
  avgTimePerQuestion: number;
  currentStreak: number;
  longestStreak: number;
  firstAttemptRate: number;
  improvementRate: number;
  weeklyActivity: Array<{ date: string; dayName: string; count: number }>;
  subtestStats: Array<{
    slug: string;
    name: string;
    answered: number;
    correct: number;
    accuracy: number;
  }>;
  weakAreas: Array<{
    slug: string;
    name: string;
    accuracy: number;
  }>;
  favoriteTopics: Array<{
    slug: string;
    name: string;
    accuracy: number;
  }>;
  sessionCount: number;
  reportsCount: number;
  recentActivity: Array<{
    id: string;
    topicSlug: string;
    topicName: string;
    correct: number;
    total: number;
    timeSpent: number;
    submittedAt: string;
  }>;
}

export function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<UserListResponse | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showOverview, setShowOverview] = useState(true);

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const demoFilter = searchParams.get("demo") ?? "";
  const status = searchParams.get("status") ?? "";
  const sortBy = searchParams.get("sort") ?? "created_at";
  const sortOrder = searchParams.get("order") ?? "desc";
  const viewUserId = searchParams.get("view");

  const fetchOverview = useCallback(async () => {
    try {
      const result = await api<OverviewStats>("/admin/users/stats/overview");
      setOverview(result);
    } catch {
      // Silently fail for overview
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (demoFilter) params.set("demo", demoFilter);
      if (status) params.set("status", status);
      params.set("sort", sortBy);
      params.set("order", sortOrder);

      const result = await api<UserListResponse>(`/admin/users?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar user.");
    } finally {
      setLoading(false);
    }
  }, [page, search, demoFilter, status, sortBy, sortOrder]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    try {
      const result = await api<UserDetail>(`/admin/users/${userId}`);
      setSelectedUser(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat detail user.");
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (viewUserId) {
      fetchUserDetail(viewUserId);
    } else {
      setSelectedUser(null);
    }
  }, [viewUserId, fetchUserDetail]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "view") next.delete("page");
    setSearchParams(next);
  };

  const toggleFlag = async (
    userId: string,
    flag: "isDemo" | "hideFromLeaderboard",
    currentValue: boolean,
  ) => {
    try {
      setUpdatingFlag(flag);
      await api(`/admin/users/${userId}/flags`, {
        method: "PUT",
        body: JSON.stringify({ [flag]: !currentValue }),
      });
      await fetchList();
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah flag.");
    } finally {
      setUpdatingFlag(null);
    }
  };

  const handleDeactivate = async (userId: string, deactivate: boolean) => {
    try {
      await api(`/admin/users/${userId}/deactivate`, {
        method: "POST",
        body: JSON.stringify({ deactivate }),
      });
      await fetchList();
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status akun.");
    }
  };

  const handleResetProgress = async (userId: string) => {
    if (
      !confirm(
        "Yakin ingin mereset semua progres latihan user ini? Tindakan ini tidak dapat dibatalkan.",
      )
    ) {
      return;
    }
    try {
      await api(`/admin/users/${userId}/reset`, { method: "POST" });
      await fetchList();
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mereset progres.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("PERHATIAN: User dan semua datanya akan dihapus permanen. Lanjutkan?")) {
      return;
    }
    if (!confirm("Ini adalah konfirmasi FINAL. Ketik OK untuk menghapus.")) {
      return;
    }
    try {
      await api(`/admin/users/${userId}`, { method: "DELETE" });
      setSelectedUser(null);
      updateFilter("view", "");
      await fetchList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus user.");
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await api(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah role.");
    }
  };

  const handleUpdateNotes = async (userId: string, notes: string) => {
    try {
      await api(`/admin/users/${userId}/notes`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan catatan.");
    }
  };

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedIds(next);
  };

  const selectAllUsers = () => {
    if (data) {
      if (selectedIds.size === data.rows.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(data.rows.map((u) => u.id)));
      }
    }
  };

  const handleBulkAction = async (action: string, params?: Record<string, unknown>) => {
    if (selectedIds.size === 0) return;
    try {
      setBulkActionLoading(true);
      await api("/admin/users/bulk-action", {
        method: "POST",
        body: JSON.stringify({ userIds: Array.from(selectedIds), action, ...params }),
      });
      setSelectedIds(new Set());
      await fetchList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal melakukan aksi.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="motion-page-enter">
      <PageHeading title="Manajemen User" description="Kelola akun dan statistik peserta" />

      {error && (
        <div className="mb-4 p-4 border border-red-500/50 bg-red-500/10 rounded-md text-red-400">
          {error}
          <Button variant="ghost" size="sm" className="ml-4" onClick={fetchList}>
            Coba lagi
          </Button>
        </div>
      )}

      {selectedUser ? (
        <UserDetailView
          user={selectedUser}
          onBack={() => updateFilter("view", "")}
          onToggleFlag={toggleFlag}
          onDeactivate={handleDeactivate}
          onResetProgress={handleResetProgress}
          onDeleteUser={handleDeleteUser}
          onChangeRole={handleChangeRole}
          onUpdateNotes={handleUpdateNotes}
          updatingFlag={updatingFlag}
        />
      ) : (
        <>
          {overview && showOverview && (
            <div className="mb-6 p-4 border border-[var(--edge)] rounded-md bg-[var(--surface)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--ink)] flex items-center gap-2">
                  <BarChart3 size={18} />
                  Ringkasan Statistik
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowOverview(false)}>
                  Sembunyikan
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--gold)]">{overview.totalUsers}</div>
                  <div className="text-xs text-[var(--soft-ink)]">Total User</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{overview.activeToday}</div>
                  <div className="text-xs text-[var(--soft-ink)]">Aktif Hari Ini</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{overview.newThisWeek}</div>
                  <div className="text-xs text-[var(--soft-ink)]">Baru Minggu Ini</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--gold)]">
                    {overview.avgAccuracy}%
                  </div>
                  <div className="text-xs text-[var(--soft-ink)]">Rata-rata Akurasi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{overview.deactivatedCount}</div>
                  <div className="text-xs text-[var(--soft-ink)]">Dinonaktifkan</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-64 h-9 px-3 border border-[var(--edge)] rounded-md bg-[var(--bg)] text-[var(--ink)] text-sm focus:border-[var(--gold)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--soft-ink)]">Tipe:</span>
              <Select value={demoFilter} onValueChange={(v) => updateFilter("demo", v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua</SelectItem>
                  <SelectItem value="false">User Biasa</SelectItem>
                  <SelectItem value="true">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--soft-ink)]">Status:</span>
              <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="deactivated">Dinonaktifkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--soft-ink)]">Urutkan:</span>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [s, o] = v.split("-");
                  updateFilter("sort", s);
                  updateFilter("order", o);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Terbaru</SelectItem>
                  <SelectItem value="created_at-asc">Terlama</SelectItem>
                  <SelectItem value="name-asc">Nama A-Z</SelectItem>
                  <SelectItem value="name-desc">Nama Z-A</SelectItem>
                  <SelectItem value="lastLoginAt-desc">Login Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!showOverview && (
              <Button variant="outline" size="sm" onClick={() => setShowOverview(true)}>
                <BarChart3 size={14} />
                Tampilkan Overview
              </Button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 border border-[var(--gold)]/50 rounded-md bg-[var(--gold)]/10 flex items-center justify-between">
              <span className="text-sm text-[var(--ink)]">{selectedIds.size} user dipilih</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("setHideFromLeaderboard", { hide: true })}
                  disabled={bulkActionLoading}
                >
                  <EyeOff size={14} />
                  Sembunyikan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("setHideFromLeaderboard", { hide: false })}
                  disabled={bulkActionLoading}
                >
                  <Eye size={14} />
                  Tampilkan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("activate")}
                  disabled={bulkActionLoading}
                >
                  <Unlock size={14} />
                  Aktifkan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("deactivate")}
                  disabled={bulkActionLoading}
                >
                  <Lock size={14} />
                  Nonaktifkan
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Hapus ${selectedIds.size} user?`)) {
                      handleBulkAction("delete");
                    }
                  }}
                  disabled={bulkActionLoading}
                >
                  <Trash2 size={14} />
                  Hapus
                </Button>
              </div>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatTile label="Total User" value={data.pagination.total} />
                <StatTile label="Halaman" value={`${page} / ${data.pagination.pageCount}`} />
                <StatTile label="User Demo" value={data.rows.filter((u) => u.isDemo).length} />
                <StatTile
                  label="Tersembunyi"
                  value={data.rows.filter((u) => u.hideFromLeaderboard).length}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--edge)] text-left">
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] w-10">
                        <input
                          type="checkbox"
                          checked={data.rows.length > 0 && selectedIds.size === data.rows.length}
                          onChange={selectAllUsers}
                          className="rounded border-[var(--edge)]"
                        />
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Nama</th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Email</th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                        Level
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                        XP
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                        Akurasi
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-center">
                        Status
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center">
                          <Loader2 className="size-6 animate-spin text-[var(--gold)] mx-auto" />
                        </td>
                      </tr>
                    ) : data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[var(--soft-ink)]">
                          Tidak ada user yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((user) => (
                        <tr
                          key={user.id}
                          className={`border-b border-[var(--edge)] hover:bg-[var(--surface-hover)] transition-colors ${
                            selectedIds.has(user.id) ? "bg-[var(--gold)]/5" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelectUser(user.id)}
                              className="rounded border-[var(--edge)]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[var(--ink)]">{user.name}</div>
                            {user.codename && (
                              <div className="text-xs text-[var(--soft-ink)]">{user.codename}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--soft-ink)]">{user.email}</td>
                          <td className="py-3 px-4 text-sm text-right font-mono text-[var(--ink)]">
                            {user.level}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-mono text-[var(--ink)]">
                            {user.totalXP}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span
                              className={`font-mono ${
                                user.accuracy >= 70
                                  ? "text-green-500"
                                  : user.accuracy >= 50
                                    ? "text-yellow-500"
                                    : "text-red-500"
                              }`}
                            >
                              {user.accuracy > 0 ? `${user.accuracy}%` : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {user.isDeactivated && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                                  Nonaktif
                                </span>
                              )}
                              {user.isDemo && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                  Demo
                                </span>
                              )}
                              {user.hideFromLeaderboard && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                                  Hidden
                                </span>
                              )}
                              {!user.isDeactivated && !user.isDemo && !user.hideFromLeaderboard && (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500">
                                  Aktif
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateFilter("view", user.id)}
                            >
                              <User size={14} />
                              Detail
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {data.pagination.pageCount > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => updateFilter("page", String(page - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-[var(--soft-ink)]">
                    Halaman {page} dari {data.pagination.pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.pageCount || loading}
                    onClick={() => updateFilter("page", String(page + 1))}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

interface UserDetailViewProps {
  user: UserDetail;
  onBack: () => void;
  onToggleFlag: (
    userId: string,
    flag: "isDemo" | "hideFromLeaderboard",
    currentValue: boolean,
  ) => void;
  onDeactivate: (userId: string, deactivate: boolean) => void;
  onResetProgress: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onChangeRole: (userId: string, role: string) => void;
  onUpdateNotes: (userId: string, notes: string) => void;
  updatingFlag: string | null;
}

function UserDetailView({
  user,
  onBack,
  onToggleFlag,
  onDeactivate,
  onResetProgress,
  onDeleteUser,
  onChangeRole,
  onUpdateNotes,
  updatingFlag,
}: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "security">("overview");
  const [notes, setNotes] = useState(user.accountNotes);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(user.accountNotes);
  }, [user.accountNotes]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdateNotes(user.id, notes);
    setSavingNotes(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0d";
    if (seconds < 60) return `${seconds}d`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}j ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const maxWeeklyCount = Math.max(...user.weeklyActivity.map((w) => w.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Kembali
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--ink)]">{user.name}</h2>
            {user.isDeactivated && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                DINONAKTIFKAN
              </span>
            )}
            {user.role === "admin" && (
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-500">
                ADMIN
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--soft-ink)]">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/admin/users/${user.id}/export?format=json`, "_blank")}
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[var(--edge)]">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "overview"
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-transparent text-[var(--soft-ink)] hover:text-[var(--ink)]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "activity"
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-transparent text-[var(--soft-ink)] hover:text-[var(--ink)]"
          }`}
        >
          Aktivitas
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "security"
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-transparent text-[var(--soft-ink)] hover:text-[var(--ink)]"
          }`}
        >
          Keamanan
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatTile label="Level" value={user.level} />
            <StatTile label="Total XP" value={user.totalXP} />
            <StatTile label="Soal Dijawab" value={user.answered} />
            <StatTile label="Benar" value={user.correct} />
            <StatTile label="Akurasi" value={user.accuracy > 0 ? `${user.accuracy}%` : "-"} />
            <StatTile label="Waktu Total" value={formatTime(user.timeSpent)} />
            <StatTile label="Rata-rata/Soal" value={formatTime(user.avgTimePerQuestion)} />
            <StatTile
              label="Streak Sekarang"
              value={`${user.currentStreak} hari`}
              icon={<Flame size={14} className="text-orange-500" />}
            />
            <StatTile label="Streak Terpanjang" value={`${user.longestStreak} hari`} />
            <StatTile label="First Attempt" value={`${user.firstAttemptRate}%`} />
            <StatTile
              label="Improvement"
              value={`${user.improvementRate > 0 ? "+" : ""}${user.improvementRate}%`}
              icon={
                <TrendingUp
                  size={14}
                  className={user.improvementRate >= 0 ? "text-green-500" : "text-red-500"}
                />
              }
            />
            <StatTile
              label="Bergabung"
              value={new Date(user.createdAt).toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
              })}
            />
          </div>

          {user.weeklyActivity.length > 0 && (
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <h3 className="font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
                <Calendar size={16} />
                Aktivitas Mingguan
              </h3>
              <div className="flex items-end gap-2 h-24">
                {user.weeklyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[var(--edge)] rounded-t relative"
                      style={{ height: "60px" }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-[var(--gold)] rounded-t transition-all"
                        style={{
                          height: `${Math.max((day.count / maxWeeklyCount) * 100, day.count > 0 ? 10 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--soft-ink)]">{day.dayName}</span>
                    <span className="text-xs font-mono text-[var(--ink)]">{day.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.weakAreas.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
                <h3 className="font-semibold text-[var(--ink)] mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  Area Lemah
                </h3>
                <div className="space-y-2">
                  {user.weakAreas.map((area) => (
                    <div key={area.slug} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--ink)]">{area.name}</span>
                      <span className="text-sm font-mono text-red-500">{area.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
                <h3 className="font-semibold text-[var(--ink)] mb-3 flex items-center gap-2">
                  <Target size={16} className="text-green-500" />
                  Topik Favorit
                </h3>
                <div className="space-y-2">
                  {user.favoriteTopics.map((topic) => (
                    <div key={topic.slug} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--ink)]">{topic.name}</span>
                      <span className="text-sm font-mono text-green-500">{topic.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {user.subtestStats.length > 0 && (
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <h3 className="font-semibold text-[var(--ink)] mb-4">Statistik per Subtes</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[var(--soft-ink)] border-b border-[var(--edge)]">
                    <th className="pb-2">Subtes</th>
                    <th className="pb-2 text-right">Dijawab</th>
                    <th className="pb-2 text-right">Benar</th>
                    <th className="pb-2 text-right">Akurasi</th>
                  </tr>
                </thead>
                <tbody>
                  {user.subtestStats.map((stat) => (
                    <tr key={stat.slug} className="border-b border-[var(--edge)] last:border-b-0">
                      <td className="py-2 text-[var(--ink)]">
                        <div>{stat.name}</div>
                        <div className="text-xs text-[var(--soft-ink)]">{stat.slug}</div>
                      </td>
                      <td className="py-2 text-right font-mono text-[var(--ink)]">
                        {stat.answered}
                      </td>
                      <td className="py-2 text-right font-mono text-[var(--ink)]">
                        {stat.correct}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-mono ${
                            stat.accuracy >= 70
                              ? "text-green-500"
                              : stat.accuracy >= 50
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {stat.accuracy > 0 ? `${stat.accuracy}%` : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {user.recentActivity.length > 0 && (
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <h3 className="font-semibold text-[var(--ink)] mb-4">Aktivitas Terakhir</h3>
              <div className="space-y-2">
                {user.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--edge)] last:border-b-0"
                  >
                    <div>
                      <span className="text-[var(--ink)]">{activity.topicName}</span>
                      <span className="text-xs text-[var(--soft-ink)] ml-2">
                        {new Date(activity.submittedAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-[var(--ink)]">
                        {activity.correct}/{activity.total}
                      </span>
                      <span className="text-xs text-[var(--soft-ink)]">
                        <Clock size={12} className="inline mr-1" />
                        {formatTime(activity.timeSpent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
            <h3 className="font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
              <FileText size={16} />
              Catatan Admin
            </h3>
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan tentang user ini..."
                className="w-full h-24 px-3 py-2 border border-[var(--edge)] rounded-md bg-[var(--bg)] text-[var(--ink)] text-sm resize-none focus:border-[var(--gold)] focus:outline-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === user.accountNotes}
              >
                {savingNotes ? <Loader2 size={14} className="animate-spin" /> : null}
                Simpan Catatan
              </Button>
            </div>
          </div>

          <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
            <h3 className="font-semibold text-[var(--ink)] mb-4">Flag User</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--soft-ink)]">Demo:</span>
                <Button
                  variant={user.isDemo ? "default" : "outline"}
                  size="sm"
                  disabled={updatingFlag === "isDemo"}
                  onClick={() => onToggleFlag(user.id, "isDemo", user.isDemo)}
                >
                  {updatingFlag === "isDemo" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : user.isDemo ? (
                    <Shield size={14} />
                  ) : null}
                  {user.isDemo ? "Ya" : "Tidak"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--soft-ink)]">Leaderboard:</span>
                <Button
                  variant={user.hideFromLeaderboard ? "outline" : "default"}
                  size="sm"
                  disabled={updatingFlag === "hideFromLeaderboard"}
                  onClick={() =>
                    onToggleFlag(user.id, "hideFromLeaderboard", user.hideFromLeaderboard)
                  }
                >
                  {updatingFlag === "hideFromLeaderboard" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : user.hideFromLeaderboard ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                  {user.hideFromLeaderboard ? "Disembunyikan" : "Terlihat"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Total Login" value={user.sessionCount} icon={<Users size={14} />} />
            <StatTile
              label="Laporan Soal"
              value={user.reportsCount}
              icon={<AlertTriangle size={14} className="text-yellow-500" />}
            />
            <StatTile
              label="Login Terakhir"
              value={
                user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "Belum pernah"
              }
            />
            <StatTile
              label="Dinonaktifkan"
              value={
                user.deactivatedAt
                  ? new Date(user.deactivatedAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "-"
              }
            />
          </div>

          {user.recentActivity.length > 0 && (
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <h3 className="font-semibold text-[var(--ink)] mb-4">Riwayat Latihan</h3>
              <div className="space-y-2">
                {user.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-3 border-b border-[var(--edge)] last:border-b-0"
                  >
                    <div>
                      <span className="text-[var(--ink)]">{activity.topicName}</span>
                      <span className="text-xs text-[var(--soft-ink)] ml-2">
                        {new Date(activity.submittedAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="font-mono text-sm text-green-500">{activity.correct}</span>
                        <span className="text-[var(--soft-ink)]">/</span>
                        <span className="font-mono text-sm text-[var(--ink)]">
                          {activity.total}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--soft-ink)]">
                        <Clock size={12} className="inline mr-1" />
                        {formatTime(activity.timeSpent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile
              label="Login Gagal"
              value={user.failedLoginAttempts}
              icon={<XCircle size={14} className="text-red-500" />}
            />
            <StatTile label="Total Login" value={user.sessionCount} icon={<Users size={14} />} />
            <StatTile
              label="Login Terakhir"
              value={
                user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "Belum pernah"
              }
            />
          </div>

          <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
            <h3 className="font-semibold text-[var(--ink)] mb-4">Role & Akses</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--soft-ink)]">Role:</span>
              <Select value={user.role} onValueChange={(v) => onChangeRole(user.id, v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-red-500/30 rounded-md p-4 bg-red-500/5">
            <h3 className="font-semibold text-red-500 mb-4">Aksi Berbahaya</h3>
            <div className="flex flex-wrap gap-4">
              <Button
                variant={user.isDeactivated ? "default" : "outline"}
                className={user.isDeactivated ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => onDeactivate(user.id, !user.isDeactivated)}
              >
                {user.isDeactivated ? <Unlock size={14} /> : <Lock size={14} />}
                {user.isDeactivated ? "Aktifkan Kembali" : "Nonaktifkan Akun"}
              </Button>
              <Button variant="outline" onClick={() => onResetProgress(user.id)}>
                <RotateCcw size={14} />
                Reset Progres
              </Button>
              <Button variant="destructive" onClick={() => onDeleteUser(user.id)}>
                <Trash2 size={14} />
                Hapus Akun
              </Button>
            </div>
            {user.isDeactivated && (
              <p className="mt-3 text-sm text-red-400">
                Akun dinonaktifkan pada:{" "}
                {new Date(user.deactivatedAt!).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
