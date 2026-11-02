import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import type { ChatMessage, ChatConversationSummary } from "@latveria/shared";
import { ChatView } from "./ChatView";
import { GlobalChatRoom } from "./GlobalChatRoom";
import { DirectMessageRoom } from "./DirectMessageRoom";
import { useApp } from "../../context/AppContext";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  api: vi.fn().mockResolvedValue({ messages: [], conversations: [], friends: [] }),
}));

describe("ChatView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      user: {
        id: "LTV-0001",
        userId: "uuid-user-1",
        name: "Test User",
        role: "user",
      },
      currentTab: "chat",
      setCurrentTab: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
  });

  it("renders both desktop tabs and mobile custom header switcher", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ChatView />
      </MemoryRouter>,
    );

    expect(html).toContain('data-testid="mobile-chat-header"');
    expect(html).toContain('data-testid="chat-swipe-container"');
    expect(html).toContain("touch-pan-y");
    expect(html).toContain("Saluran Global");
    expect(html).toContain("Chat");
    expect(html).not.toContain("Ruang Obrolan");
  });

  it("renders sender messages on the right (flex-row-reverse) and other users on the left in GlobalChatRoom", () => {
    const messages: ChatMessage[] = [
      {
        id: "msg-1",
        senderId: "uuid-user-2",
        recipientId: null,
        message: "Halo dari teman belajar!",
        createdAt: new Date().toISOString(),
        senderName: "Budi",
        senderRole: "user",
        senderImage: null,
        readAt: null,
      },
      {
        id: "msg-2",
        senderId: "uuid-user-1",
        recipientId: null,
        message: "Halo, saya sedang latihan!",
        createdAt: new Date().toISOString(),
        senderName: "Test User",
        senderRole: "user",
        senderImage: null,
        readAt: null,
      },
    ];

    const html = renderToStaticMarkup(
      <GlobalChatRoom
        currentUserId="uuid-user-1"
        messages={messages}
        loading={false}
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        sending={false}
        scrollRef={{ current: null }}
        formatTime={() => "12:00"}
      />,
    );

    expect(html).toContain("flex-row-reverse");
    expect(html).toContain("rounded-tr-none");
    expect(html).toContain("Kamu");
    expect(html).toContain("flex-row");
    expect(html).toContain("rounded-tl-none");
    expect(html).toContain("Budi");
  });

  it("renders sender messages on the right and counterpart on the left in DirectMessageRoom", () => {
    const contact: ChatConversationSummary = {
      userId: "uuid-user-2",
      name: "Budi",
      image: null,
      lastMessage: "Halo!",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      role: "user",
    };

    const messages: ChatMessage[] = [
      {
        id: "dm-1",
        senderId: "uuid-user-2",
        recipientId: "uuid-user-1",
        message: "Mau duel?",
        createdAt: new Date().toISOString(),
        senderName: "Budi",
        senderRole: "user",
        senderImage: null,
        readAt: null,
      },
      {
        id: "dm-2",
        senderId: "uuid-user-1",
        recipientId: "uuid-user-2",
        message: "Ayo, gas!",
        createdAt: new Date().toISOString(),
        senderName: "Test User",
        senderRole: "user",
        senderImage: null,
        readAt: null,
      },
    ];

    const html = renderToStaticMarkup(
      <DirectMessageRoom
        currentUserId="uuid-user-1"
        conversations={[contact]}
        selectedContact={contact}
        onSelectContact={vi.fn()}
        messages={messages}
        loadingConversations={false}
        loadingDm={false}
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        sending={false}
        scrollRef={{ current: null }}
        formatTime={() => "12:00"}
        friendsList={[]}
        loadingFriends={false}
        onOpenFriends={vi.fn()}
      />,
    );

    expect(html).toContain("flex-row-reverse");
    expect(html).toContain("rounded-tr-none");
    expect(html).toContain("Ayo, gas!");
    expect(html).toContain("Mau duel?");
  });
});
