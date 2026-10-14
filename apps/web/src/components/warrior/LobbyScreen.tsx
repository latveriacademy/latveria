import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { BattleStateDto } from "@latveria/shared";
import { Button } from "../ui/button";
import { PageHeading, Panel, PanelHeader } from "../ui/dashboard";
import styles from "./battle.module.css";

interface LobbyScreenProps {
  battleState: BattleStateDto;
  onToggleReady: (isReady: boolean) => void;
  onLeave: () => void;
  connected?: boolean;
}

export function LobbyScreen({
  battleState,
  onToggleReady,
  onLeave,
  connected = true,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const me = battleState.participants.find((player) => player.id === battleState.myParticipantId);
  const maxPerTeam = battleState.mode === "1v1" ? 1 : 2;
  const duel = battleState.mode === "1v1";
  const orderedTeams = [...battleState.teams].sort(
    (first, second) =>
      Number(second.id === battleState.myTeamId) - Number(first.id === battleState.myTeamId),
  );
  const starting = battleState.status === "countdown";
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(battleState.code);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <div className={styles.screen}>
      <PageHeading
        title={duel ? "Ruang tunggu duel" : "Ruang tunggu tim"}
        description={`${battleState.mode === "1v1" ? "1 vs 1" : "2 vs 2"} · ${battleState.questionCount} soal · ${battleState.timePerQuestionSeconds} detik per soal`}
        actions={
          <div className={styles.copyGroup}>
            <div>
              <span className={styles.muted}>Kode room</span>
              <code className={styles.code}>{battleState.code}</code>
            </div>
            <Button variant="outline" onClick={copyCode}>
              <Copy size={16} aria-hidden="true" />
              {copied ? "Disalin" : "Salin kode"}
            </Button>
          </div>
        }
      />
      <div className={styles.stack}>
        {copyError && (
          <p className={`${styles.notice} ${styles.error}`} role="alert">
            Kode belum dapat disalin. Pilih kode room untuk menyalinnya secara manual.
          </p>
        )}
        <div className={styles.twoColumns}>
          {orderedTeams.map((team) => {
            const players = battleState.participants.filter((player) => player.teamId === team.id);
            return (
              <Panel key={team.id} className={styles.panel}>
                <PanelHeader
                  title={
                    team.id === battleState.myTeamId
                      ? duel
                        ? "Kamu"
                        : "Tim kamu"
                      : duel
                        ? "Lawan"
                        : "Tim lawan"
                  }
                >
                  <span className={styles.muted}>
                    {duel
                      ? players.length
                        ? "Pemain bergabung"
                        : "Belum bergabung"
                      : `${players.length}/${maxPerTeam} pemain`}
                  </span>
                </PanelHeader>
                <ul className={styles.players} aria-label={`Pemain tim ${team.teamNumber}`}>
                  {players.map((player) => (
                    <li className={styles.player} key={player.id}>
                      <span className={styles.avatar} aria-hidden="true">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      <div className={styles.identity}>
                        <strong>
                          {player.name}
                          {player.id === battleState.myParticipantId && " (Kamu)"}
                        </strong>
                        <span className={styles.muted}>
                          {player.isConnected ? "Terhubung" : "Terputus"}
                        </span>
                      </div>
                      <span className={player.isReady ? styles.ready : styles.muted}>
                        {player.isReady && <Check size={14} aria-hidden="true" />}
                        {player.isReady ? "Siap" : "Belum siap"}
                      </span>
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, maxPerTeam - players.length) }, (_, index) => (
                    <li key={`empty-${index}`} className={styles.slot}>
                      {duel ? "Menunggu lawan" : "Menunggu anggota tim"}
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
        <p className={styles.notice} role="status">
          {starting
            ? duel
              ? "Kalian berdua siap. Duel segera dimulai…"
              : "Semua anggota siap. Battle tim segera dimulai…"
            : duel
              ? "Bagikan kode ke lawanmu. Duel dimulai setelah kalian berdua siap."
              : "Bagikan kode ke tiga pemain lain. Battle tim dimulai setelah semua anggota siap."}
        </p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={onLeave}>
            Keluar room
          </Button>
          <Button
            className={me?.isReady ? "" : "btn-gold-solid"}
            variant={me?.isReady ? "outline" : "default"}
            disabled={!connected || starting}
            onClick={() => onToggleReady(!me?.isReady)}
          >
            {starting
              ? "Menyiapkan arena…"
              : me?.isReady
                ? "Batal siap"
                : duel
                  ? "Siap duel"
                  : "Siap battle tim"}
          </Button>
        </div>
      </div>
    </div>
  );
}
