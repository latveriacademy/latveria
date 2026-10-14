import React, { useState } from "react";
import { api } from "../lib/api";

import { useWarriorBattle } from "../lib/useWarriorBattle";
import { SetupScreen } from "../components/warrior/SetupScreen";
import { LobbyScreen } from "../components/warrior/LobbyScreen";
import { ArenaScreen } from "../components/warrior/ArenaScreen";
import { ResultScreen } from "../components/warrior/ResultScreen";
import { HistoryScreen } from "../components/warrior/HistoryScreen";
import { ReviewScreen } from "../components/warrior/ReviewScreen";
import styles from "../components/warrior/battle.module.css";
import { Button } from "../components/ui/button";
import { PageHeading, Panel } from "../components/ui/dashboard";

export function WarriorBattleView() {
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<"setup" | "history">("setup");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [reviewBattleId, setReviewBattleId] = useState<string | null>(null);

  const {
    battleState,
    activeQuestion,
    questionResult,
    summary,
    isReconnecting,
    isConnected,
    lastLockedPlayer,
    toggleReady,
    submitAnswer,
    requestRematch,
  } = useWarriorBattle({
    battleId: activeBattleId ?? "",
    onError: (err) => setErrorMessage(err),
    onRematchCreated: (code) => {
      void handleJoinBattle(code);
    },
  });

  const handleCreateBattle = async (params: {
    mode: "1v1" | "2v2";
    questionCount: number;
    timePerQuestionSeconds: number;
  }) => {
    if (pending) return;
    setPending("create");
    try {
      setErrorMessage(null);
      const res = await api<{ battle: { id: string } }>("/warrior/battles", {
        method: "POST",
        body: JSON.stringify(params),
      });
      setActiveBattleId(res.battle.id);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal membuat room battle.");
    } finally {
      setPending(null);
    }
  };

  const handleJoinBattle = async (code: string) => {
    if (pending) return;
    setPending("join");
    try {
      setErrorMessage(null);
      const res = await api<{ battle: { id: string } }>("/warrior/battles/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setActiveBattleId(res.battle.id);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal bergabung ke room battle.");
    } finally {
      setPending(null);
    }
  };

  const handleExit = () => {
    setActiveBattleId(null);
    setViewState("setup");
  };

  if (reviewBattleId)
    return (
      <div className="latveria-view-container">
        <ReviewScreen battleId={reviewBattleId} onBack={() => setReviewBattleId(null)} />
      </div>
    );
  if (activeBattleId && !battleState) {
    return (
      <div className={`latveria-view-container ${styles.screen}`}>
        <PageHeading
          title="Warrior Battle"
          actions={
            <Button variant="outline" onClick={handleExit}>
              Kembali
            </Button>
          }
        />
        <div className={styles.stack}>
          {errorMessage && (
            <p className={`${styles.notice} ${styles.error}`} role="alert">
              {errorMessage}
            </p>
          )}
          <Panel className={styles.panel} role="status">
            <p className={styles.muted}>
              {isReconnecting ? "Menghubungkan ulang ke room…" : "Menghubungkan ke room…"}
            </p>
          </Panel>
        </div>
      </div>
    );
  }
  if (!activeBattleId || !battleState) {
    if (viewState === "history") {
      return (
        <div className="latveria-view-container">
          <HistoryScreen onBack={() => setViewState("setup")} onReview={setReviewBattleId} />
        </div>
      );
    }
    return (
      <div className="latveria-view-container space-y-4">
        {errorMessage && (
          <div className={`${styles.notice} ${styles.error}`} role="alert">
            {errorMessage}
          </div>
        )}
        <SetupScreen
          onCreateBattle={handleCreateBattle}
          onJoinBattle={handleJoinBattle}
          onOpenHistory={() => setViewState("history")}
          pending={pending}
        />
      </div>
    );
  }

  // Active Battle Views
  return (
    <div className="latveria-view-container space-y-4">
      {isReconnecting && (
        <div className={styles.notice} role="status">
          Koneksi terputus. Menghubungkan ulang ke server...
        </div>
      )}

      {errorMessage && (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          {errorMessage}
        </div>
      )}

      {battleState.status === "completed" && summary ? (
        <ResultScreen
          summary={summary}
          myTeamNumber={
            battleState.teams.find((team) => team.id === battleState.myTeamId)?.teamNumber
          }
          onRequestRematch={requestRematch}
          onExit={handleExit}
          onReview={() => setReviewBattleId(battleState.id)}
        />
      ) : activeQuestion &&
        (battleState.status === "active" || battleState.status === "question_result") ? (
        <ArenaScreen
          battleState={battleState}
          activeQuestion={activeQuestion}
          questionResult={questionResult}
          lastLockedPlayer={lastLockedPlayer}
          disabled={!isConnected}
          onSubmitAnswer={(sel) => submitAnswer(activeQuestion.id, activeQuestion.position, sel)}
        />
      ) : (
        <LobbyScreen
          battleState={battleState}
          onToggleReady={toggleReady}
          onLeave={handleExit}
          connected={isConnected}
        />
      )}
    </div>
  );
}
