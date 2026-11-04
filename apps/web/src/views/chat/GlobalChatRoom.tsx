import React, { useState } from "react";
import { Globe, Loader2, X } from "lucide-react";
import type { ChatMessage } from "@latveria/shared";
import { Panel } from "../../components/ui/dashboard";
import { formatChatDividerDate, isDifferentDay } from "./chat-date";
import { ChatBubble } from "./ChatBubble";
import { ChatInputBar } from "./ChatInputBar";

export interface GlobalChatRoomProps {
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
  onEditMessage?: (id: string, newText: string) => Promise<void> | void;
  onDeleteMessage?: (id: string) => Promise<void> | void;
  mediaUrl?: string | null;
  onMediaChange?: (url: string | null) => void;
  uploadingMedia?: boolean;
  onUploadMedia?: (file: File) => Promise<void> | void;
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
  onEditMessage,
  onDeleteMessage,
  mediaUrl,
  onMediaChange,
  uploadingMedia,
  onUploadMedia,
}: GlobalChatRoomProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <Panel className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden bg-[var(--surface)] border-[var(--edge)]">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
            const showDateDivider = isDifferentDay(msg.createdAt, prevMsg?.createdAt);
            const dateLabel = showDateDivider ? formatChatDividerDate(msg.createdAt) : null;

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && dateLabel && (
                  <div
                    data-testid="chat-date-divider"
                    className="flex items-center justify-center my-3"
                  >
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink-muted)] shadow-2xs">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <ChatBubble
                  message={msg}
                  isMe={isMe}
                  formatTime={formatTime}
                  onInspectUser={onInspectUser}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onPreviewImage={(url) => setPreviewImage(url)}
                />
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Input Section */}
      <ChatInputBar
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        sending={sending}
        placeholder="Tulis pesan ke saluran publik… (Tekan Enter untuk kirim)"
        mediaUrl={mediaUrl}
        onMediaChange={onMediaChange}
        uploadingMedia={uploadingMedia}
        onUploadMedia={onUploadMedia}
      />

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white cursor-pointer"
              title="Tutup"
            >
              <X className="size-6" />
            </button>
            <img
              src={previewImage}
              alt="Pratinjau Lampiran"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
