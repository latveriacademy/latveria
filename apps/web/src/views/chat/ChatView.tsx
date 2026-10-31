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
import { PageHeading } from "../../components/ui/dashboard";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { PublicProfileModal } from "../../components/social/PublicProfileModal";
import { GlobalChatRoom } from "./GlobalChatRoom";
import { DirectMessageRoom } from "./DirectMessageRoom";

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

  const loadDmMessages = useCallback(async (contactId: string) => {
    try {
      setLoadingDm(true);
      const data = await api<{ messages: ChatMessage[] }>(
        `/learner/chat/dm/${encodeURIComponent(contactId)}?limit=50`,
      );
      setDmMessages(data.messages);
      setTimeout(() => scrollToBottom(dmScrollRef), 50);
      setConversations((prev) =>
        prev.map((c) => (c.userId === contactId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (err) {
      console.error("Gagal memuat pesan DM:", err);
    } finally {
      setLoadingDm(false);
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
          void loadDmMessages(selectedContactIdRef.current);
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

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      {/* Page Heading using House Reusable Component */}
      <PageHeading
        title="Ruang Obrolan"
        description="Komunikasi dan diskusi realtime antar sesama pejuang UTBK Latveria."
      />

      {/* Tabs Navigation using House Reusable Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          const nextTab = val as "global" | "dm";
          setActiveTab(nextTab);
          if (nextTab === "global") {
            setSearchParams({});
          }
        }}
      >
        <TabsList aria-label="Pilihan Ruang Obrolan" className="w-full sm:w-auto">
          <TabsTrigger value="global" className="flex-1 sm:flex-initial">
            <Globe className="size-3.5 mr-1" />
            <span>Saluran Global</span>
          </TabsTrigger>
          <TabsTrigger value="dm" className="flex-1 sm:flex-initial relative">
            <Users className="size-3.5 mr-1" />
            <span>Pesan Pribadi</span>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="size-2 rounded-full bg-[var(--gold)] animate-pulse ml-1" />
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Chat Content */}
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
              setSearchParams({ dm: contact.userId });
            } else {
              setSearchParams({});
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

      {/* Profile Modal */}
      <PublicProfileModal
        userId={inspectUserId}
        isOpen={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
      />
    </div>
  );
}
