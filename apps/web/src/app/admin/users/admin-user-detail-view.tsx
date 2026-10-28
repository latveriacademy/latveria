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
  KeyRound,
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

function DiscordIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--ink)] truncate">{user.name}</h2>
              {user.isDeactivated && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-medium">
                  DINONAKTIFKAN
                </span>
              )}
              {user.role === "admin" && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-500 font-medium">
                  ADMIN
                </span>
              )}
              {user.hasDiscord ? (
                <span className="text-xs px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-medium flex items-center gap-1.5">
                  <DiscordIcon size={13} />
                  Login Discord
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--edge)] text-[var(--soft-ink)] font-medium">
                  Email & Password
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
            <h3 className="font-semibold text-[var(--ink)] mb-3">Metode Autentikasi / Provider Login</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded border border-[var(--edge)] bg-[var(--bg)] flex items-start gap-3">
                <div className="p-2 rounded bg-[#5865F2]/10 text-[#5865F2] shrink-0 mt-0.5">
                  <DiscordIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[var(--ink)]">Discord OAuth</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        user.hasDiscord
                          ? "bg-green-500/20 text-green-500"
                          : "bg-[var(--edge)] text-[var(--soft-ink)]"
                      }`}
                    >
                      {user.hasDiscord ? "Terhubung" : "Tidak Terhubung"}
                    </span>
                  </div>
                  {user.hasDiscord ? (
                    <div className="mt-1.5 text-xs text-[var(--soft-ink)] space-y-1">
                      <div>
                        ID Akun Discord:{" "}
                        <span className="font-mono text-[var(--ink)] font-semibold select-all">
                          {user.discordAccountId || "—"}
                        </span>
                      </div>
                      {user.discordLinkedAt && (
                        <div>
                          Terhubung sejak:{" "}
                          {new Date(user.discordLinkedAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--soft-ink)]">
                      User ini belum pernah login atau menautkan akun Discord.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 rounded border border-[var(--edge)] bg-[var(--bg)] flex items-start gap-3">
                <div className="p-2 rounded bg-[var(--edge)] text-[var(--ink)] shrink-0 mt-0.5">
                  <KeyRound size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[var(--ink)]">Email & Password</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        user.providers?.includes("credential")
                          ? "bg-green-500/20 text-green-500"
                          : "bg-[var(--edge)] text-[var(--soft-ink)]"
                      }`}
                    >
                      {user.providers?.includes("credential") ? "Aktif" : "Tidak Digunakan"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--soft-ink)]">
                    {user.providers?.includes("credential")
                      ? `Login langsung menggunakan email ${user.email} dan kata sandi.`
                      : "Akun ini dibuat tanpa kata sandi (login pihak ketiga)."}
                  </p>
                </div>
              </div>
            </div>
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
