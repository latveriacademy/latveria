import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Globe, Users } from "lucide-react";
import type {
  ChatConversationSummary,
  ChatMessage,
  ChatWsClientMessage,
  ChatWsServerMessage,
  FriendUserDto,
} from "@latveria/shared";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { PublicProfileModal } from "../../components/social/PublicProfileModal";
import { GlobalChatRoom } from "./GlobalChatRoom";
import { DirectMessageRoom } from "./DirectMessageRoom";
import { chatSearchParams } from "./chat-search-params";

export function ChatView() {
  const { user, setCurrentTab } = useApp();
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

  const globalScrollRef = useRef<HTMLDivElement>(null);
  const dmScrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);
  selectedContactIdRef.current = selectedContact?.userId ?? null;

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
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
        prev.every(
          (message, index) =>
            message.id === data.messages[index].id &&
            message.readAt === data.messages[index].readAt,
        )
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

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/chat/ws`;

    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ChatWsServerMessage;
            if (data.type === "chat:message") {
              const msg = data.message;
              if (msg.recipientId === null) {
                setGlobalMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
                setTimeout(() => scrollToBottom(globalScrollRef), 40);
              } else {
                if (
                  msg.senderId === selectedContactIdRef.current ||
                  msg.recipientId === selectedContactIdRef.current
                ) {
                  setDmMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                  });
                  setTimeout(() => scrollToBottom(dmScrollRef), 40);
                }

                setConversations((prev) => {
                  const counterpartId = msg.senderId === user.id ? msg.recipientId! : msg.senderId;
                  const idx = prev.findIndex((c) => c.userId === counterpartId);
                  const isIncoming = msg.senderId !== user.id;

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
            } else if (data.type === "chat:read") {
              setDmMessages((prev) =>
                prev.map((m) =>
                  m.recipientId === data.readerId && !m.readAt
                    ? { ...m, readAt: new Date().toISOString() }
                    : m,
                ),
              );
            }
          } catch (err) {
            console.error("[ChatWS] Parse error:", err);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error("[ChatWS] Init error:", err);
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        if (activeTab === "global") {
          void loadGlobalMessages();
        } else if (selectedContactIdRef.current) {
          void loadDmMessages(selectedContactIdRef.current, true);
        }
      }
    }, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [activeTab, user.id, loadGlobalMessages, loadDmMessages, loadConversations]);

  const handleSendGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = globalInput.trim();
    if (!text || sendingGlobal) return;

    setSendingGlobal(true);
    setGlobalInput("");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload: ChatWsClientMessage = {
        type: "chat:send",
        message: text,
      };
      wsRef.current.send(JSON.stringify(payload));
      setSendingGlobal(false);
    } else {
      try {
        const res = await api<{ message: ChatMessage }>("/learner/chat/global", {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });
        setGlobalMessages((prev) => [...prev, res.message]);
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
    if (!text || sendingDm) return;

    setSendingDm(true);
    setDmInput("");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload: ChatWsClientMessage = {
        type: "chat:send",
        recipientId: selectedContact.userId,
        message: text,
      };
      wsRef.current.send(JSON.stringify(payload));
      setSendingDm(false);
    } else {
      try {
        const res = await api<{ message: ChatMessage }>(
          `/learner/chat/dm/${encodeURIComponent(selectedContact.userId)}`,
          {
            method: "POST",
            body: JSON.stringify({ message: text }),
          },
        );
        setDmMessages((prev) => [...prev, res.message]);
        setTimeout(() => scrollToBottom(dmScrollRef), 40);
      } catch (err) {
        console.error("Gagal mengirim pesan DM:", err);
      } finally {
        setSendingDm(false);
      }
    }
  };

  const formatMessageTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Dossier modal for inspecting student profiles
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  // Horizontal swipe/drag gesture detection to switch tabs from center
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    // Don't intercept inputs, textareas, buttons, or interactive links
    if (target?.closest("input, textarea, button, a, [role='button']")) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const deltaTime = Date.now() - dragStartRef.current.time;
    dragStartRef.current = null;

    // Must be predominantly horizontal gesture (deltaX > deltaY * 1.5)
    // Distance >= 50px and performed within 600ms
    if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime <= 600) {
      if (deltaX < 0 && activeTab === "global") {
        setActiveTab("dm");
      } else if (deltaX > 0 && activeTab === "dm") {
        setActiveTab("global");
        setSearchParams((current) => chatSearchParams(current, null));
      }
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
  };

  return (
    <div
      className="flex flex-col flex-1 h-full w-full md:h-auto md:space-y-4 max-w-none md:max-w-7xl md:mx-auto md:pb-8 touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-testid="chat-swipe-container"
    >
      {/* Desktop Tabs Switcher */}
      <div className="hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            const nextTab = val as "global" | "dm";
            setActiveTab(nextTab);
            if (nextTab === "global") {
              setSearchParams((current) => chatSearchParams(current, null));
            }
          }}
        >
          <TabsList aria-label="Pilihan Obrolan" className="w-auto">
            <TabsTrigger value="global">
              <Globe className="size-3.5 mr-1" />
              <span>Saluran Global</span>
            </TabsTrigger>
            <TabsTrigger value="dm" className="relative">
              <Users className="size-3.5 mr-1" />
              <span>Chat</span>
              {conversations.some((c) => c.unreadCount > 0) && (
                <span className="size-2 rounded-full bg-[var(--gold)] animate-pulse ml-1" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile-only Custom Header with Global & Chat Tabs */}
      <div
        className="md:hidden shrink-0 bg-[var(--surface-subtle)] border-b border-[var(--edge)] px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 flex items-center justify-between gap-2 shadow-xs z-10"
        data-testid="mobile-chat-header"
      >
        <div className="flex items-center gap-1 flex-1 bg-[var(--surface-elevated)] p-1 rounded-md border border-[var(--edge)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("global");
              setSearchParams((current) => chatSearchParams(current, null));
            }}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "global"
                ? "bg-[var(--gold)] text-black shadow-xs"
                : "text-[var(--text-muted,#9ca3af)] hover:text-[var(--text-main,#f3f4f6)] opacity-90"
            }`}
          >
            <Globe className="size-3.5" />
            <span>Saluran Global</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dm")}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 relative cursor-pointer ${
              activeTab === "dm"
                ? "bg-[var(--gold)] text-black shadow-xs"
                : "text-[var(--text-muted,#9ca3af)] hover:text-[var(--text-main,#f3f4f6)] opacity-90"
            }`}
          >
            <Users className="size-3.5" />
            <span>Chat</span>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span
                className={`size-2 rounded-full ${
                  activeTab === "dm" ? "bg-black" : "bg-red-500"
                } animate-pulse ml-1`}
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "global" ? (
          <GlobalChatRoom
            currentUserId={user.id}
            messages={globalMessages}
            loading={loadingGlobal}
            input={globalInput}
            onInputChange={setGlobalInput}
            onSend={handleSendGlobal}
            sending={sendingGlobal}
            scrollRef={globalScrollRef}
            formatTime={formatMessageTime}
            onInspectUser={setInspectUserId}
          />
        ) : (
          <DirectMessageRoom
            currentUserId={user.id}
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
