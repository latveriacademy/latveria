import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { BattleSummaryDto } from "@latveria/shared";
import { ResultScreen } from "./ResultScreen";

const summary: BattleSummaryDto = {
  id: "battle",
  code: "ABCDE",
  mode: "1v1",
  questionCount: 2,
  winnerTeamNumber: 1,
  isDraw: false,
  createdAt: "2026-10-14T00:00:00Z",
  participants: [],
  teams: [
    { id: "team1", teamNumber: 1, score: 250 },
    { id: "team2", teamNumber: 2, score: 100 },
  ],
};

it("shows the receiver's actual outcome when the shared completion event has no isWinner", () => {
  const render = (team: number, data = summary) =>
    renderToStaticMarkup(
      <ResultScreen
        summary={data}
        myTeamNumber={team}
        onExit={() => {}}
        onRequestRematch={() => {}}
      />,
    );
  expect(render(1)).toContain("Kamu menang");
  expect(render(2)).toContain("Kamu kalah");
  expect(render(1, { ...summary, isDraw: true, winnerTeamNumber: null })).toContain("Duel seri");
  expect(render(1, { ...summary, mode: "2v2" })).toContain("Tim kamu menang");
  expect(render(2, { ...summary, mode: "2v2" })).toContain("Tim kamu kalah");
});
