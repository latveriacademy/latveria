import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { HeaderBar } from "./HeaderBar";
import { useApp } from "../context/AppContext";

vi.mock("../context/AppContext", () => ({
  useApp: vi.fn(),
}));

vi.mock("../utils/audioFeedback", () => ({
  sound: {
    playNotification: vi.fn(),
  },
}));

vi.mock("../lib/api", () => ({
  api: vi.fn().mockResolvedValue({}),
}));

const mockStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => mockStore.get(key) ?? null,
  setItem: (key: string, val: string) => mockStore.set(key, String(val)),
  removeItem: (key: string) => mockStore.delete(key),
  clear: () => mockStore.clear(),
  length: 0,
  key: () => null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("HeaderBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    vi.mocked(useApp).mockReturnValue({
      user: {
        userId: "user-1",
        name: "Test Learner",
        totalXP: 250,
        streakDays: 4,
        practicedToday: true,
      },
      currentTab: "dashboard",
      setCurrentTab: vi.fn(),
      toggleSidebar: vi.fn(),
      sidebarOpen: true,
    } as unknown as ReturnType<typeof useApp>);
  });

  it("renders notification button", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );
    expect(html).toContain('id="notification-center-btn"');
    expect(html).toContain('aria-label="Buka Notifikasi"');
  });
});
