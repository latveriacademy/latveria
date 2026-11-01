import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ChatView } from "./ChatView";
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
        id: "user-1",
        userId: "user-1",
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
    expect(html).toContain("Saluran Global");
    expect(html).toContain("Pesan Pribadi");
  });
});
