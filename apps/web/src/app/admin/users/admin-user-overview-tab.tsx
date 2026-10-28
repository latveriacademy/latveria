import {
  Flame,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Target,
  FileText,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { StatTile } from "../../../components/ui/dashboard";
import type { UserDetail } from "./admin-users";

export function UserOverviewTab({
  user,
  notes,
  onChangeNotes,
  onSaveNotes,
  savingNotes,
  updatingFlag,
  onToggleFlag,
  formatTime,
  maxWeeklyCount,
}: {
  user: UserDetail;
  notes: string;
  onChangeNotes: (val: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
  updatingFlag: string | null;
  onToggleFlag: (
    userId: string,
    flag: "isDemo" | "hideFromLeaderboard",
    currentValue: boolean,
  ) => void;
  formatTime: (seconds: number) => string;
  maxWeeklyCount: number;
}) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Level", value: user.level },
          { label: "Total XP", value: user.totalXP },
          { label: "Soal Dijawab", value: user.answered },
          { label: "Benar", value: user.correct },
          { label: "Akurasi", value: user.accuracy > 0 ? `${user.accuracy}%` : "-" },
          { label: "Waktu Total", value: formatTime(user.timeSpent) },
          { label: "Rata-rata/Soal", value: formatTime(user.avgTimePerQuestion) },
          {
            label: "Streak Sekarang",
            value: `${user.currentStreak} hari`,
            icon: <Flame size={14} className="text-orange-500" />,
          },
          { label: "Streak Terpanjang", value: `${user.longestStreak} hari` },
          { label: "First Attempt", value: `${user.firstAttemptRate}%` },
          {
            label: "Improvement",
            value: `${user.improvementRate > 0 ? "+" : ""}${user.improvementRate}%`,
            icon: (
              <TrendingUp
                size={14}
                className={user.improvementRate >= 0 ? "text-green-500" : "text-red-500"}
              />
            ),
          },
          {
            label: "Bergabung",
            value: new Date(user.createdAt).toLocaleDateString("id-ID", {
              timeZone: "Asia/Jakarta",
            }),
          },
        ].map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={"icon" in stat ? stat.icon : undefined}
          />
        ))}
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
        <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)] overflow-x-auto">
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
            {user.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--edge)] last:border-b-0"
              >
                <div>
                  <span className="text-[var(--ink)]">{activity.topicName}</span>
                  <span className="text-xs text-[var(--soft-ink)] ml-2">
                    {new Date(activity.submittedAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      minute: "2-digit",
                      hour: "2-digit",
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
          <label htmlFor="user-admin-notes" className="sr-only">
            Catatan internal user
          </label>
          <textarea
            id="user-admin-notes"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Tambahkan catatan tentang user ini..."
            className="w-full h-24 px-3 py-2 border border-[var(--edge)] rounded-md bg-[var(--bg)] text-[var(--ink)] text-sm resize-none focus:border-[var(--gold)] focus:outline-none"
          />
          <Button
            size="sm"
            onClick={onSaveNotes}
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
              onClick={() => onToggleFlag(user.id, "hideFromLeaderboard", user.hideFromLeaderboard)}
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
  );
}
