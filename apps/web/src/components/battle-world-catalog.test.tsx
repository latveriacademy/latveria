import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { BattleWorldCatalog } from "./battle-world-catalog";
import type { TryoutHistoryEntry } from "@latveria/shared";
it("marks completed packages and links their zero-valued latest result without starting an attempt", () => {
  const latest: TryoutHistoryEntry = {
    id: "last-finished",
    packageId: "package",
    name: "Tryout contoh",
    completedAt: "2026-10-09T00:00:00Z",
    score: 0,
    scoringVersion: "utbk-simulation-v1",
    method: "simulation",
    isCompleteUtbk: true,
  };
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <BattleWorldCatalog
        packages={[
          {
            id: "package",
            name: "Tryout contoh",
            description: "Contoh",
            questionCount: 7,
            isFullTryout: true,
          },
        ]}
        catalogError=""
        actionError=""
        starting={false}
        activeSessionId={null}
        onStart={() => {}}
        onResume={() => {}}
        history={[latest, { ...latest, id: "previous", score: 700 }]}
      />
    </MemoryRouter>,
  );
  expect(html).toContain("Sudah dikerjakan · 2× selesai");
  expect(html).toContain("Kerjakan lagi");
  expect(html).toContain("result=last-finished");
  expect(html).toContain("Skor terakhir");
  expect(html).toContain("Skor simulasi UTBK");
});
