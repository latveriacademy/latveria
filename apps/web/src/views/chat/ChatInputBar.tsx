import React, { useRef } from "react";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export interface ChatInputBarProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: (e?: React.FormEvent) => void;
  sending: boolean;
  placeholder?: string;
  mediaUrl?: string | null;
  onMediaChange?: (url: string | null) => void;
  uploadingMedia?: boolean;
  onUploadMedia?: (file: File) => Promise<void> | void;
}

export function ChatInputBar({
  input,
  onInputChange,
  onSend,
  sending,
  placeholder = "Tulis pesan…",
  mediaUrl,
  onMediaChange,
  uploadingMedia = false,
  onUploadMedia,
}: ChatInputBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadMedia) {
      await onUploadMedia(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canSend = !sending && !uploadingMedia && (input.trim().length > 0 || !!mediaUrl);

  return (
    <div className="shrink-0 bg-[var(--surface-subtle)] border-t border-[var(--edge)]">
      {/* Attached Media Preview */}
      {mediaUrl && (
        <div className="px-3 py-2 bg-[var(--surface)] border-b border-[var(--edge)] flex items-center gap-2">
          <div className="relative size-12 rounded-lg border border-[var(--edge)] overflow-hidden shrink-0 bg-black/10">
            <img src={mediaUrl} alt="Preview" className="size-full object-cover" />
          </div>
          <span className="text-xs text-[var(--ink-muted)] truncate flex-1 font-mono">
            Gambar terlampir
          </span>
          <button
            type="button"
            onClick={() => onMediaChange?.(null)}
            className="p-1 text-[var(--ink-muted)] hover:text-red-500 rounded cursor-pointer transition-colors"
            title="Hapus lampiran"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={onSend} className="p-2.5 sm:p-3 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sending || uploadingMedia}
          onClick={() => fileInputRef.current?.click()}
          title="Lampirkan gambar (JPG, PNG, WebP, GIF maks 5 MB)"
          className="h-9 px-2 text-[var(--ink-muted)] hover:text-[var(--gold)] shrink-0"
        >
          {uploadingMedia ? (
            <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </Button>

        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={sending}
          className="text-xs bg-[var(--surface)] border-[var(--edge)] focus:border-[var(--gold)] flex-1"
        />

        <Button
          type="submit"
          disabled={!canSend}
          size="sm"
          className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium px-4 h-9 shrink-0"
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <Send className="size-3.5 mr-1.5" />
              <span>Kirim</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
