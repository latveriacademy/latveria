import { useState, type FormEvent } from "react";
import { ArrowRight, Clock, History, Plus, Users } from "lucide-react";
import { utbkSubtests, type BattleInviteDto } from "@latveria/shared";
import { Button } from "../ui/button";
import { PageHeading, Panel, PanelHeader } from "../ui/dashboard";
import styles from "./setup.module.css";

interface SetupScreenProps {
  onCreateBattle: (params: {
    mode: "1v1" | "2v2";
    questionCount: number;
    timePerQuestionSeconds: number;
    subtestSlug?: string | null;
  }) => void;
  onJoinBattle: (code: string) => void;
  onOpenHistory: () => void;
  onOpenFriends?: () => void;
  pendingInvites?: BattleInviteDto[];
  onAcceptInvite?: (inviteId: string) => void;
  onDeclineInvite?: (inviteId: string) => void;
  pending?: "create" | "join" | null;
}

export function SetupScreen({
  onCreateBattle,
  onJoinBattle,
  onOpenHistory,
  onOpenFriends,
  pendingInvites = [],
  onAcceptInvite,
  onDeclineInvite,
  pending = null,
}: SetupScreenProps) {
  const [mode, setMode] = useState<"1v1" | "2v2">("1v1");
  const [subtestSlug, setSubtestSlug] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const busy = pending !== null;
  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) {
      onCreateBattle({
        mode,
        questionCount,
        timePerQuestionSeconds: 20,
        subtestSlug: subtestSlug === "all" ? null : subtestSlug,
      });
    }
  };
  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && /^[A-Z2-9]{5}$/.test(joinCode)) onJoinBattle(joinCode);
  };

  return (
    <div className={styles.setup}>
      <PageHeading
        title="Warrior Battle"
        description="Buat room atau gabung dengan kode teman."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onOpenFriends} disabled={busy}>
              <Users size={16} aria-hidden="true" />
              Teman
            </Button>
            <Button variant="outline" onClick={onOpenHistory} disabled={busy}>
              <History size={16} aria-hidden="true" />
              Riwayat battle
            </Button>
          </div>
        }
      />

      {pendingInvites.length > 0 && (
        <div className={styles.inviteNotice} role="region" aria-label="Undangan battle masuk">
          <div className={styles.inviteNoticeHeader}>
            <span className={styles.inviteBadge}>⚔️ Undangan Battle Masuk</span>
          </div>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className={styles.inviteCard}>
              <div className={styles.inviteInfo}>
                <strong>{inv.sender.name}</strong> mengundangmu ke battle{" "}
                <span className="font-semibold text-gold">
                  {inv.mode === "1v1" ? "1 vs 1" : "2 vs 2"}
                </span>
                {inv.subtestName ? ` · Subtes: ${inv.subtestName}` : ""} ({inv.questionCount} soal)
              </div>
              <div className={styles.inviteActions}>
                <Button
                  size="sm"
                  className="btn-gold-solid"
                  onClick={() => onAcceptInvite?.(inv.id)}
                  disabled={busy}
                >
                  Terima & Masuk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeclineInvite?.(inv.id)}
                  disabled={busy}
                >
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.layout}>
        <Panel className={styles.panel}>
          <PanelHeader title="Buat room" />
          <form className={styles.form} onSubmit={handleCreate}>
            <fieldset className={styles.field} disabled={busy}>
              <legend>Format permainan</legend>
              <div className={styles.modes}>
                {(["1v1", "2v2"] as const).map((value) => (
                  <label key={value} className={styles.mode}>
                    <input
                      type="radio"
                      name="battle-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                    />
                    <Users size={18} aria-hidden="true" />
                    <span>{value === "1v1" ? "1 vs 1" : "2 vs 2"}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.field}>
              <span>Subtes materi</span>
              <select
                className={styles.input}
                value={subtestSlug}
                disabled={busy}
                onChange={(event) => setSubtestSlug(event.target.value)}
              >
                <option value="all">Semua Subtes (Acak Campuran)</option>
                {utbkSubtests.map((subtest) => (
                  <option key={subtest.slug} value={subtest.slug}>
                    {subtest.short} — {subtest.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.settings}>
              <label className={styles.field}>
                <span>Jumlah soal</span>
                <select
                  className={styles.input}
                  value={questionCount}
                  disabled={busy}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
                    <option key={number} value={number}>
                      {number} soal
                    </option>
                  ))}
                </select>
              </label>
              <p className={styles.time}>
                <Clock size={16} aria-hidden="true" />
                20 detik per soal
              </p>
            </div>
            <Button
              className={`btn-gold-solid ${styles.submit}`}
              type="submit"
              disabled={busy}
              loading={pending === "create"}
              loadingText="Membuat room…"
            >
              <Plus size={16} aria-hidden="true" />
              {mode === "1v1" ? "Buat room duel" : "Buat room tim"}
            </Button>
          </form>
        </Panel>
        <Panel className={styles.panel}>
          <PanelHeader title="Gabung room" />
          <form className={styles.form} onSubmit={handleJoin}>
            <p className={styles.hint}>Masukkan kode 5 karakter dari teman.</p>
            <label className={styles.field}>
              <span>Kode room</span>
              <input
                className={`${styles.input} ${styles.code}`}
                type="text"
                name="room-code"
                placeholder="X7K4P"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 5))
                }
                maxLength={10}
                minLength={5}
                pattern="[A-Z2-9]{5}"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={busy}
              />
            </label>
            <Button
              variant="outline"
              className={styles.submit}
              type="submit"
              disabled={busy || joinCode.length !== 5}
              loading={pending === "join"}
              loadingText="Menghubungkan…"
            >
              Gabung room
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
