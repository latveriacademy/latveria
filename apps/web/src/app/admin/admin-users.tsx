import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { ArrowLeft, User, Shield, Eye, EyeOff, Loader2 } from "lucide-react";
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

interface UserStats {
  id: string;
  name: string;
  codename: string;
  email: string;
  isDemo: boolean;
  hideFromLeaderboard: boolean;
  createdAt: string;
  answered: number;
  correct: number;
  accuracy: number;
  totalXP: number;
  level: number;
  streak: number;
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
  currentXP: number;
  nextLevelXP: number;
  practicedToday: boolean;
  subtestStats: Array<{
    slug: string;
    answered: number;
    correct: number;
    accuracy: number;
  }>;
  recentActivity: Array<{
    id: string;
    topicSlug: string;
    topicName: string;
    correct: number;
    total: number;
    submittedAt: string;
  }>;
}

export function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<UserListResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const demoFilter = searchParams.get("demo") ?? "";
  const sortBy = searchParams.get("sort") ?? "created_at";
  const sortOrder = searchParams.get("order") ?? "desc";
  const viewUserId = searchParams.get("view");

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (demoFilter) params.set("demo", demoFilter);
      params.set("sort", sortBy);
      params.set("order", sortOrder);

      const result = await api<UserListResponse>(`/admin/users?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar user.");
    } finally {
      setLoading(false);
    }
  }, [page, search, demoFilter, sortBy, sortOrder]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    try {
      const result = await api<UserDetail>(`/admin/users/${userId}`);
      setSelectedUser(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat detail user.");
    }
  }, []);

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
          updatingFlag={updatingFlag}
        />
      ) : (
        <>
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
                </SelectContent>
              </Select>
            </div>
          </div>

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
                        Flag
                      </th>
                      <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center">
                          <Loader2 className="size-6 animate-spin text-[var(--gold)] mx-auto" />
                        </td>
                      </tr>
                    ) : data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[var(--soft-ink)]">
                          Tidak ada user yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-[var(--edge)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
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
                            <div className="flex items-center justify-center gap-1">
                              {user.isDemo ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                  Demo
                                </span>
                              ) : null}
                              {user.hideFromLeaderboard ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                                  Hidden
                                </span>
                              ) : null}
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
  updatingFlag: string | null;
}

function UserDetailView({ user, onBack, onToggleFlag, updatingFlag }: UserDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Kembali
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[var(--ink)]">{user.name}</h2>
          <p className="text-sm text-[var(--soft-ink)]">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Level" value={user.level} />
        <StatTile label="Total XP" value={user.totalXP} />
        <StatTile label="Soal Dijawab" value={user.answered} />
        <StatTile label="Benar" value={user.correct} />
        <StatTile label="Akurasi" value={user.accuracy > 0 ? `${user.accuracy}%` : "-"} />
        <StatTile label="Streak" value={`${user.streak} hari`} />
        <StatTile
          label="Bergabung"
          value={new Date(user.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}
        />
        <StatTile label="Hari Ini" value={user.practicedToday ? "✓" : "-"} />
      </div>

      <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
        <h3 className="font-semibold text-[var(--ink)] mb-4">Flag User</h3>
        <div className="flex flex-wrap gap-4">
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
            <span className="text-sm text-[var(--soft-ink)]">Sembunyi dari leaderboard:</span>
            <Button
              variant={user.hideFromLeaderboard ? "default" : "outline"}
              size="sm"
              disabled={updatingFlag === "hideFromLeaderboard"}
              onClick={() => onToggleFlag(user.id, "hideFromLeaderboard", user.hideFromLeaderboard)}
            >
              {updatingFlag === "hideFromLeaderboard" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : user.hideFromLeaderboard ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
              {user.hideFromLeaderboard ? "Ya" : "Tidak"}
            </Button>
          </div>
        </div>
      </div>

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
                  <td className="py-2 text-[var(--ink)]">{stat.slug}</td>
                  <td className="py-2 text-right font-mono text-[var(--ink)]">{stat.answered}</td>
                  <td className="py-2 text-right font-mono text-[var(--ink)]">{stat.correct}</td>
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
            {user.recentActivity.slice(0, 10).map((activity) => (
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
                <span className="font-mono text-sm text-[var(--ink)]">
                  {activity.correct}/{activity.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
