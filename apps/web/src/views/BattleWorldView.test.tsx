import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { learnerNavigation } from "../components/learner-navigation";
import { BattleWorldView } from "./BattleWorldView";

it("offers Drilling and Battle World navigation with an honest tryout destination", () => {
  expect(learnerNavigation.find((item) => item.id === "practice")?.label).toBe("Drilling");
  expect(learnerNavigation.find((item) => item.id === "tryout")?.label).toBe("Battle World");
  const html = renderToStaticMarkup(<MemoryRouter><BattleWorldView /></MemoryRouter>);
  expect(html).toContain("Battle World");
  expect(html).toContain("Tryout belum tersedia");
  expect(html).toContain('href="/dashboard?tab=practice"');
  expect(html).not.toContain("Mulai tryout");
});
