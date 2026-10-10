import React, { useEffect, useState } from "react";
import { Zap, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import type { BattleActiveQuestion, BattleStateDto, QuestionResultDto } from "@latveria/shared";
import { QuestionRenderer } from "../question-renderer";
import { sound } from "../../utils/audioFeedback";

interface ArenaScreenProps {
  battleState: BattleStateDto;
  activeQuestion: BattleActiveQuestion;
  questionResult: QuestionResultDto | null;
  lastLockedPlayer: { name: string; teamNumber: number; elapsedMs: number } | null;
  onSubmitAnswer: (selectedAnswer: number) => void;
}

export function ArenaScreen({
  battleState,
  activeQuestion,
  questionResult,
  lastLockedPlayer,
  onSubmitAnswer,
}: ArenaScreenProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(activeQuestion.durationSeconds);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Reset local answer selection on new question
  useEffect(() => {
    setSelectedOpt(null);
    setIsLocked(false);
  }, [activeQuestion.position]);

  // Server-authoritative timer countdown display
  useEffect(() => {
    if (!activeQuestion.deadlineAt) return;
    const deadline = new Date(activeQuestion.deadlineAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = Math.max(0, deadline - now);
      const secs = Math.ceil(diffMs / 1000);
      setSecondsRemaining(secs);

      if (secs <= 5 && secs > 0) {
        sound.playClick();
      }
      if (diffMs <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [activeQuestion.deadlineAt]);

  const handleSelectAnswer = (idx: number) => {
    if (isLocked || questionResult) return;
    setSelectedOpt(idx);
    setIsLocked(true);
    sound.playSelect();
    onSubmitAnswer(idx);
  };

  const myTeam = battleState.teams.find((t) => t.id === battleState.myTeamId);
  const opponentTeam = battleState.teams.find((t) => t.id !== battleState.myTeamId);

  const myTeamScore = myTeam?.score ?? 0;
  const oppTeamScore = opponentTeam?.score ?? 0;
  const isLeading = myTeamScore > oppTeamScore;

  // Sound effects on reveal
  useEffect(() => {
    if (questionResult) {
      const myResult = questionResult.participants.find(
        (p) => p.participantId === battleState.myParticipantId,
      );
      if (myResult?.isCorrect) {
        sound.playSuccess();
      } else {
        sound.playClick();
      }
    }
  }, [questionResult, battleState.myParticipantId]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-2">
      {/* Top Duel Pressure Bar */}
      <div className="rounded-xl border border-border/80 bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--soft-ink)] border-b border-border/40 pb-2">
          <span>
            BABAK {activeQuestion.position} DARI {battleState.questionCount}
          </span>
          <span className="flex items-center gap-1 font-bold text-amber-500">
            <Clock className="size-3.5" /> {secondsRemaining}s
          </span>
        </div>

        {/* Live Score & Pressure Indicator */}
        <div className="mt-3 grid grid-cols-2 gap-4 items-center">
          {/* My Team */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[var(--ink)]">TIM KAMU</span>
              <span className="font-mono text-lg font-black text-blue-500">{myTeamScore} PTS</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-700/20 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(5, (myTeamScore / Math.max(1, myTeamScore + oppTeamScore)) * 100))}%`,
                }}
              />
            </div>
            {isLeading && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                <Zap className="size-3" /> Memimpin
              </span>
            )}
          </div>

          {/* Opponent Team */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-between text-sm flex-row-reverse">
              <span className="font-bold text-[var(--ink)]">LAWAN</span>
              <span className="font-mono text-lg font-black text-rose-500">{oppTeamScore} PTS</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-700/20 overflow-hidden flex justify-end">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(5, (oppTeamScore / Math.max(1, myTeamScore + oppTeamScore)) * 100))}%`,
                }}
              />
            </div>
            {!isLeading && oppTeamScore > myTeamScore && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 justify-end">
                <AlertCircle className="size-3" /> Lawan Memimpin
              </span>
            )}
          </div>
        </div>

        {/* Realtime Opponent Lock-in Alert Banner */}
        {lastLockedPlayer && !isLocked && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 py-1.5 px-3 text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
            <Zap className="size-3.5" />
            {lastLockedPlayer.name} telah mengunci jawaban! Waktu terus berjalan!
          </div>
        )}
      </div>

      {/* Main Question Card */}
      <div className="relative rounded-xl border border-border/80 bg-[var(--surface)] p-6 shadow-md">
        <QuestionRenderer
          question={{
            id: activeQuestion.id,
            prompt: activeQuestion.prompt,
            questionType: activeQuestion.questionType,
            options: activeQuestion.options,
            stimulus: activeQuestion.stimulus,
            passage: activeQuestion.passage,
            statements: activeQuestion.statements,
            // Reveal only after round result is received
            correctAnswer:
              typeof questionResult?.correctAnswer === "number"
                ? questionResult.correctAnswer
                : undefined,
            explanation: questionResult ? questionResult.explanation : undefined,
          }}

          answer={selectedOpt !== null ? String.fromCharCode(65 + selectedOpt) : null}
          evaluated={!!questionResult}
          disabled={isLocked || !!questionResult}
          onAnswer={(ans) => {
            if (typeof ans === "string") {
              const charCode = ans.charCodeAt(0) - 65;
              if (charCode >= 0 && charCode <= 4) {
                handleSelectAnswer(charCode);
              }
            }
          }}
          showVerdict={!!questionResult}
        />

        {/* Lock status feedback overlay */}
        {isLocked && !questionResult && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 p-3 text-sm font-semibold text-blue-500">
            <Zap className="size-4 animate-spin" /> Jawaban kamu telah dikunci! Menunggu semua
            pemain selesai...
          </div>
        )}

        {/* Micro Reveal Result Toast/Card */}
        {questionResult && (
          <div className="mt-6 rounded-xl border border-[var(--emerald)]/40 bg-[var(--emerald)]/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[var(--emerald)] uppercase tracking-wide">
                Hasil Babak {activeQuestion.position}
              </span>
              <span className="text-xs text-[var(--soft-ink)]">
                Lanjut otomatis ke babak berikutnya...
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {questionResult.participants.map((pr) => (
                <div
                  key={pr.participantId}
                  className="rounded-lg border border-border/40 bg-[var(--card)] p-2.5 text-xs"
                >
                  <div className="font-medium truncate">{pr.name}</div>
                  <div className="mt-1 flex items-center justify-between font-mono">
                    {pr.isCorrect ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> +{pr.points}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold flex items-center gap-1">
                        <XCircle className="size-3" /> +0
                      </span>
                    )}
                    {pr.elapsedMs != null && (
                      <span className="text-[var(--soft-ink)]">
                        {(pr.elapsedMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
