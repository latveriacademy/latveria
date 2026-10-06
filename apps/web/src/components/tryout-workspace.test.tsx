import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TryoutWorkspace, type TryoutSessionState } from "./tryout-workspace";

it("renders the practice workspace with index-zero answers and tryout subtest controls", () => {
  const data: TryoutSessionState = {
    session: {
      id: "session",
      state: "active",
      currentSubtestIndex: 1,
      breakEndsAt: null,
      answers: { q1: "0" },
      flags: { q1: true },
      currentQuestionIndex: 0,
      totalScore: null,
      completedAt: null,
      questionTimes: {},
      secondsRemaining: 900,
    },
    package: { id: "package", name: "Tryout" },
    currentSubtest: { id: "topic", name: "Penalaran Umum", slug: "penalaran-umum" },
    totalSubtests: 7,
    questions: [
      {
        id: "q1",
        prompt: "Pertanyaan",
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E"],
      },
    ],
  };
  const noop = () => {};
  const html = renderToStaticMarkup(
    <TryoutWorkspace
      data={data}
      currentIndex={0}
      answers={data.session.answers}
      flags={data.session.flags}
      time="15:00"
      timerWarning={false}
      pending={false}
      onExit={noop}
      onSubmit={noop}
      onAnswer={noop}
      onFlag={noop}
      onJump={noop}
    />,
  );
  expect(html).toContain('class="quiz-split-workspace"');
  expect(html).toContain('class="option-choice-card selected"');
  expect(html).toContain("TERJAWAB (A)");
  expect(html).toContain("is-answered is-active is-flagged");
  expect(html).toContain("SUBTES 2/7");
  expect(html).toContain("Navigasi");
  expect(html).not.toContain("KUNCI JAWABAN");
});
