import React from "react";
import { Trophy, RotateCcw, Home } from "lucide-react";

import type { BattleSummaryDto } from "@latveria/shared";
import { Button } from "../ui/button";

interface ResultScreenProps {
  summary: BattleSummaryDto;
  onRequestRematch: () => void;
  onExit: () => void;
}

export function ResultScreen({ summary, onRequestRematch, onExit }: ResultScreenProps) {
  const isWinner = summary.isWinner;
  const isDraw = summary.isDraw;

  const team1 = summary.teams.find((t) => t.teamNumber === 1);
  const team2 = summary.teams.find((t) => t.teamNumber === 2);

  const team1Score = team1?.score ?? 0;
  const team2Score = team2?.score ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6 text-center">
      {/* Victory / Defeat Header */}
      <div className="rounded-2xl border border-border/80 bg-[var(--surface)] p-8 shadow-lg">
        <div className="inline-flex size-20 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)] mb-4">
          <Trophy className="size-10" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">
          {isDraw ? "HASIL IMBANG!" : isWinner ? "KEMENANGAN TELAK!" : "KEKALAHAN TERHORMAT"}
        </h1>
        <p className="mt-2 text-sm text-[var(--soft-ink)]">
          {isDraw
            ? "Kedua tim menunjukkan ketangkasan yang seimbang dalam duel akademik ini."
            : isWinner
              ? "Kecepatan dan ketepatanmu berhasil menundukkan lawan!"
              : "Lawan unggul dalam akumulasi poin dan kecepatan. Evaluasi dan tantang kembali!"}
        </p>

        {/* Big Score Comparison */}
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-[var(--card)] p-4">
          <div className="border-r border-border/60 pr-2">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-500 font-bold">
              TIM ALFA
            </div>
            <div className="mt-1 text-3xl font-black font-mono text-[var(--ink)]">{team1Score}</div>
          </div>
          <div className="pl-2">
            <div className="text-xs font-mono uppercase tracking-wider text-rose-500 font-bold">
              TIM BRAVO
            </div>
            <div className="mt-1 text-3xl font-black font-mono text-[var(--ink)]">{team2Score}</div>
          </div>
        </div>

        {/* Participant Breakdowns */}
        <div className="mt-6 space-y-2 text-left">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--soft-ink)]">
            KONTRIBUSI PESERTA
          </div>
          {summary.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    p.teamNumber === 1 ? "bg-blue-500" : "bg-rose-500"
                  }`}
                />
                <span className="font-medium">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-[var(--gold)]">{p.score} PTS</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            onClick={onRequestRematch}
            className="flex items-center gap-2 font-bold min-h-11 px-5"
          >
            <RotateCcw className="size-4" /> Rematch (Tanding Ulang)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onExit}
            className="flex items-center gap-2 min-h-11 px-5"
          >
            <Home className="size-4" /> Kembali ke Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
