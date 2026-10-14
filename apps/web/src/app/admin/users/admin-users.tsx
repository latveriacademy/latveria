import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { User, Eye, EyeOff, Loader2, Trash2, Lock, Unlock, BarChart3 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { PageHeading, StatTile } from "../../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { api, ApiError } from "../../../lib/api";
import { UserDetailView } from "./admin-user-detail-view";

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

export interface UserStats {
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

export interface UserListResponse {
  rows: UserStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export interface UserDetail extends UserStats {
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
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
    try {
      await api(`/admin/users/${userId}/reset`, { method: "POST" });
      setResetTarget(null);
      await fetchList();
      if (selectedUser && selectedUser.id === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mereset progres.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api(`/admin/users/${userId}`, { method: "DELETE" });
      setDeleteTarget(null);
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
          onResetProgress={(userId) => setResetTarget(userId)}
          onDeleteUser={(userId) => setDeleteTarget(userId)}
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
                  onClick={() => setBulkDeleteOpen(true)}
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
      <ConfirmDialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Reset progres latihan?"
        description="Semua riwayat latihan dan sesi tryout user ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, reset"
        destructive
        onConfirm={() => {
          if (resetTarget) return handleResetProgress(resetTarget);
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus akun user?"
        description="User dan seluruh datanya akan dihapus permanen dari sistem."
        confirmLabel="Ya, hapus permanen"
        destructive
        onConfirm={() => {
          if (deleteTarget) return handleDeleteUser(deleteTarget);
        }}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Hapus ${selectedIds.size} user?`}
        description="Semua user yang dipilih beserta riwayatnya akan dihapus permanen dari sistem."
        confirmLabel="Ya, hapus semua"
        destructive
        onConfirm={() => handleBulkAction("delete")}
      />
    </div>
  );
}
