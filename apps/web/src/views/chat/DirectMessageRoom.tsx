import React, { useState } from "react";
import { ArrowLeft, Eye, Loader2, MessageSquare, Swords, UserPlus, X } from "lucide-react";
import type { ChatConversationSummary, ChatMessage, FriendUserDto } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { SearchBar } from "../../components/ui/search-bar";
import { formatChatDividerDate, isDifferentDay } from "./chat-date";
import { ChatBubble } from "./ChatBubble";
import { ChatInputBar } from "./ChatInputBar";
import { StartChatDialog } from "./StartChatDialog";

export interface DirectMessageRoomProps {
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
  onEditMessage?: (id: string, newText: string) => Promise<void> | void;
  onDeleteMessage?: (id: string) => Promise<void> | void;
  mediaUrl?: string | null;
  onMediaChange?: (url: string | null) => void;
  uploadingMedia?: boolean;
  onUploadMedia?: (file: File) => Promise<void> | void;
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
  onEditMessage,
  onDeleteMessage,
  mediaUrl,
  onMediaChange,
  uploadingMedia,
  onUploadMedia,
}: DirectMessageRoomProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.codename && c.codename.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleStartChatWithFriend = (friend: FriendUserDto) => {
    const existing = conversations.find((c) => c.userId === friend.id);
    if (existing) {
      onSelectContact(existing);
    } else {
      onSelectContact({
        userId: friend.id,
        name: friend.name,
        image: friend.image ?? null,
        role: "user",
        codename: friend.codename,
        lastMessage: "",
        lastMessageAt: "",
        unreadCount: 0,
      });
    }
    setShowFriendsModal(false);
  };

  return (
    <div className="flex-1 flex min-h-0 border border-[var(--edge)] rounded-xl overflow-hidden bg-[var(--surface)]">
      {/* Sidebar Kontak / Daftar Percakapan */}
      <div
        className={`w-full sm:w-80 md:w-88 border-r border-[var(--edge)] flex flex-col bg-[var(--surface-subtle)] shrink-0 ${
          selectedContact ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Header Kontak */}
        <div className="p-3 border-b border-[var(--edge)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-sm text-[var(--ink)]">Pesan Langsung</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--edge)] font-mono text-[var(--ink-muted)]">
              {conversations.length}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowFriendsModal(true);
              onOpenFriends();
            }}
            className="text-xs h-8 border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 text-[var(--gold)]"
          >
            <UserPlus className="size-3.5 mr-1" />
            <span>Pesan Baru</span>
          </Button>
        </div>

        {/* Pencarian Percakapan */}
        <div className="p-2 border-b border-[var(--edge)] bg-[var(--surface)] shrink-0">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari percakapan…"
            className="w-full text-xs"
          />
        </div>

        {/* List Percakapan */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--edge)]">
          {loadingConversations ? (
            <div className="p-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
              <span className="font-mono">Memuat percakapan…</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--ink-muted)] space-y-3">
              <p>{searchQuery ? "Tidak ada percakapan yang cocok." : "Belum ada obrolan aktif."}</p>
              {!searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFriendsModal(true);
                    onOpenFriends();
                  }}
                  className="text-xs border-[var(--gold)]/40 text-[var(--gold)]"
                >
                  <UserPlus className="size-3.5 mr-1.5" />
                  Pilih Teman untuk Obrolan
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((contact) => {
              const isSelected = selectedContact?.userId === contact.userId;
              return (
                <button
                  type="button"
                  key={contact.userId}
                  onClick={() => onSelectContact(contact)}
                  className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[var(--gold)]/15 border-l-2 border-l-[var(--gold)]"
                      : "hover:bg-[var(--surface)]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-10 rounded-full overflow-hidden bg-[var(--surface)] border border-[var(--edge)] flex items-center justify-center text-xs font-serif font-bold text-[var(--gold)]">
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
                    {contact.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 size-4 rounded-full bg-[var(--gold)] text-black text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                        {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-serif font-bold text-xs truncate text-[var(--ink)]">
                        {contact.name}
                      </span>
                      {contact.lastMessageAt && (
                        <span className="text-[10px] text-[var(--ink-muted)] shrink-0 font-mono">
                          {formatTime(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        contact.unreadCount > 0
                          ? "font-semibold text-[var(--ink)]"
                          : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {contact.lastMessage || "(Belum ada pesan)"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Area Obrolan DM */}
      <div
        className={`flex-1 flex flex-col min-h-0 bg-[var(--surface)] ${
          !selectedContact ? "hidden sm:flex" : "flex"
        }`}
      >
        {selectedContact ? (
          <>
            {/* Header Percakapan DM Terpilih */}
            <div className="p-3 border-b border-[var(--edge)] bg-[var(--surface-subtle)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectContact(null)}
                  className="sm:hidden p-1.5 h-8 w-8 text-[var(--ink-muted)]"
                  title="Kembali ke daftar percakapan"
                >
                  <ArrowLeft className="size-4" />
                </Button>

                {/* Avatar header */}
                <button
                  type="button"
                  disabled={!onInspectUser}
                  onClick={() => onInspectUser?.(selectedContact.userId)}
                  className="size-8 rounded-full overflow-hidden bg-[var(--surface)] border border-[var(--edge)] shrink-0 flex items-center justify-center text-xs font-serif font-bold text-[var(--gold)] hover:ring-2 hover:ring-[var(--gold)] transition-all cursor-pointer"
                  title={`Lihat profil ${selectedContact.name}`}
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
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!onInspectUser}
                      onClick={() => onInspectUser?.(selectedContact.userId)}
                      className="font-serif font-bold text-xs truncate text-[var(--ink)] hover:text-[var(--gold)] hover:underline cursor-pointer text-left"
                    >
                      {selectedContact.name}
                    </button>
                    {selectedContact.role === "admin" && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 font-mono font-medium">
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

              {/* Aksi Cepat Header */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onBattleInvite && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onBattleInvite}
                    title="Ajak Duel 1v1"
                    className="h-8 px-2.5 text-xs border-[var(--gold)]/30 hover:bg-[var(--gold)]/10 text-[var(--gold)]"
                  >
                    <Swords className="size-3.5 mr-1" />
                    <span className="hidden md:inline">Tantang 1v1</span>
                  </Button>
                )}
                {onInspectUser && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onInspectUser(selectedContact.userId)}
                    title="Lihat Dossier Siswa"
                    className="h-8 w-8 p-0 text-[var(--ink-muted)] hover:text-[var(--gold)]"
                  >
                    <Eye className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Riwayat Pesan DM */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 overscroll-contain"
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
                        showReadStatus
                      />
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Input Pesan DM */}
            <ChatInputBar
              input={input}
              onInputChange={onInputChange}
              onSend={onSend}
              sending={sending}
              placeholder={`Tulis pesan ke ${selectedContact.name}…`}
              mediaUrl={mediaUrl}
              onMediaChange={onMediaChange}
              uploadingMedia={uploadingMedia}
              onUploadMedia={onUploadMedia}
            />
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
              onClick={() => {
                setShowFriendsModal(true);
                onOpenFriends();
              }}
              className="text-xs border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 text-[var(--gold)] mt-2"
            >
              <UserPlus className="size-3.5 mr-1.5" />
              Kirim Pesan Baru
            </Button>
          </div>
        )}
      </div>

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

      {/* Dialog Pemilihan Teman untuk Obrolan Baru */}
      <StartChatDialog
        open={showFriendsModal}
        onOpenChange={setShowFriendsModal}
        loadingFriends={loadingFriends}
        friendsList={friendsList}
        onSelectFriend={handleStartChatWithFriend}
      />
    </div>
  );
}
