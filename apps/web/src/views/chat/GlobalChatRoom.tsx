import React from "react";
import { Globe, Loader2, Send, Shield, Sparkles } from "lucide-react";
import type { ChatMessage } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Panel } from "../../components/ui/dashboard";

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
  onInspectUser?: (userId: string) => void;
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
  onInspectUser,
}: GlobalChatRoomProps) {
  return (
    <Panel className="p-0 overflow-hidden flex flex-col h-[70vh] min-h-[500px] border-[var(--edge)] bg-[var(--surface-elevated)]">
      {/* Room Header Strip */}
      <div className="px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--edge)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-serif font-bold text-sm text-[var(--ink)]">
            Saluran Publik Siswa
          </span>
          <span className="hidden sm:inline text-[var(--ink-muted)] text-[11px]">
            • Forum diskusi umum & strategi UTBK
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--gold)] flex items-center gap-1.5">
          <Sparkles className="size-3 text-[var(--gold)]" />
          Live
        </span>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2.5 text-xs text-[var(--ink-muted)]">
            <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
            <span className="font-mono">Menghubungkan ke saluran obrolan…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2.5 text-center p-6 text-[var(--ink-muted)]">
            <Globe className="size-12 text-[var(--gold)] opacity-30" />
            <p className="font-serif font-bold text-sm text-[var(--ink)]">Belum ada percakapan</p>
            <p className="text-xs max-w-sm">
              Sapa kawan pejuang lainnya dan diskusikan soal atau tips persiapan UTBK hari ini!
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
                <button
                  type="button"
                  disabled={isMe || !onInspectUser}
                  onClick={() => onInspectUser?.(msg.senderId)}
                  title={isMe ? "Kamu" : `Lihat profil ${msg.senderName}`}
                  className={`size-8 rounded-full overflow-hidden bg-[var(--surface-subtle)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-serif font-bold text-[var(--gold)] ring-1 ring-[var(--gold)]/20 ${
                    !isMe ? "cursor-pointer hover:ring-[var(--gold)] transition-all" : ""
                  }`}
                >
                  {msg.senderImage ? (
                    <img
                      src={msg.senderImage}
                      alt={msg.senderName}
                      className="size-full object-cover"
                    />
                  ) : (
                    msg.senderName.slice(0, 2).toUpperCase()
                  )}
                </button>

                {/* Message Bubble */}
                <div
                  className={`max-w-[82%] sm:max-w-[65%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs transition-colors ${
                    isMe
                      ? "bg-[var(--gold)]/15 border border-[var(--gold)]/35 text-[var(--ink)] rounded-tr-none"
                      : "bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink)] rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <button
                      type="button"
                      disabled={isMe || !onInspectUser}
                      onClick={() => onInspectUser?.(msg.senderId)}
                      className={`font-serif font-bold text-xs truncate max-w-[140px] sm:max-w-[200px] text-left ${
                        !isMe
                          ? "hover:text-[var(--gold)] hover:underline cursor-pointer"
                          : "text-[var(--gold)]"
                      }`}
                    >
                      {isMe ? "Kamu" : msg.senderName}
                    </button>
                    {msg.senderRole === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 font-mono font-medium flex items-center gap-0.5">
                        <Shield className="size-2.5" /> ADMIN
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--ink-muted)] ml-auto shrink-0 font-mono">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Section */}
      <form
        onSubmit={onSend}
        className="p-3 bg-[var(--surface-subtle)] border-t border-[var(--edge)] flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Tulis pesan ke saluran publik… (Tekan Enter untuk kirim)"
          disabled={sending}
          className="text-xs bg-[var(--surface)] border-[var(--edge)] focus:border-[var(--gold)]"
        />
        <Button
          type="submit"
          disabled={sending || !input.trim()}
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
    </Panel>
  );
}
