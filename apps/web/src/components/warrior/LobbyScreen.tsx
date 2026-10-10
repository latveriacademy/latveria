import React, { useState } from "react";
import { Copy, Check, Users, Swords, Clock, HelpCircle } from "lucide-react";

import type { BattleStateDto } from "@latveria/shared";
import { Button } from "@/components/ui/button";

interface LobbyScreenProps {
  battleState: BattleStateDto;
  onToggleReady: (isReady: boolean) => void;
  onLeave: () => void;
}

export function LobbyScreen({ battleState, onToggleReady, onLeave }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);

  const myParticipant = battleState.participants.find((p) => p.id === battleState.myParticipantId);
  const isMyReady = myParticipant?.isReady ?? false;

  const team1 = battleState.teams.find((t) => t.teamNumber === 1);
  const team2 = battleState.teams.find((t) => t.teamNumber === 2);

  const team1Players = battleState.participants.filter((p) => team1 && p.teamId === team1.id);
  const team2Players = battleState.participants.filter((p) => team2 && p.teamId === team2.id);

  const maxPerTeam = battleState.mode === "1v1" ? 1 : 2;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(battleState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const allReady =
    battleState.participants.length === (battleState.mode === "1v1" ? 2 : 4) &&
    battleState.participants.every((p) => p.isReady);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Header Room Info */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--gold)]/20 bg-[var(--surface)] p-6 shadow-md backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-mono font-medium text-[var(--gold)]">
              <Swords className="size-3.5" />
              WARRIOR BATTLE · {battleState.mode}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
              Ruang Tunggu Duel
            </h2>
            <div className="mt-1 flex items-center gap-4 text-xs text-[var(--soft-ink)]">
              <span className="flex items-center gap-1">
                <HelpCircle className="size-3.5" /> {battleState.questionCount} Soal
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {battleState.timePerQuestionSeconds}s / soal
              </span>
            </div>
          </div>

          {/* Room Code Banner */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--emerald)]/30 bg-[var(--emerald)]/5 px-4 py-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--soft-ink)]">
                KODE ROOM
              </div>
              <div className="text-2xl font-black font-mono tracking-widest text-[var(--emerald)]">
                {battleState.code}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="ml-2 h-9 px-3 text-xs"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copied ? "Disalin" : "Salin"}
            </Button>
          </div>
        </div>
      </div>

      {/* Battle Teams Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TEAM 1 */}
        <div className="rounded-xl border border-border/80 bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-sm font-semibold tracking-wide text-blue-500 flex items-center gap-1.5">
              <Users className="size-4" /> TIM ALFA
            </span>
            <span className="text-xs font-mono text-[var(--soft-ink)]">
              {team1Players.length}/{maxPerTeam}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {team1Players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-[var(--card)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-500">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)]">
                      {player.name}
                      {player.id === battleState.myParticipantId && (
                        <span className="ml-1.5 text-[11px] text-[var(--gold)] font-mono">
                          (Kamu)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--soft-ink)]">
                      {player.isConnected ? "Terhubung" : "Terputus"}
                    </div>
                  </div>
                </div>
                <div>
                  {player.isReady ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">
                      <Check className="size-3" /> SIAP
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
                      MENUNGGU
                    </span>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: maxPerTeam - team1Players.length }).map((_, idx) => (
              <div
                key={`empty-t1-${idx}`}
                className="flex items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-xs text-[var(--soft-ink)]"
              >
                Slot Kosong Tim 1
              </div>
            ))}
          </div>
        </div>

        {/* TEAM 2 */}
        <div className="rounded-xl border border-border/80 bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-sm font-semibold tracking-wide text-rose-500 flex items-center gap-1.5">
              <Users className="size-4" /> TIM BRAVO
            </span>
            <span className="text-xs font-mono text-[var(--soft-ink)]">
              {team2Players.length}/{maxPerTeam}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {team2Players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-[var(--card)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-rose-500/10 text-sm font-bold text-rose-500">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)]">
                      {player.name}
                      {player.id === battleState.myParticipantId && (
                        <span className="ml-1.5 text-[11px] text-[var(--gold)] font-mono">
                          (Kamu)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--soft-ink)]">
                      {player.isConnected ? "Terhubung" : "Terputus"}
                    </div>
                  </div>
                </div>
                <div>
                  {player.isReady ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">
                      <Check className="size-3" /> SIAP
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
                      MENUNGGU
                    </span>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: maxPerTeam - team2Players.length }).map((_, idx) => (
              <div
                key={`empty-t2-${idx}`}
                className="flex items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-xs text-[var(--soft-ink)]"
              >
                Slot Kosong Tim 2
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ready and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/60 bg-[var(--surface)] p-4">
        <Button variant="outline" type="button" onClick={onLeave}>
          Keluar Room
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={isMyReady ? "outline" : "default"}
            onClick={() => onToggleReady(!isMyReady)}
            className="w-40 font-bold min-h-11"
          >
            {isMyReady ? "Batal Siap" : "Saya Siap!"}
          </Button>
        </div>
      </div>

      {allReady && (
        <div className="rounded-lg bg-emerald-500/10 p-3 text-center text-sm font-semibold text-emerald-500 animate-pulse">
          Semua peserta telah siap! Duel segera dimulai dalam hitungan mundur...
        </div>
      )}
    </div>
  );
}
