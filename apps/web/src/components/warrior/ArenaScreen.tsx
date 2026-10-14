import { useEffect, useState } from "react";
import { Clock, Check, X } from "lucide-react";
import type { BattleActiveQuestion, BattleStateDto, QuestionResultDto } from "@latveria/shared";
import { QuestionRenderer } from "../question/question-renderer";
import { PageHeading, Panel } from "../ui/dashboard";
import { sound } from "../../utils/audioFeedback";
import styles from "./battle.module.css";

interface ArenaScreenProps {
  battleState: BattleStateDto;
  activeQuestion: BattleActiveQuestion;
  questionResult: QuestionResultDto | null;
  lastLockedPlayer: { name: string; teamNumber: number; elapsedMs: number } | null;
  onSubmitAnswer: (selectedAnswer: number) => void;
  disabled?: boolean;
}

export function ArenaScreen({
  battleState,
  activeQuestion,
  questionResult,
  lastLockedPlayer,
  onSubmitAnswer,
  disabled = false,
}: ArenaScreenProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(activeQuestion.durationSeconds);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const me = battleState.participants.find((player) => player.id === battleState.myParticipantId);
  const locked = isLocked || Boolean(me?.isLocked);
  const myTeam = battleState.teams.find((team) => team.id === battleState.myTeamId);
  const opponent = battleState.teams.find((team) => team.id !== battleState.myTeamId);

  useEffect(() => {
    setSelectedOpt(null);
    setIsLocked(false);
  }, [activeQuestion.position]);
  useEffect(() => {
    if (!activeQuestion.deadlineAt || questionResult) return;
    const tick = () =>
      setSecondsRemaining(
        Math.max(0, Math.ceil((new Date(activeQuestion.deadlineAt).getTime() - Date.now()) / 1000)),
      );
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [activeQuestion.deadlineAt, questionResult]);
  useEffect(() => {
    if (!questionResult) return;
    const result = questionResult.participants.find(
      (player) => player.participantId === battleState.myParticipantId,
    );
    if (result?.isCorrect) sound.playSuccess();
  }, [questionResult, battleState.myParticipantId]);

  const select = (index: number) => {
    if (disabled || locked || questionResult) return;
    setSelectedOpt(index);
    setIsLocked(true);
    sound.playSelect();
    onSubmitAnswer(index);
  };
  return (
    <div className={styles.screen}>
      <PageHeading
        title="Warrior Battle"
        description={`${battleState.mode === "1v1" ? "Duel" : "Battle tim"} · Soal ${activeQuestion.position} dari ${battleState.questionCount}`}
        actions={
          <span
            className={`${styles.timer} ${secondsRemaining <= 5 && !questionResult ? styles.urgent : ""}`}
            role="timer"
            aria-label="Waktu tersisa"
          >
            <Clock size={18} aria-hidden="true" />
            {questionResult ? "Ronde selesai" : `${secondsRemaining} detik`}
          </span>
        }
      />
      <div className={styles.stack}>
        <Panel className={styles.scores} aria-label="Poin tim">
          <div className={styles.teamScore}>
            <span className={styles.muted}>{battleState.mode === "1v1" ? "Kamu" : "Tim kamu"}</span>
            <strong className={styles.score}>
              {myTeam?.score ?? 0}
              <small>poin</small>
            </strong>
          </div>
          <div className={styles.teamScore}>
            <span className={styles.muted}>
              {battleState.mode === "1v1" ? "Lawan" : "Tim lawan"}
            </span>
            <strong className={styles.score}>
              {opponent?.score ?? 0}
              <small>poin</small>
            </strong>
          </div>
        </Panel>
        {lastLockedPlayer && !locked && !questionResult && (
          <p className={styles.notice} role="status">
            {lastLockedPlayer.name} sudah menjawab.
          </p>
        )}
        <QuestionRenderer
          question={{
            id: activeQuestion.id,
            prompt: activeQuestion.prompt,
            questionType: activeQuestion.questionType,
            options: activeQuestion.options,
            stimulus: activeQuestion.stimulus,
            passage: activeQuestion.passage,
            statements: activeQuestion.statements,
          }}
          answer={selectedOpt === null ? null : String.fromCharCode(65 + selectedOpt)}
          evaluated={false}
          disabled={disabled || locked || Boolean(questionResult)}
          onAnswer={(answer) => {
            if (typeof answer === "string") {
              const index = answer.charCodeAt(0) - 65;
              if (index >= 0 && index < activeQuestion.options.length) select(index);
            }
          }}
          showVerdict={false}
        />
        {locked && !questionResult && (
          <p className={styles.notice} role="status">
            Jawaban dikunci. Menunggu pemain lain.
          </p>
        )}
        {questionResult && (
          <Panel className={styles.panel}>
            <div className={styles.feedbackHeader}>
              <h2>Hasil ronde {activeQuestion.position}</h2>
              <span className={styles.muted}>
                {activeQuestion.position === battleState.questionCount
                  ? "Menyiapkan hasil battle…"
                  : "Soal berikutnya akan dimulai…"}
              </span>
            </div>
            <ul className={styles.players}>
              {questionResult.participants.map((player) => (
                <li key={player.participantId} className={styles.player}>
                  <div className={styles.identity}>
                    <strong>{player.name}</strong>
                    <span className={styles.muted}>
                      {battleState.mode === "1v1"
                        ? player.participantId === battleState.myParticipantId
                          ? "Kamu"
                          : "Lawan"
                        : player.teamNumber === myTeam?.teamNumber
                          ? "Tim kamu"
                          : "Tim lawan"}
                    </span>
                  </div>
                  <span className={player.isCorrect ? styles.ready : styles.muted}>
                    {player.isCorrect ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <X size={16} aria-hidden="true" />
                    )}
                    {player.elapsedMs === null
                      ? "Tidak dijawab"
                      : player.isCorrect
                        ? "Benar"
                        : "Salah"}
                  </span>
                  <span className={styles.points}>+{player.points} poin</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
