import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Eye,
  GraduationCap,
  Loader2,
  MessageSquare,
  Send,
  Swords,
  UserPlus,
} from "lucide-react";
import type { ChatConversationSummary, ChatMessage, FriendUserDto } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { SearchBar } from "../../components/ui/search-bar";
import { AppDialog } from "../../components/app-dialog";

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
  onInspectUser?: (userId: string) => void;
  onBattleInvite?: () => void;
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
  onInspectUser,
  onBattleInvite,
}: DirectMessageRoomProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredFriendsList = friendsList.filter((f) => {
    const q = friendSearchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.codename && f.codename.toLowerCase().includes(q)) ||
      (f.targetUniversity && f.targetUniversity.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[72vh] min-h-[500px]">
      {/* Kolom Kiri: Percakapan */}
      <div
        className={`md:col-span-4 lg:col-span-4 border-r border-[var(--edge)] flex flex-col h-full bg-[var(--surface-subtle)] ${
          selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-3 border-b border-[var(--edge)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-[var(--ink)]">
              Percakapan Pribadi
            </span>
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

          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Cari obrolan…"
            sizeVariant="sm"
          />
        </div>

        {/* List Percakapan */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--edge)]/40">
          {loadingConversations ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
              <span className="font-mono">Memuat percakapan…</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 text-center p-4 text-xs text-[var(--ink-muted)] space-y-2">
              <MessageSquare className="size-8 mx-auto text-[var(--gold)] opacity-30" />
              <p className="font-serif font-bold text-xs text-[var(--ink)]">
                Belum ada percakapan aktif
              </p>
              <p className="text-[11px]">Mulai obrolan baru dengan teman belajarmu di Latveria.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-[var(--gold)] hover:border-[var(--gold)] mt-1"
                onClick={() => {
                  setShowNewChatDialog(true);
                  onOpenFriends();
                }}
              >
                Mulai Chat Baru &rarr;
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
                  className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? "bg-[var(--gold)]/10 border-l-2 border-[var(--gold)]"
                      : "hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  <div className="size-9 rounded-full overflow-hidden bg-[var(--surface-subtle)] border border-[var(--edge)] shrink-0 flex items-center justify-center font-serif font-bold text-xs text-[var(--gold)] ring-1 ring-[var(--gold)]/20">
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
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-serif font-bold text-xs text-[var(--ink)] truncate">
                        {contact.name}
                      </span>
                      {contact.lastMessageAt && (
                        <span className="text-[10px] text-[var(--ink-muted)] font-mono shrink-0">
                          {formatTime(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)] truncate">
                      {contact.lastMessage || "Mulai percakapan…"}
                    </p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="size-4.5 rounded-full bg-[var(--gold)] text-black font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {contact.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Kolom Kanan: Jendela Obrolan */}
      <div
        className={`md:col-span-8 lg:col-span-8 flex flex-col h-full bg-[var(--surface)] ${
          selectedContact ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedContact ? (
          <>
            {/* Header Percakapan */}
            <div className="px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--edge)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-8 -ml-1 text-[var(--ink-muted)] hover:text-[var(--ink)] shrink-0"
                  onClick={() => onSelectContact(null)}
                >
                  <ArrowLeft className="size-4" />
                </Button>

                <div
                  className="size-8 rounded-full overflow-hidden bg-[var(--surface-elevated)] border border-[var(--edge)] shrink-0 flex items-center justify-center font-serif font-bold text-xs text-[var(--gold)] ring-1 ring-[var(--gold)]/20 cursor-pointer"
                  onClick={() => onInspectUser?.(selectedContact.userId)}
                  title="Lihat profil"
                >
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      onClick={() => onInspectUser?.(selectedContact.userId)}
                      className="font-serif font-bold text-xs sm:text-sm text-[var(--ink)] truncate cursor-pointer hover:underline"
                    >
                      {selectedContact.name}
                    </span>
                    {selectedContact.codename && (
                      <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                        @{selectedContact.codename}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onInspectUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    onClick={() => onInspectUser(selectedContact.userId)}
                  >
                    <Eye size={12} className="mr-1" />
                    <span className="hidden sm:inline">Profil</span>
                  </Button>
                )}
                {onBattleInvite && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 text-[var(--gold)] hover:border-[var(--gold)]"
                    onClick={onBattleInvite}
                  >
                    <Swords size={12} className="mr-1" />
                    <span>Duel</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Area Pesan */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain"
            >
              {loadingDm ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                  <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
                  <span className="font-mono">Memuat pesan…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6 text-[var(--ink-muted)]">
                  <MessageSquare className="size-10 text-[var(--gold)] opacity-30" />
                  <p className="font-serif font-bold text-sm text-[var(--ink)]">
                    Percakapan baru dengan {selectedContact.name}
                  </p>
                  <p className="text-xs max-w-xs">
                    Kirim pesan pertama untuk berdiskusi soal, latihan bersama, atau berbagi
                    strategi UTBK.
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
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                          isMe
                            ? "bg-[var(--gold)]/15 border border-[var(--gold)]/35 text-[var(--ink)] rounded-tr-none"
                            : "bg-[var(--surface-subtle)] border border-[var(--edge)] text-[var(--ink)] rounded-tl-none"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-[10px] font-mono ${
                            isMe ? "justify-end text-[var(--gold)]/80" : "text-[var(--ink-muted)]"
                          }`}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (
                            <CheckCheck
                              className={`size-3 ${msg.readAt ? "text-sage" : "opacity-50"}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Pesan */}
            <form
              onSubmit={onSend}
              className="p-3 bg-[var(--surface-subtle)] border-t border-[var(--edge)] flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={`Tulis pesan ke ${selectedContact.name}…`}
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
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-[var(--ink-muted)]">
            <MessageSquare className="size-12 text-[var(--gold)] opacity-30" />
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-sm text-[var(--ink)]">
                Pilih atau Mulai Obrolan
              </h3>
              <p className="text-xs max-w-sm">
                Pilih teman dari daftar sebelah kiri atau mulai obrolan baru untuk mengirim pesan
                pribadi.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-[var(--gold)] hover:border-[var(--gold)]"
              onClick={() => {
                setShowNewChatDialog(true);
                onOpenFriends();
              }}
            >
              <UserPlus className="size-3.5 mr-1.5" />
              <span>Chat dengan Teman</span>
            </Button>
          </div>
        )}
      </div>

      {/* Modal Dialog: Mulai Chat Baru dengan Teman menggunakan AppDialog Reusable */}
      <AppDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        title="Mulai Chat Baru"
        description="Pilih rekan belajar terhubung untuk memulai obrolan langsung."
        className="max-w-md w-full"
      >
        <div className="space-y-3 pt-2">
          {friendsList.length > 3 && (
            <SearchBar
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              onClear={() => setFriendSearchQuery("")}
              placeholder="Cari teman…"
              sizeVariant="sm"
            />
          )}

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 overscroll-contain">
            {loadingFriends ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
                <span className="font-mono">Memuat daftar teman…</span>
              </div>
            ) : filteredFriendsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--ink-muted)] space-y-2">
                <p className="font-serif font-bold text-sm text-[var(--ink)]">
                  {friendSearchQuery ? "Tidak ditemukan" : "Belum ada teman terhubung"}
                </p>
                <p className="text-[11px] max-w-xs mx-auto">
                  {friendSearchQuery
                    ? `Tidak ada teman dengan nama "${friendSearchQuery}".`
                    : "Tambahkan teman terlebih dahulu melalui Hub Koneksi untuk memulai obrolan."}
                </p>
              </div>
            ) : (
              filteredFriendsList.map((friend) => (
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
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--edge)] flex items-center gap-3 transition-colors group cursor-pointer"
                >
                  <div className="size-8 rounded-full overflow-hidden bg-[var(--surface-subtle)] border border-[var(--edge)] shrink-0 flex items-center justify-center font-serif font-bold text-xs text-[var(--gold)] ring-1 ring-[var(--gold)]/20">
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
                    <span className="text-xs font-serif font-bold text-[var(--ink)] block truncate group-hover:text-[var(--gold)]">
                      {friend.name}
                    </span>
                    {friend.targetUniversity ? (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--gold)] truncate">
                        <GraduationCap size={11} className="shrink-0" />
                        <span className="truncate">{friend.targetUniversity}</span>
                      </div>
                    ) : friend.codename ? (
                      <span className="text-[10px] text-[var(--ink-muted)] block truncate font-mono">
                        @{friend.codename}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-[var(--gold)] shrink-0 font-mono font-medium">
                    Chat &rarr;
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
