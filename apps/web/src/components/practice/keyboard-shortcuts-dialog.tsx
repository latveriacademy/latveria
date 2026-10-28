import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUT_GROUPS: { category: string; items: ShortcutItem[] }[] = [
  {
    category: "Pengerjaan Soal",
    items: [
      {
        keys: ["A", "B", "C", "D", "E"],
        description: "Memilih opsi jawaban A sampai E",
      },
      {
        keys: ["1", "2", "3", "4", "5"],
        description: "Memilih opsi jawaban berdasarkan nomor urut",
      },
      {
        keys: ["F"],
        description: "Tandai ragu-ragu / hapus tanda pada soal",
      },
      {
        keys: ["Ctrl", "Enter"],
        description: "Kumpulkan jawaban latihan",
      },
    ],
  },
  {
    category: "Navigasi",
    items: [
      {
        keys: ["←"],
        description: "Pindah ke butir soal sebelumnya",
      },
      {
        keys: ["→"],
        description: "Pindah ke butir soal berikutnya",
      },
    ],
  },
  {
    category: "Alat & Bantuan",
    items: [
      {
        keys: ["C"],
        description: "Buka / tutup kalkulator (subtes kuantitatif)",
      },
      {
        keys: ["?"],
        description: "Buka panduan pintasan keyboard ini",
      },
      {
        keys: ["Esc"],
        description: "Menutup dialog atau jendela bantuan",
      },
    ],
  },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-[var(--accent-gold)]">
            <Keyboard size={20} />
            <DialogTitle className="text-lg font-serif font-bold">Pintasan Keyboard</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)] font-mono">
            Gunakan tombol keyboard untuk navigasi dan pengerjaan soal lebih cepat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent-gold)] font-bold">
                {group.category}
              </h3>
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-app)] divide-y divide-[var(--border-subtle)]">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 text-xs gap-3"
                  >
                    <span className="text-[var(--text-secondary)] font-sans">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && (
                            <span className="text-[var(--text-muted)] text-[10px]">+</span>
                          )}
                          <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-medium)] bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-primary)] shadow-sm">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] text-center">
          Pintasan nonaktif saat kursor berada di dalam kolom input teks.
        </div>
      </DialogContent>
    </Dialog>
  );
}
