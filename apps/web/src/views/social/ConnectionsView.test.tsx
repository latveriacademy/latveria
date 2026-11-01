import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ConnectionsView } from "./ConnectionsView";
import { useApp } from "../../context/AppContext";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  api: vi.fn().mockResolvedValue({
    friends: [],
    pendingIncoming: [],
    pendingOutgoing: [],
  }),
}));

describe("ConnectionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      user: {
        id: "user-1",
        userId: "user-1",
        name: "Test User",
        role: "user",
      },
      currentTab: "connections",
      setCurrentTab: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
  });

  it("renders Friendlist heading and responsive tab triggers", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConnectionsView />
      </MemoryRouter>,
    );

    expect(html).toContain("Friendlist");
    expect(html).toContain("Cari");
    expect(html).toContain("Permintaan");
    expect(html).not.toContain("Cari Teman");
  });
});
