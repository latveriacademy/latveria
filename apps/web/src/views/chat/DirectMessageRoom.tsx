import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageSquare,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import type { ChatConversationSummary, ChatMessage, FriendUserDto } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface DirectMessageRoomProps {
  currentUserId: string;
  conversations: ChatConversationSummary[];
  selectedContact: ChatConversationSummary | null;
  onSelectContact: (contact: ChatConversationSummary | null) => void;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingDm: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: (e?: React.FormEvent) => void;
  sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (iso: string) => string;
  friendsList: FriendUserDto[];
  loadingFriends: boolean;
  onOpenFriends: () => void;
}

export function DirectMessageRoom({
  currentUserId,
  conversations,
  selectedContact,
  onSelectContact,
  messages,
  loadingConversations,
  loadingDm,
  input,
  onInputChange,
  onSend,
  sending,
  scrollRef,
  formatTime,
  friendsList,
  loadingFriends,
  onOpenFriends,
}: DirectMessageRoomProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="rounded-xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[70vh] min-h-[480px]">
      {/* Kolom Kiri: Daftar Kontak / Percakapan */}
      <div
        className={`md:col-span-4 lg:col-span-4 border-r border-[var(--edge)] flex flex-col h-full bg-[var(--surface-subtle)] ${
          selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-3 border-b border-[var(--edge)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--ink)]">Percakapan Pribadi</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-[var(--gold)] hover:border-[var(--gold)]"
              onClick={() => {
                setShowNewChatDialog(true);
                onOpenFriends();
              }}
            >
              <UserPlus className="size-3" />
              <span>Chat Baru</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obrolan…"
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md bg-[var(--surface)] border border-[var(--edge)] text-[var(--ink)] focus:outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>

        {/* List Percakapan */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--edge-subtle)]">
          {loadingConversations ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
              <span>Memuat obrolan…</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-[var(--ink-muted)] space-y-2">
              <p>Belum ada obrolan pribadi.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-[var(--gold)] hover:underline"
                onClick={() => {
                  setShowNewChatDialog(true);
                  onOpenFriends();
                }}
              >
                Mulai obrolan dengan teman &rarr;
              </Button>
            </div>
          ) : (
            filteredConversations.map((contact) => {
              const isSelected = selectedContact?.userId === contact.userId;
              return (
                <button
                  key={contact.userId}
                  type="button"
                  onClick={() => onSelectContact(contact)}
                  className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? "bg-[var(--surface-elevated)] border-l-2 border-[var(--gold)]"
                      : "hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <div className="size-9 rounded-full overflow-hidden bg-[var(--surface-elevated)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-semibold text-[var(--gold)]">
                    {contact.image ? (
                      <img
                        src={contact.image}
                        alt={contact.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      contact.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[var(--ink)] truncate">
                        {contact.name}
                      </span>
                      {contact.lastMessageAt && (
                        <span className="text-[10px] text-[var(--ink-muted)] font-mono shrink-0">
                          {formatTime(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] text-[var(--ink-muted)] truncate">
                        {contact.lastMessage || "Mulai percakapan…"}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="size-4.5 rounded-full bg-[var(--gold)] text-[var(--bg-card)] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Kolom Kanan: Obrolan DM */}
      <div
        className={`md:col-span-8 lg:col-span-8 flex flex-col h-full bg-[var(--surface)] ${
          !selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedContact ? (
          <>
            {/* Header Percakapan */}
            <div className="p-3 bg-[var(--surface-elevated)] border-b border-[var(--edge)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  className="md:hidden p-1.5 -ml-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded"
                  onClick={() => onSelectContact(null)}
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="size-8 rounded-full overflow-hidden bg-[var(--surface-subtle)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-semibold text-[var(--gold)]">
                  {selectedContact.image ? (
                    <img
                      src={selectedContact.image}
                      alt={selectedContact.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    selectedContact.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[var(--ink)] truncate">
                      {selectedContact.name}
                    </span>
                    {selectedContact.role === "admin" && (
                      <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-500 font-mono">
                        ADMIN
                      </span>
                    )}
                  </div>
                  {selectedContact.codename && (
                    <p className="text-[10px] text-[var(--ink-muted)] truncate font-mono">
                      @{selectedContact.codename}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pesan DM */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain"
            >
              {loadingDm ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                  <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
                  <span>Memuat obrolan…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--ink-muted)] space-y-1">
                  <MessageSquare className="size-8 text-[var(--edge)]" />
                  <p className="text-xs font-medium text-[var(--ink)]">
                    Belum ada pesan dengan {selectedContact.name}
                  </p>
                  <p className="text-[11px]">
                    Sampaikan salam atau diskusikan soal latihan bersama!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                          isMe
                            ? "bg-[var(--gold)]/15 border border-[var(--gold)]/35 text-[var(--ink)] rounded-br-none"
                            : "bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink)] rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-[12.5px]">
                          {msg.message}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-[var(--ink-muted)] font-mono">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (
                            <span title={msg.readAt ? "Dibaca" : "Terkirim"}>
                              <CheckCheck
                                className={`size-3 ${
                                  msg.readAt ? "text-emerald-500" : "text-[var(--ink-muted)]"
                                }`}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Input DM */}
            <form
              onSubmit={onSend}
              className="p-3 bg-[var(--surface-elevated)] border-t border-[var(--edge)] flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={`Tulis pesan ke ${selectedContact.name}…`}
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
                {sending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                <span className="hidden sm:inline text-xs">Kirim</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--ink-muted)] space-y-3">
            <div className="size-12 rounded-full bg-[var(--surface-subtle)] border border-[var(--edge)] flex items-center justify-center text-[var(--gold)]">
              <MessageSquare className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">Pilih Percakapan</h3>
              <p className="text-xs text-[var(--ink-muted)] max-w-xs mt-1">
                Pilih teman dari daftar sebelah kiri atau mulai obrolan baru untuk mengirim pesan
                pribadi.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => {
                setShowNewChatDialog(true);
                onOpenFriends();
              }}
            >
              <UserPlus className="size-3.5" />
              <span>Cari Teman</span>
            </Button>
          </div>
        )}
      </div>

      {/* Modal Dialog: Mulai Chat Baru dengan Teman */}
      {showNewChatDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-elevated)] border border-[var(--edge)] rounded-xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--edge-subtle)]">
              <span className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                <UserPlus className="size-4 text-[var(--gold)]" />
                Mulai Chat Baru
              </span>
              <button
                type="button"
                onClick={() => setShowNewChatDialog(false)}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 overscroll-contain">
              {loadingFriends ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                  <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
                  <span>Memuat teman…</span>
                </div>
              ) : friendsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--ink-muted)] space-y-1">
                  <p>Belum ada teman terhubung.</p>
                  <p className="text-[11px]">
                    Tambahkan teman terlebih dahulu melalui menu Warrior Battle.
                  </p>
                </div>
              ) : (
                friendsList.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => {
                      const summary: ChatConversationSummary = {
                        userId: friend.id,
                        name: friend.name,
                        image: friend.image ?? null,
                        role: "user",
                        codename: friend.codename,
                        lastMessage: "",
                        lastMessageAt: "",
                        unreadCount: 0,
                      };
                      onSelectContact(summary);
                      setShowNewChatDialog(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--edge)] flex items-center gap-2.5 transition-all"
                  >
                    <div className="size-7 rounded-full overflow-hidden bg-[var(--surface)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-semibold text-[var(--gold)]">
                      {friend.image ? (
                        <img
                          src={friend.image}
                          alt={friend.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        friend.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-[var(--ink)] block truncate">
                        {friend.name}
                      </span>
                      {friend.codename && (
                        <span className="text-[10px] text-[var(--ink-muted)] block truncate font-mono">
                          @{friend.codename}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--gold)] shrink-0 font-medium">
                      Chat &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
