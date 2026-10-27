import { useState, useRef, type KeyboardEvent } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  HelpCircle,
  X,
  Eye,
  Edit3,
} from "lucide-react";
import { Textarea } from "../../../components/ui/textarea";
import { MathText } from "../../../components/math/math-text";

interface LibraryMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  minHeight?: string;
}

export function LibraryMarkdownEditor({
  value,
  onChange,
  minHeight = "min-h-[420px]",
}: LibraryMarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [showKatexHelp, setShowKatexHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (before: string, after: string = "", placeholderText = "teks") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || placeholderText;
    const replacement = `${before}${selected}${after}`;
    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 40);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        insertFormatting("**", "**", "teks tebal");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        insertFormatting("*", "*", "teks miring");
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        insertFormatting("[", "](https://...)", "tautan");
      }
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] overflow-hidden shadow-sm space-y-0">
      {/* TOOLBAR ATAS MENEMPEL DENGAN TEXTAREA */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 border-b border-[var(--edge)] bg-[var(--surface-muted)]/60 text-xs">
        <div className="flex items-center gap-1">
          {/* Tab Tulis / Pratinjau */}
          <div className="flex rounded-md border border-[var(--edge)] bg-[var(--surface)] p-0.5 mr-2">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                tab === "write"
                  ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              title="Mode Tulis Editor"
            >
              <Edit3 className="w-3.5 h-3.5" /> Tulis
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                tab === "preview"
                  ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              title="Pratinjau Hasil Format & KaTeX"
            >
              <Eye className="w-3.5 h-3.5" /> Pratinjau
            </button>
          </div>

          {/* Formatting Buttons */}
          <button
            type="button"
            onClick={() => insertFormatting("## ", "", "Judul Bagian")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Heading 2 (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("### ", "", "Sub Bagian")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Heading 3 (H3)"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-[var(--edge)] mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting("**", "**", "teks tebal")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("*", "*", "teks miring")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-[var(--edge)] mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting("- ", "", "item daftar")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Daftar Poin"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("1. ", "", "langkah satu")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Daftar Bernomor"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("[", "](https://...)", "judul tautan")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Sisipkan Tautan (Ctrl+K)"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-[var(--edge)] mx-1" />

          {/* KaTeX Math Shortcuts */}
          <button
            type="button"
            onClick={() => insertFormatting("$", "$", "f(x) = ax + b")}
            className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--edge)] text-[var(--gold)] font-mono font-bold text-xs hover:border-[var(--gold)]"
            title="Rumus Matematika Inline ($x$)"
          >
            $x$
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("$$\n", "\n$$", "x = \\frac{-b \\pm \\sqrt{D}}{2a}")}
            className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--edge)] text-[var(--gold)] font-mono font-bold text-xs hover:border-[var(--gold)]"
            title="Rumus Matematika Blok Tengah ($$...$$)"
          >
            $$...$$
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("```\n", "\n```", "// kode")}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            title="Blok Kode"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        {/* Panduan KaTeX Popover Toggle */}
        <button
          type="button"
          onClick={() => setShowKatexHelp((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
            showKatexHelp
              ? "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/40"
              : "border-[var(--edge)] text-[var(--ink-muted)] hover:text-[var(--ink)] bg-[var(--surface)]"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span>Panduan Sintaks KaTeX</span>
        </button>
      </div>

      {/* PANEL PANDUAN KATEX COLLAPSIBLE */}
      {showKatexHelp && (
        <div className="p-4 bg-[var(--surface)] border-b border-[var(--edge)] space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[var(--gold)] uppercase tracking-wider">
              Panduan Sintaks Formula KaTeX / LaTeX
            </h4>
            <button
              type="button"
              onClick={() => setShowKatexHelp(false)}
              className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-1">
              <span className="font-semibold text-[var(--ink)] block">Pecahan & Akar</span>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \frac&#123;a&#125;&#123;b&#125;
              </code>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \sqrt&#123;x&#125;, \sqrt[3]&#123;x&#125;
              </code>
            </div>
            <div className="p-2.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-1">
              <span className="font-semibold text-[var(--ink)] block">Pangkat & Indeks</span>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                x^&#123;2&#125; + y^&#123;3&#125;
              </code>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                a_&#123;n-1&#125;, x_1
              </code>
            </div>
            <div className="p-2.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-1">
              <span className="font-semibold text-[var(--ink)] block">Simbol & Relasi</span>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \pm, \times, \div
              </code>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \le, \ge, \neq, \approx
              </code>
            </div>
            <div className="p-2.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-1">
              <span className="font-semibold text-[var(--ink)] block">Himpunan & Matriks</span>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \in, \cup, \cap, \subset
              </code>
              <code className="block font-mono text-[11px] text-[var(--gold)]">
                \begin&#123;pmatrix&#125;...
              </code>
            </div>
          </div>
        </div>
      )}

      {/* AREA UTAMA: TULIS ATAU PRATINJAU DALAM EDITOR */}
      {tab === "write" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis artikel materi menggunakan format Markdown dan sintaks KaTeX di sini..."
          className={`w-full border-0 rounded-none bg-transparent font-mono text-xs leading-relaxed focus:ring-0 focus:outline-none p-4 ${minHeight}`}
        />
      ) : (
        <div
          className={`p-5 prose prose-invert max-w-none text-xs leading-relaxed overflow-y-auto bg-[var(--surface)] ${minHeight}`}
        >
          {value.trim() ? (
            <MathText>{value}</MathText>
          ) : (
            <span className="italic text-[var(--ink-muted)]">
              Belum ada konten untuk ditampilkan.
            </span>
          )}
        </div>
      )}

      {/* FOOTER INFORMASI EDITOR */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--edge)] bg-[var(--surface-muted)]/40 text-[11px] text-[var(--ink-muted)]">
        <span>Gunakan $formula$ untuk rumus sejajar teks atau $$formula$$ untuk rumus blok.</span>
        <div className="flex items-center gap-3 font-mono">
          <span>{wordCount} kata</span>
          <span>•</span>
          <span>{charCount} karakter</span>
        </div>
      </div>
    </div>
  );
}
