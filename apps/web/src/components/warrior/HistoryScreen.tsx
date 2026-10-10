import React, { useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";

import type { BattleSummaryDto } from "@latveria/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [history, setHistory] = useState<BattleSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api<BattleSummaryDto[]>("/warrior/history")
      .then((data: BattleSummaryDto[]) => setHistory(data))
      .catch((err: unknown) => console.error("Failed to load battle history:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5">
          <ArrowLeft className="size-4" /> Kembali
        </Button>
        <h2 className="text-xl font-bold text-[var(--ink)] flex items-center gap-2">
          <Trophy className="size-5 text-[var(--gold)]" /> Riwayat Warrior Battle
        </h2>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--soft-ink)]">
          Memuat riwayat duel...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-sm text-[var(--soft-ink)]">
          Belum ada duel yang tercatat. Buat room dan tantang kawan belajarmu sekarang!
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const team1 = item.teams.find((t) => t.teamNumber === 1);
            const team2 = item.teams.find((t) => t.teamNumber === 2);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-[var(--surface)] p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        item.isDraw
                          ? "bg-zinc-500/10 text-zinc-400"
                          : item.isWinner
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {item.isDraw ? "SERI" : item.isWinner ? "MENANG" : "KALAH"}
                    </span>
                    <span className="text-xs font-mono text-[var(--soft-ink)]">
                      {item.mode} · {item.questionCount} Soal
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-[var(--soft-ink)]">
                    {new Date(item.endedAt ?? item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-base font-black text-[var(--ink)]">
                    {team1?.score ?? 0} - {team2?.score ?? 0}
                  </div>
                  <div className="text-[11px] text-[var(--soft-ink)]">Skor Akhir</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
