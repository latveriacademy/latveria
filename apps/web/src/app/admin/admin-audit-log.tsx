import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Loader2, User, BookOpen, Package, BarChart3, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading } from "../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, ApiError } from "../../lib/api";

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogResponse {
  rows: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  user: User,
  question: BookOpen,
  package: Package,
  topic: Package,
  leaderboard: BarChart3,
  users: Download,
};

const ACTION_LABELS: Record<string, string> = {
  "user.flag_changed": "Ubah flag user",
  "user.progress_reset": "Reset progres",
  "question.created": "Buat soal",
  "question.updated": "Edit soal",
  "question.deleted": "Hapus soal",
  "question.restored": "Pulihkan soal",
  "question.excluded": "Kecualikan soal",
  "question.bulk_archived": "Arsip massal",
  "question.bulk_restored": "Pulihkan massal",
  "question.imported": "Impor soal",
  "package.created": "Buat paket",
  "package.updated": "Edit paket",
  "package.deleted": "Hapus paket",
  "package.restored": "Pulihkan paket",
  "topic.created": "Buat topik",
  "topic.updated": "Edit topik",
  "topic.deleted": "Hapus topik",
  "leaderboard.exported": "Ekspor leaderboard",
  "users.exported": "Ekspor users",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatTargetType(type: string): string {
  const labels: Record<string, string> = {
    user: "User",
    question: "Soal",
    package: "Paket",
    topic: "Topik",
    leaderboard: "Leaderboard",
    users: "Users",
  };
  return labels[type] ?? type;
}

function formatDetails(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([_, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "-";

  return entries
    .map(([k, v]) => {
      if (k === "count") return `${v} item`;
      if (k === "ids" && Array.isArray(v)) return `${v.length} ID`;
      if (typeof v === "boolean") return v ? "Ya" : "Tidak";
      return `${k}: ${v}`;
    })
    .join(", ");
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}h lalu`;
  if (diffHour > 0) return `${diffHour}j lalu`;
  if (diffMin > 0) return `${diffMin}m lalu`;
  return "Baru saja";
}

export function AdminAuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const action = searchParams.get("action") ?? "";
  const targetType = searchParams.get("target_type") ?? "";
  const adminId = searchParams.get("admin_id") ?? "";

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (action) params.set("action", action);
      if (targetType) params.set("target_type", targetType);
      if (adminId) params.set("admin_id", adminId);

      const result = await api<AuditLogResponse>(`/admin/audit?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat log.");
    } finally {
      setLoading(false);
    }
  }, [page, action, targetType, adminId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  };

  return (
    <div className="motion-page-enter">
      <PageHeading title="Log Aktivitas" description="Riwayat aksi admin di sistem" />

      {error && (
        <div className="mb-4 p-4 border border-red-500/50 bg-red-500/10 rounded-md text-red-400">
          {error}
          <Button variant="ghost" size="sm" className="ml-4" onClick={fetchData}>
            Coba lagi
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--soft-ink)]">Aksi:</span>
          <Select value={action} onValueChange={(v) => updateFilter("action", v)}>
            <SelectTrigger aria-label="Filter aksi admin" className="w-48">
              <SelectValue placeholder="Semua aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua aksi</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--soft-ink)]">Tipe:</span>
          <Select value={targetType} onValueChange={(v) => updateFilter("target_type", v)}>
            <SelectTrigger aria-label="Tipe target log" className="w-40">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="question">Soal</SelectItem>
              <SelectItem value="package">Paket</SelectItem>
              <SelectItem value="topic">Topik</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(action || targetType) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("action");
              next.delete("target_type");
              next.delete("admin_id");
              next.set("page", "1");
              setSearchParams(next);
            }}
          >
            Reset filter
          </Button>
        )}
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--gold)]" />
        </div>
      )}

      {data && (
        <>
          <div className="mb-4 flex items-center gap-4 text-sm text-[var(--soft-ink)]">
            <span>{data.pagination.total} aktivitas</span>
            {loading && <Loader2 className="size-4 animate-spin" />}
          </div>

          <div className="space-y-2">
            {data.rows.length === 0 ? (
              <div className="py-12 text-center text-[var(--soft-ink)]">
                Tidak ada aktivitas pada filter ini.
              </div>
            ) : (
              data.rows.map((entry) => {
                const Icon = ACTION_ICONS[entry.targetType] ?? Package;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 border border-[var(--edge)] rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                      <Icon size={18} className="text-[var(--gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--ink)]">
                          {formatAction(entry.action)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--edge)] text-[var(--soft-ink)]">
                          {formatTargetType(entry.targetType)}
                        </span>
                        {entry.targetId && (
                          <code className="text-xs text-[var(--soft-ink)] font-mono">
                            {entry.targetId.slice(0, 8)}...
                          </code>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-[var(--soft-ink)]">
                        oleh <span className="text-[var(--ink)]">{entry.adminEmail}</span>
                        <span className="mx-2">·</span>
                        <span>{formatTimeAgo(entry.createdAt)}</span>
                      </div>
                      {Object.keys(entry.details).length > 0 && (
                        <div className="mt-2 text-sm text-[var(--soft-ink)]">
                          {formatDetails(entry.details)}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-[var(--soft-ink)]">
                      {new Date(entry.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      })}
                    </div>
                  </div>
                );
              })
            )}
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
    </div>
  );
}
