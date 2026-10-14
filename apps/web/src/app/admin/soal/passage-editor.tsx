import { useEffect, useState } from "react";
import { BookOpen, FileText, Link2, Sparkles } from "lucide-react";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { MathText } from "../../../components/math/math-text";

export interface AvailablePassage {
  id: string;
  passage: string;
  prompt: string;
}

export function PassageEditor({
  passage,
  onChangePassage,
  passageId,
  onChangePassageId,
  availablePassages,
  disabled,
  maxLength = 10000,
}: {
  passage: string;
  onChangePassage: (val: string) => void;
  passageId: string | null;
  onChangePassageId: (val: string | null) => void;
  availablePassages: AvailablePassage[];
  disabled?: boolean;
  maxLength?: number;
}) {
  const [mode, setMode] = useState<"none" | "new" | "reuse">(() => {
    if (passageId) return "reuse";
    if (passage && passage.trim()) return "new";
    return "none";
  });

  useEffect(() => {
    if (passageId) {
      setMode("reuse");
    } else if (passage && passage.trim()) {
      setMode("new");
    }
  }, [passageId, passage]);

  const selectedReusedPassage = availablePassages.find((p) => p.id === passageId);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--edge)] pb-2.5">
        <div>
          <h3 className="font-serif text-base font-semibold text-[var(--ink)] flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--gold)]" />
            Wacana / Teks Cerita (Stimulus Soal)
          </h3>
          <p className="text-xs text-[var(--soft-ink)]">
            Teks cerita atau artikel yang dibaca siswa sebelum menjawab soal. Dapat digunakan
            bersama oleh beberapa soal dalam satu paket.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "none" ? "default" : "outline"}
          disabled={disabled}
          onClick={() => {
            setMode("none");
            onChangePassage("");
            onChangePassageId(null);
          }}
        >
          Tanpa wacana
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "default" : "outline"}
          disabled={disabled}
          onClick={() => {
            setMode("new");
            onChangePassageId(null);
          }}
        >
          <FileText size={14} />
          Tulis wacana baru
        </Button>
        {availablePassages.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant={mode === "reuse" ? "default" : "outline"}
            disabled={disabled}
            onClick={() => {
              setMode("reuse");
              if (!passageId && availablePassages[0]) {
                onChangePassageId(availablePassages[0].id);
                onChangePassage("");
              }
            }}
          >
            <Link2 size={14} />
            Gunakan wacana dari soal lain ({availablePassages.length})
          </Button>
        )}
      </div>

      {/* Mode: Write new passage */}
      {mode === "new" && (
        <div className="space-y-2 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
            <label htmlFor="passage-input">
              Teks Wacana Baru (Maks {maxLength.toLocaleString("id-ID")} karakter)
            </label>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {passage.length} / {maxLength.toLocaleString("id-ID")} karakter
            </span>
          </div>
          <Textarea
            id="passage-input"
            name="passage"
            rows={5}
            maxLength={maxLength}
            disabled={disabled}
            value={passage}
            onChange={(e) => onChangePassage(e.target.value)}
            placeholder="Tuliskan wacana, teks bacaan, paragraf analisis, atau kutipan artikel di sini..."
          />
          <p className="text-[11px] text-[var(--soft-ink)]">
            Soal lain dalam paket ini nanti dapat memilih opsi "Gunakan wacana dari soal lain" untuk
            memakai teks ini tanpa perlu menyalin ulang. Formula dan tabel LaTeX dapat ditulis di
            sini.
          </p>
          {passage.trim() && (
            <div className="mt-3 rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-xs">
              <span className="font-mono text-[10px] text-[var(--gold)] uppercase block mb-1">
                Pratinjau Teks Wacana (LaTeX):
              </span>
              <div className="font-serif text-sm leading-relaxed text-[var(--ink)] max-h-48 overflow-y-auto whitespace-pre-line">
                <MathText>{passage}</MathText>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode: Reuse passage from another question */}
      {mode === "reuse" && (
        <div className="space-y-3 rounded-lg border border-[var(--gold)] bg-[var(--surface-elevated)] p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)] font-mono uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Pilih Wacana yang Sudah Ada di Paket Ini</span>
          </div>
          <Select
            value={passageId ?? availablePassages[0]?.id ?? ""}
            onValueChange={(selectedId) => {
              onChangePassageId(selectedId);
              onChangePassage("");
            }}
            disabled={disabled}
          >
            <SelectTrigger id="passage-select" aria-label="Wacana sumber">
              <SelectValue placeholder="Pilih wacana..." />
            </SelectTrigger>
            <SelectContent>
              {availablePassages.map((p, idx) => (
                <SelectItem key={p.id} value={p.id}>
                  Wacana #{idx + 1}: "{p.passage.slice(0, 50)}..." (dari: {p.prompt.slice(0, 30)}
                  ...)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedReusedPassage && (
            <div className="rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-xs">
              <span className="font-mono text-[10px] text-[var(--soft-ink)] uppercase block mb-1">
                Pratinjau Wacana Terhubung:
              </span>
              <div className="font-serif text-sm leading-relaxed text-[var(--ink)] max-h-36 overflow-y-auto whitespace-pre-line">
                <MathText>{selectedReusedPassage.passage}</MathText>
              </div>
            </div>
          )}
          <input type="hidden" name="passageId" value={passageId ?? ""} />
        </div>
      )}
    </div>
  );
}
