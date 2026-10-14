import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { StatTile } from "../../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import type { UserDetail } from "./admin-users";
import { UserOverviewTab } from "./admin-user-overview-tab";

export interface UserDetailViewProps {
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

export function UserDetailView({
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
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} />
            Kembali
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--ink)] truncate">{user.name}</h2>
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
            <p className="text-sm text-[var(--soft-ink)] truncate">{user.email}</p>
          </div>
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
        <UserOverviewTab
          user={user}
          notes={notes}
          onChangeNotes={setNotes}
          onSaveNotes={handleSaveNotes}
          savingNotes={savingNotes}
          updatingFlag={updatingFlag}
          onToggleFlag={onToggleFlag}
          formatTime={formatTime}
          maxWeeklyCount={maxWeeklyCount}
        />
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Login", value: user.sessionCount, icon: <Users size={14} /> },
              {
                label: "Laporan Soal",
                value: user.reportsCount,
                icon: <AlertTriangle size={14} className="text-yellow-500" />,
              },
              {
                label: "Login Terakhir",
                value: user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "Belum pernah",
              },
              {
                label: "Dinonaktifkan",
                value: user.deactivatedAt
                  ? new Date(user.deactivatedAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "-",
              },
            ].map((stat) => (
              <StatTile key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
            ))}
          </div>

          {user.recentActivity.length > 0 && (
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <h3 className="font-semibold text-[var(--ink)] mb-4">Riwayat Latihan</h3>
              <div className="space-y-2">
                {user.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-[var(--edge)] last:border-b-0"
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
            {[
              {
                label: "Login Gagal",
                value: user.failedLoginAttempts,
                icon: <XCircle size={14} className="text-red-500" />,
              },
              { label: "Total Login", value: user.sessionCount, icon: <Users size={14} /> },
              {
                label: "Login Terakhir",
                value: user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                  : "Belum pernah",
              },
            ].map((stat) => (
              <StatTile key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
            ))}
          </div>

          <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
            <h3 className="font-semibold text-[var(--ink)] mb-4">Role & Akses</h3>
            <div className="flex items-center gap-4">
              <label htmlFor="user-role-select" className="text-sm text-[var(--soft-ink)]">
                Role:
              </label>
              <Select value={user.role} onValueChange={(v) => onChangeRole(user.id, v)}>
                <SelectTrigger id="user-role-select" className="w-40">
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
