import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import type {
  ChatConversationSummary,
  ChatMessage,
  ChatWsClientMessage,
  FriendUserDto,
} from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { PublicProfileModal } from "../../components/social/PublicProfileModal";
import { GlobalChatRoom } from "./GlobalChatRoom";
import { DirectMessageRoom } from "./DirectMessageRoom";
import { formatMessageTime } from "./chat-date";
import { chatSearchParams } from "./chat-search-params";
import { ChatNavHeader } from "./ChatNavHeader";
import { deleteChatMessage, editChatMessage, sendChatMessageApi, uploadChatFile } from "./chat-api";
import { useChatSocket } from "./use-chat-socket";
import { useChatSwipe } from "./use-chat-swipe";

export function ChatView() {
  const { user, setCurrentTab } = useApp();
  const currentUserId = user.userId || user.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const dmParam = searchParams.get("dm");
  const [activeTab, setActiveTab] = useState<"global" | "dm">(dmParam ? "dm" : "global");

  // Global chat state
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [globalInput, setGlobalInput] = useState("");
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [sendingGlobal, setSendingGlobal] = useState(false);

  // DM state
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatConversationSummary | null>(null);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingDm, setLoadingDm] = useState(false);
  const [sendingDm, setSendingDm] = useState(false);

  // Daftar teman untuk chat baru
  const [friendsList, setFriendsList] = useState<FriendUserDto[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Lampiran media chat
  const [globalMediaUrl, setGlobalMediaUrl] = useState<string | null>(null);
  const [uploadingGlobalMedia, setUploadingGlobalMedia] = useState(false);
  const [dmMediaUrl, setDmMediaUrl] = useState<string | null>(null);
  const [uploadingDmMedia, setUploadingDmMedia] = useState(false);

  const globalScrollRef = useRef<HTMLDivElement>(null);
  const dmScrollRef = useRef<HTMLDivElement>(null);
  const selectedContactIdRef = useRef<string | null>(null);
  selectedContactIdRef.current = selectedContact?.userId ?? null;

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  };

  const loadGlobalMessages = useCallback(async () => {
    try {
      const data = await api<{ messages: ChatMessage[] }>("/learner/chat/global?limit=50");
      setGlobalMessages(data.messages);
      setTimeout(() => scrollToBottom(globalScrollRef), 50);
    } catch (err) {
      console.error("Gagal memuat pesan global:", err);
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await api<{ conversations: ChatConversationSummary[] }>(
        "/learner/chat/conversations",
      );
      setConversations(data.conversations);
    } catch (err) {
      console.error("Gagal memuat percakapan:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadDmMessages = useCallback(async (contactId: string, background = false) => {
    try {
      if (!background) setLoadingDm(true);
      const data = await api<{ messages: ChatMessage[] }>(
        `/learner/chat/dm/${encodeURIComponent(contactId)}?limit=50`,
      );
      if (selectedContactIdRef.current !== contactId) return;
      setDmMessages((prev) =>
        prev.length === data.messages.length &&
        prev.every((m, i) => m.id === data.messages[i].id && m.readAt === data.messages[i].readAt)
          ? prev
          : data.messages,
      );
      if (!background) setTimeout(() => scrollToBottom(dmScrollRef), 50);
      setConversations((prev) =>
        prev.map((c) => (c.userId === contactId && c.unreadCount ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (err) {
      console.error("Gagal memuat pesan DM:", err);
    } finally {
      if (!background && selectedContactIdRef.current === contactId) setLoadingDm(false);
    }
  }, []);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const res = await api<{ friends: FriendUserDto[] }>("/friends");
      setFriendsList(res.friends || []);
    } catch (err) {
      console.error("Gagal memuat daftar teman:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    void loadGlobalMessages();
    void loadConversations();
  }, [loadGlobalMessages, loadConversations]);

  useEffect(() => {
    if (!dmParam || selectedContactIdRef.current === dmParam) return;
    setActiveTab("dm");
    const existing = conversations.find((c) => c.userId === dmParam);
    if (existing) {
      setSelectedContact(existing);
      return;
    }
    let active = true;
    api<{ friends: FriendUserDto[] }>("/friends")
      .then((res) => {
        if (!active) return;
        const friend = res.friends.find((f) => f.id === dmParam);
        if (friend) {
          setSelectedContact({
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
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [dmParam, conversations]);

  useEffect(() => {
    if (selectedContact?.userId) {
      void loadDmMessages(selectedContact.userId);
    }
  }, [selectedContact?.userId, loadDmMessages]);

  const handleMessageReceived = useCallback(
    (msg: ChatMessage) => {
      if (msg.recipientId === null) {
        setGlobalMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setTimeout(() => scrollToBottom(globalScrollRef), 40);
      } else {
        if (
          msg.senderId === selectedContactIdRef.current ||
          msg.recipientId === selectedContactIdRef.current
        ) {
          setDmMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          setTimeout(() => scrollToBottom(dmScrollRef), 40);
        }

        setConversations((prev) => {
          const counterpartId = msg.senderId === currentUserId ? msg.recipientId! : msg.senderId;
          const idx = prev.findIndex((c) => c.userId === counterpartId);
          const isIncoming = msg.senderId !== currentUserId;

          if (idx >= 0) {
            const updated = [...prev];
            const item = updated[idx];
            updated.splice(idx, 1);
            updated.unshift({
              ...item,
              lastMessage: msg.message,
              lastMessageAt: msg.createdAt,
              unreadCount:
                isIncoming && selectedContactIdRef.current !== counterpartId
                  ? item.unreadCount + 1
                  : item.unreadCount,
            });
            return updated;
          } else {
            void loadConversations();
            return prev;
          }
        });
      }
    },
    [currentUserId, loadConversations],
  );

  const handleMessageUpdated = useCallback((msg: ChatMessage) => {
    setGlobalMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    setDmMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
  }, []);

  const handleMessageDeleted = useCallback((messageId: string) => {
    setGlobalMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, message: "Pesan ini telah dihapus", mediaUrl: null }
          : m,
      ),
    );
    setDmMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, message: "Pesan ini telah dihapus", mediaUrl: null }
          : m,
      ),
    );
  }, []);

  const handleReadReceived = useCallback((readerId: string) => {
    setDmMessages((prev) =>
      prev.map((m) =>
        m.recipientId === readerId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
      ),
    );
  }, []);

  const wsRef = useChatSocket({
    currentUserId,
    selectedContactId: selectedContact?.userId ?? null,
    onMessageReceived: handleMessageReceived,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onReadReceived: handleReadReceived,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        if (activeTab === "global") {
          void loadGlobalMessages();
        } else if (selectedContactIdRef.current) {
          void loadDmMessages(selectedContactIdRef.current, true);
        }
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeTab, loadGlobalMessages, loadDmMessages]);

  const handleUploadMedia = async (isDm: boolean, file: File) => {
    const setUploading = isDm ? setUploadingDmMedia : setUploadingGlobalMedia;
    const setMedia = isDm ? setDmMediaUrl : setGlobalMediaUrl;
    setUploading(true);
    try {
      const url = await uploadChatFile(file);
      setMedia(url);
    } catch (err) {
      console.error("Gagal mengunggah gambar:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat:edit",
          messageId,
          message: newText,
        } satisfies ChatWsClientMessage),
      );
    } else {
      try {
        const updated = await editChatMessage(messageId, newText);
        setGlobalMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
        setDmMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      } catch (err) {
        console.error("Gagal memperbarui pesan:", err);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat:delete",
          messageId,
        } satisfies ChatWsClientMessage),
      );
    } else {
      try {
        await deleteChatMessage(messageId);
        setGlobalMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, message: "Pesan ini telah dihapus", mediaUrl: null }
              : m,
          ),
        );
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, message: "Pesan ini telah dihapus", mediaUrl: null }
              : m,
          ),
        );
      } catch (err) {
        console.error("Gagal menghapus pesan:", err);
      }
    }
  };

  const handleSendGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = globalInput.trim();
    const media = globalMediaUrl;
    if ((!text && !media) || sendingGlobal) return;

    setSendingGlobal(true);
    setGlobalInput("");
    setGlobalMediaUrl(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat:send", message: text, mediaUrl: media }));
      setSendingGlobal(false);
    } else {
      try {
        const msg = await sendChatMessageApi("/learner/chat/global", text, media);
        setGlobalMessages((prev) => [...prev, msg]);
        setTimeout(() => scrollToBottom(globalScrollRef), 40);
      } catch (err) {
        console.error("Gagal mengirim pesan:", err);
      } finally {
        setSendingGlobal(false);
      }
    }
  };

  const handleSendDm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedContact) return;
    const text = dmInput.trim();
    const media = dmMediaUrl;
    if ((!text && !media) || sendingDm) return;

    setSendingDm(true);
    setDmInput("");
    setDmMediaUrl(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat:send",
          recipientId: selectedContact.userId,
          message: text,
          mediaUrl: media,
        }),
      );
      setSendingDm(false);
    } else {
      try {
        const url = `/learner/chat/dm/${encodeURIComponent(selectedContact.userId)}`;
        const msg = await sendChatMessageApi(url, text, media);
        setDmMessages((prev) => [...prev, msg]);
        setTimeout(() => scrollToBottom(dmScrollRef), 40);
      } catch (err) {
        console.error("Gagal mengirim pesan DM:", err);
      } finally {
        setSendingDm(false);
      }
    }
  };

  // Dossier modal for inspecting student profiles
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  // Horizontal swipe/drag gesture detection to switch tabs from center
  const { handlePointerDown, handlePointerUp, handlePointerCancel } = useChatSwipe({
    activeTab,
    onSwipeToDm: () => setActiveTab("dm"),
    onSwipeToGlobal: () => {
      setActiveTab("global");
      setSearchParams((current) => chatSearchParams(current, null));
    },
  });

  const handleTabChange = (nextTab: "global" | "dm") => {
    setActiveTab(nextTab);
    if (nextTab === "global") {
      setSearchParams((current) => chatSearchParams(current, null));
    }
  };

  return (
    <div
      className="flex flex-col flex-1 h-full w-full max-w-none md:max-w-7xl md:mx-auto md:space-y-3 touch-pan-y min-h-0"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-testid="chat-swipe-container"
    >
      <ChatNavHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasUnreadDm={conversations.some((c) => c.unreadCount > 0)}
      />

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "global" ? (
          <GlobalChatRoom
            currentUserId={currentUserId}
            messages={globalMessages}
            loading={loadingGlobal}
            input={globalInput}
            onInputChange={setGlobalInput}
            onSend={handleSendGlobal}
            sending={sendingGlobal}
            scrollRef={globalScrollRef}
            formatTime={formatMessageTime}
            onInspectUser={setInspectUserId}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            mediaUrl={globalMediaUrl}
            onMediaChange={setGlobalMediaUrl}
            uploadingMedia={uploadingGlobalMedia}
            onUploadMedia={(file) => handleUploadMedia(false, file)}
          />
        ) : (
          <DirectMessageRoom
            currentUserId={currentUserId}
            conversations={conversations}
            selectedContact={selectedContact}
            onSelectContact={(contact) => {
              setSelectedContact(contact);
              if (contact) {
                setSearchParams((current) => chatSearchParams(current, contact.userId));
              } else {
                setSearchParams((current) => chatSearchParams(current, null));
              }
            }}
            messages={dmMessages}
            loadingConversations={loadingConversations}
            loadingDm={loadingDm}
            input={dmInput}
            onInputChange={setDmInput}
            onSend={handleSendDm}
            sending={sendingDm}
            scrollRef={dmScrollRef}
            formatTime={formatMessageTime}
            friendsList={friendsList}
            loadingFriends={loadingFriends}
            onOpenFriends={loadFriends}
            onInspectUser={setInspectUserId}
            onBattleInvite={() => setCurrentTab("warrior")}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            mediaUrl={dmMediaUrl}
            onMediaChange={setDmMediaUrl}
            uploadingMedia={uploadingDmMedia}
            onUploadMedia={(file) => handleUploadMedia(true, file)}
          />
        )}
      </div>

      {/* Profile Modal */}
      <PublicProfileModal
        userId={inspectUserId}
        isOpen={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
      />
    </div>
  );
}
