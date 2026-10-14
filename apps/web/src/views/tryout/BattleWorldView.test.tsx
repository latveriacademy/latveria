import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { learnerMobileNavigation, learnerNavigation } from "../../components/learner-navigation";
import { BattleWorldView } from "./BattleWorldView";

it("offers Drilling and Battle World navigation and an empty state backed by live package data", async () => {
  expect(learnerNavigation.find((item) => item.id === "practice")?.label).toBe("Drilling");
  expect(learnerNavigation.find((item) => item.id === "tryout")?.label).toBe("Battle World");
  expect(learnerMobileNavigation.map((item) => item.id)).toEqual([
    "dashboard",
    "practice",
    "warrior",
    "library",
    "tryout",
    "leaderboard",
    "profile",
    "settings",
  ]);

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <BattleWorldView />
    </MemoryRouter>,
  );
  expect(html).toContain("Battle World");
  expect(html).toContain("Belum ada tryout UTBK");
  expect(html).toContain('role="tab"');
  expect(html).toContain("TKA");
  expect(html).toContain("Ujian Mandiri");
  expect(html).toContain('href="/dashboard?tab=practice"');
  expect(html).not.toContain("Mulai tryout");
});
