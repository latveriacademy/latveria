import { useState, type KeyboardEvent } from "react";
import { X, Tag as TagIcon } from "lucide-react";

interface LibraryTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function LibraryTagInput({
  tags,
  onChange,
  placeholder = "Ketik topik lalu tekan Enter atau koma...",
  maxTags = 10,
}: LibraryTagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (text: string) => {
    const cleaned = text
      .trim()
      .toLowerCase()
      .replace(/^[#,]+/, "");
    if (!cleaned) return;
    if (tags.length >= maxTags) return;
    if (!tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] min-h-[42px] focus-within:border-[var(--gold)] transition-colors">
        <TagIcon className="w-4 h-4 text-[var(--ink-muted)] ml-1 shrink-0" />
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--surface-muted)] text-[var(--gold)] border border-[var(--gold)]/30 group animate-in fade-in duration-150"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="text-[var(--ink-muted)] hover:text-red-400 p-0.5 rounded focus:outline-none"
              aria-label={`Hapus tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) addTag(inputValue);
            }}
            placeholder={tags.length === 0 ? placeholder : "Tambah tag..."}
            className="flex-1 min-w-[140px] bg-transparent border-none text-xs text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none py-1 px-1.5"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] px-1">
        <span>Gunakan tag untuk memudahkan pencarian materi UTBK oleh peserta.</span>
        <span>
          {tags.length}/{maxTags} tag
        </span>
      </div>
    </div>
  );
}
