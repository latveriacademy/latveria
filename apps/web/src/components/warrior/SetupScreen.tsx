import React, { useState } from "react";
import { Swords, Users, Play, LogIn, History, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

interface SetupScreenProps {
  onCreateBattle: (params: {
    mode: "1v1" | "2v2";
    questionCount: number;
    timePerQuestionSeconds: number;
  }) => void;
  onJoinBattle: (code: string) => void;
  onOpenHistory: () => void;
}

export function SetupScreen({ onCreateBattle, onJoinBattle, onOpenHistory }: SetupScreenProps) {
  const [mode, setMode] = useState<"1v1" | "2v2">("1v1");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinBattle(joinCode.trim().toUpperCase());
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      {/* Hero Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-mono font-medium text-[var(--gold)]">
          <Swords className="size-3.5" />
          ARENA AKADEMIK REALTIME
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">Warrior Battle</h1>
        <p className="text-sm text-[var(--soft-ink)] max-w-md mx-auto">
          Tantang kawan belajar dalam duel mengerjakan soal UTBK dengan sinkronisasi waktu ketat dan
          tekanan realtime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Battle Card */}
        <div className="rounded-xl border border-border/80 bg-[var(--surface)] p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
            <Swords className="size-5 text-[var(--emerald)]" /> Buat Duel Baru
          </h2>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-medium text-[var(--soft-ink)] uppercase font-mono">
              Format Battle
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <Button
                type="button"
                variant={mode === "1v1" ? "default" : "outline"}
                className="font-bold flex items-center gap-2"
                onClick={() => setMode("1v1")}
              >
                <Users className="size-4" /> 1 VS 1
              </Button>
              <Button
                type="button"
                variant={mode === "2v2" ? "default" : "outline"}
                className="font-bold flex items-center gap-2"
                onClick={() => setMode("2v2")}
              >
                <Users className="size-4" /> 2 VS 2
              </Button>
            </div>
          </div>

          {/* Question Count Selector (1-10) */}
          <div>
            <div className="flex justify-between items-center text-xs font-medium text-[var(--soft-ink)] uppercase font-mono">
              <span>Jumlah Soal</span>
              <span className="font-bold text-[var(--ink)]">{questionCount} Soal</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={questionCount === num ? "default" : "outline"}
                  size="sm"
                  className="font-mono text-xs h-8"
                  onClick={() => setQuestionCount(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            className="w-full font-bold flex items-center justify-center gap-2 mt-4 min-h-11"
            onClick={() =>
              onCreateBattle({
                mode,
                questionCount,
                timePerQuestionSeconds: 20,
              })
            }
          >
            <Play className="size-4" /> Buat Room Battle
          </Button>
        </div>

        {/* Join by Code Card */}
        <div className="rounded-xl border border-border/80 bg-[var(--surface)] p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <LogIn className="size-5 text-blue-500" /> Masuk dengan Kode
            </h2>
            <p className="mt-1 text-xs text-[var(--soft-ink)]">
              Punya kode undangan dari teman? Masukkan 5 karakter kode room di bawah ini.
            </p>

            <form onSubmit={handleJoin} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="room-code-input"
                  className="text-xs font-medium text-[var(--soft-ink)] uppercase font-mono"
                >
                  Kode Room
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  maxLength={6}
                  placeholder="MISAL: X7K4P"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full mt-1.5 rounded-lg border border-border bg-[var(--card)] px-4 py-2.5 text-center font-mono text-lg font-black tracking-widest text-[var(--ink)] placeholder:text-zinc-500 uppercase focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full font-bold flex items-center justify-center gap-2 min-h-11"
                disabled={joinCode.length < 3}
              >
                Gabung Room <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>

          {/* History shortcut */}
          <div className="pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs text-[var(--soft-ink)] flex items-center justify-center gap-2"
              onClick={onOpenHistory}
            >
              <History className="size-3.5" /> Riwayat Duel Terakhir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
