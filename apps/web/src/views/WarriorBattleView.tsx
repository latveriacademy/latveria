import React, { useState } from "react";
import { api } from "../lib/api";

import { useWarriorBattle } from "../lib/useWarriorBattle";
import { SetupScreen } from "../components/warrior/SetupScreen";
import { LobbyScreen } from "../components/warrior/LobbyScreen";
import { ArenaScreen } from "../components/warrior/ArenaScreen";
import { ResultScreen } from "../components/warrior/ResultScreen";
import { HistoryScreen } from "../components/warrior/HistoryScreen";

export function WarriorBattleView() {
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<"setup" | "history">("setup");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    battleState,
    activeQuestion,
    questionResult,
    summary,
    isReconnecting,
    lastLockedPlayer,
    toggleReady,
    submitAnswer,
    requestRematch,
  } = useWarriorBattle({
    battleId: activeBattleId ?? "",
    onError: (err) => setErrorMessage(err),
  });

  const handleCreateBattle = async (params: {
    mode: "1v1" | "2v2";
    questionCount: number;
    timePerQuestionSeconds: number;
  }) => {
    try {
      setErrorMessage(null);
      const res = await api<{ battle: { id: string } }>("/warrior/battles", {
        method: "POST",
        body: JSON.stringify(params),
      });
      setActiveBattleId(res.battle.id);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal membuat room battle.");
    }
  };

  const handleJoinBattle = async (code: string) => {
    try {
      setErrorMessage(null);
      const res = await api<{ battle: { id: string } }>("/warrior/battles/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setActiveBattleId(res.battle.id);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal bergabung ke room battle.");
    }
  };

  const handleExit = () => {
    setActiveBattleId(null);
    setViewState("setup");
  };

  // If no active battle, show Setup or History
  if (!activeBattleId || !battleState) {
    if (viewState === "history") {
      return <HistoryScreen onBack={() => setViewState("setup")} />;
    }
    return (
      <div className="space-y-4">
        {errorMessage && (
          <div className="mx-auto max-w-2xl rounded-lg bg-rose-500/10 p-3 text-center text-sm font-semibold text-rose-500 border border-rose-500/20">
            {errorMessage}
          </div>
        )}
        <SetupScreen
          onCreateBattle={handleCreateBattle}
          onJoinBattle={handleJoinBattle}
          onOpenHistory={() => setViewState("history")}
        />
      </div>
    );
  }

  // Active Battle Views
  return (
    <div className="space-y-4">
      {isReconnecting && (
        <div className="rounded-lg bg-amber-500/10 p-2 text-center text-xs font-semibold text-amber-500 animate-pulse border border-amber-500/20">
          Koneksi terputus. Menghubungkan ulang ke server...
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-rose-500/10 p-2 text-center text-xs font-semibold text-rose-500 border border-rose-500/20">
          {errorMessage}
        </div>
      )}

      {battleState.status === "completed" && summary ? (
        <ResultScreen summary={summary} onRequestRematch={requestRematch} onExit={handleExit} />
      ) : activeQuestion &&
        (battleState.status === "active" || battleState.status === "question_result") ? (
        <ArenaScreen
          battleState={battleState}
          activeQuestion={activeQuestion}
          questionResult={questionResult}
          lastLockedPlayer={lastLockedPlayer}
          onSubmitAnswer={(sel) => submitAnswer(activeQuestion.id, activeQuestion.position, sel)}
        />
      ) : (
        <LobbyScreen battleState={battleState} onToggleReady={toggleReady} onLeave={handleExit} />
      )}
    </div>
  );
}
