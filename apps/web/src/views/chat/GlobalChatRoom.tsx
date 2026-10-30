import React from "react";
import { Globe, Loader2, Send, Shield, Sparkles } from "lucide-react";
import type { ChatMessage } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface GlobalChatRoomProps {
  currentUserId: string;
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: (e?: React.FormEvent) => void;
  sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (iso: string) => string;
}

export function GlobalChatRoom({
  currentUserId,
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  sending,
  scrollRef,
  formatTime,
}: GlobalChatRoomProps) {
  return (
    <div className="rounded-xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm overflow-hidden flex flex-col h-[70vh] min-h-[480px]">
      {/* Room Banner */}
      <div className="px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--edge-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-[var(--ink)]">Saluran Komunitas Publik</span>
          <span className="hidden sm:inline text-[var(--ink-muted)]">
            • Semua siswa Latveria dapat berdiskusi di sini
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--gold)] flex items-center gap-1">
          <Sparkles className="size-3" /> Realtime
        </span>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
            <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
            <span>Memuat riwayat obrolan…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6 text-[var(--ink-muted)]">
            <Globe className="size-10 text-[var(--edge)]" />
            <p className="text-sm font-medium text-[var(--ink)]">Belum ada obrolan.</p>
            <p className="text-xs max-w-sm">
              Jadilah yang pertama menyapa kawan pejuang lainnya di ruang obrolan Latveria!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="size-8 rounded-full overflow-hidden bg-[var(--surface-elevated)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-semibold text-[var(--gold)]">
                  {msg.senderImage ? (
                    <img
                      src={msg.senderImage}
                      alt={msg.senderName}
                      className="size-full object-cover"
                    />
                  ) : (
                    msg.senderName.slice(0, 2).toUpperCase()
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    isMe
                      ? "bg-[var(--gold)]/15 border border-[var(--gold)]/35 text-[var(--ink)] rounded-tr-none"
                      : "bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink)] rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                      {isMe ? "Kamu" : msg.senderName}
                    </span>
                    {msg.senderRole === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 font-mono font-medium flex items-center gap-0.5">
                        <Shield className="size-2.5" /> ADMIN
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--ink-muted)] ml-auto shrink-0 font-mono">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words leading-relaxed text-[12.5px]">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={onSend}
        className="p-3 bg-[var(--surface-elevated)] border-t border-[var(--edge)] flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Tulis pesan ke semua siswa… (Tekan Enter untuk kirim)"
          maxLength={1000}
          disabled={sending}
          className="flex-1 text-xs"
        />
        <Button
          type="submit"
          disabled={!input.trim() || sending}
          size="sm"
          className="shrink-0 h-9 px-3 gap-1.5"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          <span className="hidden sm:inline text-xs">Kirim</span>
        </Button>
      </form>
    </div>
  );
}
