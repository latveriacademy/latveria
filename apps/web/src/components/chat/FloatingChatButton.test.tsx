import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FloatingChatButton } from "./FloatingChatButton";
import { useApp } from "../../context/AppContext";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

describe("FloatingChatButton", () => {
  it("renders floating chat button on mobile when on another tab", () => {
    vi.mocked(useApp).mockReturnValue({
      currentTab: "dashboard",
      setCurrentTab: vi.fn(),
      activeSession: null,
    } as unknown as ReturnType<typeof useApp>);

    const html = renderToStaticMarkup(<FloatingChatButton />);
    expect(html).toContain("floating-chat-btn");
    expect(html).toContain('aria-label="Buka Chat"');
  });

  it("does not render when user is already on the chat tab", () => {
    vi.mocked(useApp).mockReturnValue({
      currentTab: "chat",
      setCurrentTab: vi.fn(),
      activeSession: null,
    } as unknown as ReturnType<typeof useApp>);

    const html = renderToStaticMarkup(<FloatingChatButton />);
    expect(html).toBe("");
  });

  it("does not render during an active drilling session", () => {
    vi.mocked(useApp).mockReturnValue({
      currentTab: "practice",
      setCurrentTab: vi.fn(),
      activeSession: { sessionId: "sess-1" },
    } as unknown as ReturnType<typeof useApp>);

    const html = renderToStaticMarkup(<FloatingChatButton />);
    expect(html).toBe("");
  });
});
