import { RotateCcw, ArrowLeft, Trophy, Shield, Handshake } from "lucide-react";
import type { BattleSummaryDto } from "@latveria/shared";
import { Button } from "../ui/button";
import { PageHeading, Panel, PanelHeader } from "../ui/dashboard";
import styles from "./battle.module.css";

interface ResultScreenProps {
  summary: BattleSummaryDto;
  myTeamNumber?: number | null;
  onRequestRematch: () => void;
  onExit: () => void;
  onReview?: () => void;
}

export function ResultScreen({
  summary,
  myTeamNumber,
  onRequestRematch,
  onExit,
  onReview,
}: ResultScreenProps) {
  const ownTeam = myTeamNumber ?? summary.myTeamNumber;
  const won = ownTeam ? ownTeam === summary.winnerTeamNumber : summary.isWinner;
  const duel = summary.mode === "1v1";
  const title = summary.isDraw
    ? duel
      ? "Duel seri"
      : "Kedua tim seri"
    : won === true
      ? duel
        ? "Kamu menang"
        : "Tim kamu menang"
      : won === false
        ? duel
          ? "Kamu kalah"
          : "Tim kamu kalah"
        : duel
          ? "Duel selesai"
          : "Battle tim selesai";
  const OutcomeIcon = summary.isDraw ? Handshake : won ? Trophy : Shield;
  const outcomeClass = summary.isDraw ? styles.draw : won ? styles.victory : styles.defeat;
  const orderedTeams = [...summary.teams].sort(
    (first, second) => Number(second.teamNumber === ownTeam) - Number(first.teamNumber === ownTeam),
  );
  const ownScore = summary.teams.find((team) => team.teamNumber === ownTeam)?.score ?? 0;
  const opponentScore = summary.teams.find((team) => team.teamNumber !== ownTeam)?.score ?? 0;
  const difference = Math.abs(ownScore - opponentScore);
  const description = !ownTeam
    ? "Skor akhir pertandingan."
    : summary.isDraw
      ? duel
        ? "Skor kalian sama."
        : "Skor kedua tim sama."
      : won
        ? duel
          ? `Kamu unggul ${difference} poin dari lawan.`
          : `Tim kamu unggul ${difference} poin.`
        : duel
          ? `Lawan unggul ${difference} poin.`
          : `Tim lawan unggul ${difference} poin.`;
  return (
    <div className={styles.screen}>
      <PageHeading
        title={duel ? "Hasil duel" : "Hasil battle tim"}
        description={`${summary.mode === "1v1" ? "1 vs 1" : "2 vs 2"} · ${summary.questionCount} soal selesai`}
        actions={
          <Button variant="outline" onClick={onExit}>
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali
          </Button>
        }
      />
      <div className={styles.stack}>
        <Panel className={`${styles.outcome} ${outcomeClass}`}>
          <OutcomeIcon size={36} aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </Panel>
        <Panel className={styles.scores} aria-label="Skor akhir battle">
          {orderedTeams.map((team) => (
            <div className={styles.teamScore} key={team.id}>
              <span className={styles.muted}>
                {team.teamNumber === ownTeam
                  ? duel
                    ? "Kamu"
                    : "Tim kamu"
                  : duel
                    ? "Lawan"
                    : "Tim lawan"}
              </span>
              <strong
                className={`${styles.score} ${team.teamNumber === summary.winnerTeamNumber ? styles.winningScore : ""}`}
              >
                {team.score}
                <small>poin</small>
              </strong>
            </div>
          ))}
        </Panel>
        <Panel className={styles.panel}>
          <PanelHeader title={duel ? "Rincian pemain" : "Kontribusi anggota tim"} />
          <ul className={styles.players}>
            {summary.participants.map((player) => (
              <li key={player.id} className={styles.player}>
                <span className={styles.avatar} aria-hidden="true">
                  {player.name.charAt(0).toUpperCase()}
                </span>
                <div className={styles.identity}>
                  <strong>{player.name}</strong>
                  <span className={styles.muted}>
                    {player.teamNumber === ownTeam
                      ? duel
                        ? "Kamu"
                        : "Tim kamu"
                      : duel
                        ? "Lawan"
                        : "Tim lawan"}
                  </span>
                </div>
                <span className={styles.points}>{player.score} poin</span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className={styles.actions}>
          <div>
            {onReview && (
              <Button variant="outline" onClick={onReview}>
                Lihat pembahasan
              </Button>
            )}
          </div>
          <Button className="btn-gold-solid" onClick={onRequestRematch}>
            <RotateCcw size={16} aria-hidden="true" />
            {won
              ? duel
                ? "Main lagi"
                : "Main lagi bersama tim"
              : duel
                ? "Coba duel lagi"
                : "Coba lagi bersama tim"}
          </Button>
        </div>
      </div>
    </div>
  );
}
