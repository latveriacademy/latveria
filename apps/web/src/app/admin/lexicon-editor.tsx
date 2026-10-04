import { useState } from "react";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import type { LexiconAnnotation } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { AppDialog } from "../../components/app-dialog";
import { AnnotatedText } from "../../components/annotated-text";
import { lookupLexicon } from "../../data/lexiconData";

export function LexiconEditor({
  prompt,
  annotations,
  onChange,
  disabled,
}: {
  prompt: string;
  annotations: LexiconAnnotation[];
  onChange: (entries: LexiconAnnotation[]) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState("");
  const [newTermInput, setNewTermInput] = useState("");
  const [activeEditing, setActiveEditing] = useState<LexiconAnnotation | null>(null);

  const startAddAnnotation = (termToAdd?: string) => {
    let term = (termToAdd ?? newTermInput).trim();
    let start = -1;
    let end = -1;

    const textarea = document.getElementById("prompt");
    if (
      textarea instanceof HTMLTextAreaElement &&
      textarea.selectionStart !== textarea.selectionEnd
    ) {
      const selected = prompt.slice(textarea.selectionStart, textarea.selectionEnd).trim();
      if (selected && (!term || selected.toLowerCase().includes(term.toLowerCase()))) {
        term = selected;
        start =
          textarea.selectionStart +
          prompt.slice(textarea.selectionStart, textarea.selectionEnd).indexOf(term);
        end = start + term.length;
      }
    }

    if (!term || term.length > 100) {
      setError("Ketik kata (maksimal 100 karakter) yang ada di dalam teks soal.");
      return;
    }

    if (start === -1) {
      const lowerPrompt = prompt.toLowerCase();
      const lowerTerm = term.toLowerCase();
      let searchPos = 0;
      while (searchPos < prompt.length) {
        const found = lowerPrompt.indexOf(lowerTerm, searchPos);
        if (found === -1) break;
        const candidateEnd = found + term.length;
        if (!annotations.some((a) => found < a.end && candidateEnd > a.start)) {
          start = found;
          end = candidateEnd;
          term = prompt.slice(start, end);
          break;
        }
        searchPos = found + 1;
      }
    }

    if (
      start === -1 ||
      end === -1 ||
      prompt.slice(start, end).toLowerCase() !== term.toLowerCase()
    ) {
      setError(`Kata "${term}" tidak ditemukan di teks soal atau bertabrakan dengan anotasi lain.`);
      return;
    }

    const preset = lookupLexicon(term);
    setActiveEditing({
      id: crypto.randomUUID(),
      term,
      start,
      end,
      definition: preset?.indonesianDefinition ?? "",
      partOfSpeech: preset?.partOfSpeech ?? "",
      phonetic: preset?.phonetic ?? "",
      context: preset?.academicContext ?? prompt,
      example: preset?.example ?? "",
      etymology: preset?.etymology ?? "",
      synonyms: preset?.synonyms ? [...preset.synonyms] : [],
    });
    setNewTermInput("");
    setError("");
  };

  const saveEditing = (entry: LexiconAnnotation) => {
    const exists = annotations.some((a) => a.id === entry.id);
    onChange(
      exists ? annotations.map((a) => (a.id === entry.id ? entry : a)) : [...annotations, entry],
    );
    setActiveEditing(null);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--edge)] pb-2.5">
        <div>
          <h3 className="font-serif text-base font-semibold text-[var(--ink)]">
            Kosakata Lexicon ({annotations.length}/20 kata)
          </h3>
          <p className="text-xs text-[var(--soft-ink)]">
            Tambahkan kata penting dari soal. Siswa dapat mengklik kata ini untuk melihat arti
            kontekstual.
          </p>
        </div>
      </div>

      {prompt.trim() && (
        <div className="rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-3">
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] block mb-1">
            Pratinjau Kata Dianotasi pada Soal (klik kata untuk mengedit)
          </span>
          <div className="font-serif text-sm leading-relaxed text-[var(--ink)]">
            <AnnotatedText annotations={annotations} onOpen={(item) => setActiveEditing(item)}>
              {prompt}
            </AnnotatedText>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          placeholder="Ketik kata dari soal (mis. sovereignty, fried)..."
          value={newTermInput}
          disabled={disabled || annotations.length >= 20}
          onChange={(e) => {
            setNewTermInput(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              startAddAnnotation();
            }
          }}
          className="flex-1 min-w-[220px]"
        />
        <Button
          type="button"
          variant="outline"
          disabled={
            disabled || annotations.length >= 20 || (!newTermInput.trim() && !prompt.trim())
          }
          onClick={() => startAddAnnotation()}
        >
          <Plus size={16} /> Tambah Kosakata
        </Button>
      </div>

      {error && (
        <p className="text-xs text-[var(--crimson)]" role="alert">
          {error}
        </p>
      )}

      {annotations.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--edge)] p-5 text-center text-xs text-[var(--soft-ink)]">
          <BookOpen className="mx-auto size-5 mb-1.5 opacity-60" />
          Belum ada kosakata. Ketik kata pada input di atas atau sorot teks di kolom Pertanyaan.
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {annotations.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-lg border border-[var(--edge)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent-gold)]"
            >
              <div>
                <div className="flex items-baseline justify-between gap-1.5 mb-1">
                  <span className="font-serif text-sm font-bold text-[var(--accent-gold)]">
                    {item.term}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-[var(--edge)] bg-[var(--bg-app)] text-[var(--accent-gold)]">
                    {item.partOfSpeech || "TERM"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-primary)] line-clamp-2">
                  {item.definition || "(Definisi belum diisi)"}
                </p>
                {item.context && (
                  <p className="text-[11px] text-[var(--soft-ink)] italic line-clamp-1 mt-0.5">
                    "{item.context}"
                  </p>
                )}
              </div>
              <div className="mt-2 flex items-center justify-end gap-1 border-t border-[var(--edge)] pt-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => setActiveEditing(item)}
                >
                  <Pencil size={12} /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => onChange(annotations.filter((a) => a.id !== item.id))}
                  aria-label={`Hapus ${item.term}`}
                >
                  <Trash2 size={12} className="text-[var(--crimson)]" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeEditing && (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setActiveEditing(null);
          }}
          title={`Detail Kosakata: "${activeEditing.term}"`}
          description="Sesuaikan arti, fonetik, dan konteks untuk siswa."
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            <div>
              <label className="font-semibold text-[var(--ink)] block mb-1">
                Arti sesuai konteks *
              </label>
              <Textarea
                value={activeEditing.definition}
                placeholder="Contoh: Kedaulatan; kekuasaan tertinggi..."
                maxLength={500}
                required
                rows={2}
                onChange={(e) => setActiveEditing({ ...activeEditing, definition: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-[var(--ink)] block mb-1">Kelas kata *</label>
                <Input
                  value={activeEditing.partOfSpeech}
                  placeholder="noun, verb, adjective"
                  maxLength={50}
                  required
                  onChange={(e) =>
                    setActiveEditing({ ...activeEditing, partOfSpeech: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-semibold text-[var(--ink)] block mb-1">
                  Fonetik (opsional)
                </label>
                <Input
                  value={activeEditing.phonetic ?? ""}
                  placeholder="/ˈsɒv.rɪn.ti/"
                  maxLength={100}
                  onChange={(e) => setActiveEditing({ ...activeEditing, phonetic: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-[var(--ink)] block mb-1">Kalimat asal *</label>
              <Textarea
                value={activeEditing.context}
                maxLength={1000}
                required
                rows={2}
                onChange={(e) => setActiveEditing({ ...activeEditing, context: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-[var(--ink)] block mb-1">
                Contoh penggunaan (opsional)
              </label>
              <Textarea
                value={activeEditing.example ?? ""}
                placeholder="Contoh kalimat lain..."
                maxLength={500}
                rows={2}
                onChange={(e) => setActiveEditing({ ...activeEditing, example: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-[var(--ink)] block mb-1">
                Etimologi (opsional)
              </label>
              <Textarea
                value={activeEditing.etymology ?? ""}
                placeholder="Asal usul kata..."
                maxLength={500}
                rows={2}
                onChange={(e) => setActiveEditing({ ...activeEditing, etymology: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-[var(--ink)] block mb-1">
                Sinonim (opsional, koma)
              </label>
              <Input
                value={activeEditing.synonyms?.join(", ") ?? ""}
                placeholder="autonomy, supremacy"
                onChange={(e) =>
                  setActiveEditing({
                    ...activeEditing,
                    synonyms: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--edge)]">
              <Button type="button" variant="outline" onClick={() => setActiveEditing(null)}>
                Batal
              </Button>
              <Button
                type="button"
                disabled={!activeEditing.definition.trim() || !activeEditing.partOfSpeech.trim()}
                onClick={() => saveEditing(activeEditing)}
              >
                Simpan Kosakata
              </Button>
            </div>
          </div>
        </AppDialog>
      )}
    </div>
  );
}
