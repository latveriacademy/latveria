import React, { useState } from "react";
import { CheckCheck, Pencil, Shield, Trash2, X } from "lucide-react";
import type { ChatMessage } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatFullTimestamp } from "./chat-date";

export interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  formatTime: (iso: string) => string;
  onInspectUser?: (userId: string) => void;
  onEditMessage?: (id: string, newText: string) => Promise<void> | void;
  onDeleteMessage?: (id: string) => Promise<void> | void;
  onPreviewImage: (url: string) => void;
  showReadStatus?: boolean;
}

export function ChatBubble({
  message: msg,
  isMe,
  formatTime,
  onInspectUser,
  onEditMessage,
  onDeleteMessage,
  onPreviewImage,
  showReadStatus,
}: ChatBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.message);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleStartEdit = () => {
    setEditText(msg.message);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.message) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onEditMessage?.(msg.id, trimmed);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteMessage?.(msg.id);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`group flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`chat-bubble-${msg.id}`}
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
          <img src={msg.senderImage} alt={msg.senderName} className="size-full object-cover" />
        ) : (
          msg.senderName.slice(0, 2).toUpperCase()
        )}
      </button>

      {/* Bubble Container */}
      <div
        className={`max-w-[82%] sm:max-w-[68%] rounded-2xl px-3.5 py-2 text-xs shadow-xs transition-colors ${
          isMe
            ? "bg-[var(--gold)]/15 border border-[var(--gold)]/35 text-[var(--ink)] rounded-tr-none"
            : "bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink)] rounded-tl-none"
        }`}
      >
        {/* Header (Sender name, admin badge, timestamp, actions) */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <button
            type="button"
            disabled={isMe || !onInspectUser}
            onClick={() => onInspectUser?.(msg.senderId)}
            className={`font-serif font-bold text-xs truncate max-w-[140px] sm:max-w-[180px] text-left ${
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

          {msg.isEdited && !msg.isDeleted && (
            <span className="text-[9px] text-[var(--ink-muted)] italic font-mono">(diedit)</span>
          )}

          {/* Time & Read Status */}
          <div
            className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)] ml-auto shrink-0 font-mono cursor-default"
            title={formatFullTimestamp(msg.createdAt)}
          >
            <span>{formatTime(msg.createdAt)}</span>
            {showReadStatus && isMe && (
              <CheckCheck className={`size-3 ${msg.readAt ? "text-sage" : "opacity-50"}`} />
            )}
          </div>

          {/* Edit / Delete actions for own active messages */}
          {isMe && !msg.isDeleted && !isEditing && (
            <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              {confirmDelete ? (
                <div className="flex items-center gap-1 text-[10px] text-red-500 font-mono ml-1">
                  <span>Hapus?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="hover:underline font-bold cursor-pointer"
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="hover:underline text-[var(--ink-muted)] cursor-pointer ml-0.5"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    title="Edit pesan"
                    className="p-1 hover:text-[var(--gold)] text-[var(--ink-muted)] cursor-pointer rounded"
                  >
                    <Pencil className="size-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    title="Hapus pesan"
                    className="p-1 hover:text-red-500 text-[var(--ink-muted)] cursor-pointer rounded"
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bubble Content */}
        {msg.isDeleted ? (
          <p className="leading-relaxed italic text-[var(--ink-muted)] flex items-center gap-1.5 py-0.5 text-[11px]">
            <Trash2 className="size-3 opacity-60 shrink-0" />
            <span>Pesan ini telah dihapus</span>
          </p>
        ) : isEditing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-xs h-7 bg-[var(--surface)] border-[var(--edge)] focus:border-[var(--gold)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSaveEdit();
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                }
              }}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <X className="size-2.5 mr-1" /> Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-6 px-2 text-[10px] bg-[var(--gold)] text-black font-semibold hover:bg-[var(--gold)]/90"
                onClick={() => void handleSaveEdit()}
                disabled={isSaving || !editText.trim()}
              >
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {msg.mediaUrl && (
              <div className="mb-1.5 rounded-lg overflow-hidden border border-[var(--edge)] max-w-xs bg-black/10">
                <img
                  src={msg.mediaUrl}
                  alt="Lampiran pesan"
                  className="max-h-56 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onPreviewImage(msg.mediaUrl!)}
                />
              </div>
            )}
            {msg.message && (
              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
