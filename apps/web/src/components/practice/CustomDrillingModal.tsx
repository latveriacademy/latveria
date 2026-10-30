import React, { useEffect, useState } from "react";
import { Check, Flame, Layers, Loader2, Sliders, Sparkles, Zap } from "lucide-react";
import type { Topic } from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { SubtestIcon } from "../subtest-icon";

interface CustomDrillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryOption {
  name: string;
  count: number;
}

const QUESTION_COUNTS = [5, 10, 15, 20, 30];

export function CustomDrillingModal({ isOpen, onClose }: CustomDrillingModalProps) {
  const { topics = [], startPractice } = useApp() as {
    topics: Topic[];
    startPractice: (
      subjectId: string,
      mode?: string,
      count?: number,
      difficulty?: string,
      packageId?: string | null,
      customOptions?: { isCustom?: boolean; category?: string } | null,
    ) => Promise<void>;
  };

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");

  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timerMode, setTimerMode] = useState<"Challenge" | "Santai">("Challenge");
  const [starting, setStarting] = useState(false);

  // Set default topic when opened
  useEffect(() => {
    if (isOpen && topics.length > 0 && !selectedTopic) {
      const defaultTopic = topics.find((t) => t.category === "Tes Skolastik") || topics[0];
      setSelectedTopic(defaultTopic);
    }
  }, [isOpen, topics, selectedTopic]);

  // Fetch categories when selectedTopic changes
  useEffect(() => {
    if (!selectedTopic) return;
    let active = true;
    setLoadingCategories(true);
    setSelectedCategory("semua");

    api<{ categories: CategoryOption[] }>(`/learner/practice/${selectedTopic.slug}/categories`)
      .then((res) => {
        if (active) {
          setCategories(res.categories || []);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat kategori:", err);
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTopic]);

  const handleStart = async () => {
    if (!selectedTopic || starting) return;
    setStarting(true);
    try {
      await startPractice(selectedTopic.id, timerMode, questionCount, "Latverian Elite", null, {
        isCustom: true,
        category: selectedCategory === "semua" ? undefined : selectedCategory,
      });
      onClose();
    } catch (err) {
      console.error("Gagal memulai custom drilling:", err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[var(--edge-subtle)]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
              <Sliders className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[var(--ink)]">
                Custom Drilling Mandiri
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--ink-muted)]">
                Pilih subtes, bab materi, kuantitas soal, dan mode latihan sesuai kebutuhan
                belajarmu.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Langkah 1: Pilih Subtes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-mono flex items-center justify-center">
                1
              </span>
              Pilih Subtes UTBK
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topics.map((t) => {
                const isSelected = selectedTopic?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTopic(t)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                      isSelected
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--ink)] shadow-sm"
                        : "border-[var(--edge)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <div
                      className={`size-6 rounded flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[var(--gold)] text-[var(--bg-card)]"
                          : "bg-[var(--surface-subtle)] text-[var(--gold)]"
                      }`}
                    >
                      <SubtestIcon slug={t.slug} size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold block truncate">{t.name}</span>
                      <span className="text-[9.5px] text-[var(--ink-muted)] block truncate">
                        {t.short || t.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Langkah 2: Pilih Bab/Topik Materi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <span className="size-4 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-mono flex items-center justify-center">
                  2
                </span>
                Pilih Bab / Topik Materi
              </label>
              {loadingCategories && (
                <span className="text-[10px] text-[var(--ink-muted)] flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin text-[var(--gold)]" />
                  Memuat bab…
                </span>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 rounded-lg border border-[var(--edge)] bg-[var(--surface-subtle)] p-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("semua")}
                className={`w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                  selectedCategory === "semua"
                    ? "bg-[var(--surface)] text-[var(--gold)] font-semibold border border-[var(--edge)] shadow-xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-3.5" />
                  <span>Semua Bab / Campuran Materi</span>
                </div>
                {selectedCategory === "semua" && <Check className="size-3.5" />}
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[var(--surface)] text-[var(--gold)] font-semibold border border-[var(--edge)] shadow-xs"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--ink-muted)] font-mono">
                        {cat.count} soal
                      </span>
                      {isSelected && <Check className="size-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Langkah 3: Jumlah Butir Soal */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-mono flex items-center justify-center">
                3
              </span>
              Jumlah Butir Soal
            </label>
            <div className="flex items-center gap-2">
              {QUESTION_COUNTS.map((cnt) => {
                const isSelected = questionCount === cnt;
                return (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--bg-card)] font-bold shadow-xs"
                        : "border-[var(--edge)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {cnt} Soal
                  </button>
                );
              })}
            </div>
          </div>

          {/* Langkah 4: Mode Latihan */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-mono flex items-center justify-center">
                4
              </span>
              Mode Latihan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTimerMode("Challenge")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  timerMode === "Challenge"
                    ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-sm"
                    : "border-[var(--edge)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
                    <Zap className="size-3.5 text-amber-500" />
                    <span>Mode Challenge</span>
                  </div>
                  {timerMode === "Challenge" && (
                    <span className="size-2 rounded-full bg-[var(--gold)]" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Hitung mundur waktu (~90 dtk/soal). Melatih kecepatan berpikir dan ketahanan
                  mental di bawah tekanan.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTimerMode("Santai")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  timerMode === "Santai"
                    ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-sm"
                    : "border-[var(--edge)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
                    <Sparkles className="size-3.5 text-emerald-500" />
                    <span>Mode Santai</span>
                  </div>
                  {timerMode === "Santai" && (
                    <span className="size-2 rounded-full bg-[var(--gold)]" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Fokus pendalaman konsep tanpa batas waktu. Rata-rata durasi per butir soal akan
                  disajikan di akhir sesi.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--edge-subtle)] flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={starting}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleStart}
            disabled={!selectedTopic || starting}
            size="sm"
            className="px-5 gap-1.5 text-xs font-semibold"
          >
            {starting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Flame className="size-3.5 text-[var(--gold)]" />
            )}
            <span>Mulai Drilling ({questionCount} Soal)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
