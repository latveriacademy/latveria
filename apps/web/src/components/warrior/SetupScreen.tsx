import { useState, type FormEvent } from "react";
import { ArrowRight, Clock, History, Plus, Users } from "lucide-react";
import { Button } from "../ui/button";
import { PageHeading, Panel, PanelHeader } from "../ui/dashboard";
import styles from "./setup.module.css";

interface SetupScreenProps {
  onCreateBattle: (params: {
    mode: "1v1" | "2v2";
    questionCount: number;
    timePerQuestionSeconds: number;
  }) => void;
  onJoinBattle: (code: string) => void;
  onOpenHistory: () => void;
  pending?: "create" | "join" | null;
}

export function SetupScreen({
  onCreateBattle,
  onJoinBattle,
  onOpenHistory,
  pending = null,
}: SetupScreenProps) {
  const [mode, setMode] = useState<"1v1" | "2v2">("1v1");
  const [questionCount, setQuestionCount] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const busy = pending !== null;
  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) onCreateBattle({ mode, questionCount, timePerQuestionSeconds: 20 });
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
          <Button variant="outline" onClick={onOpenHistory} disabled={busy}>
            <History size={16} aria-hidden="true" />
            Riwayat battle
          </Button>
        }
      />
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
