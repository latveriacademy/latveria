import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TryoutResultView } from "./tryout-result-view";
import type { TryoutSessionState } from "./tryout-workspace";

describe("TryoutResultView Certificate Download Button", () => {
  const completedData: TryoutSessionState = {
    session: {
      id: "session-1234-abcd",
      state: "completed",
      currentSubtestIndex: 0,
      breakEndsAt: null,
      answers: { q1: "0" },
      flags: {},
      currentQuestionIndex: 0,
      totalScore: 780,
      completedAt: "2026-10-10T12:00:00Z",
      questionTimes: {},
      secondsRemaining: 0,
    },
    package: {
      id: "pkg-1",
      name: "Simulasi SNBT Akbar 2026",
    },
    currentSubtest: {
      id: "sub-1",
      name: "Penalaran Umum",
      slug: "pu",
    },
    totalSubtests: 1,
    questions: [],
    reviewQuestions: [],
    score: {
      score: 780,
      rawScore: 78,
      maxPossibleRawScore: 100,
      totalCount: 10,
      correctCount: 8,
      incorrectCount: 2,
      unansweredCount: 0,
      accuracy: 80,
      averageTime: 45,
      performanceIndex: 78,
      itemBreakdowns: [],
    },
  };

  it("renders the 'Unduh Sertifikat PDF' button when tryout is completed", () => {
    const html = renderToStaticMarkup(
      <TryoutResultView
        data={completedData}
        onBack={() => {}}
        onReview={() => {}}
        onHistory={() => {}}
      />,
    );
    expect(html).toContain("Unduh Sertifikat PDF");
    expect(html).toContain("Simulasi SNBT Akbar 2026");
  });

  it("does not render the download certificate button if session is not completed", () => {
    const activeData: TryoutSessionState = {
      ...completedData,
      session: {
        ...completedData.session,
        state: "active",
      },
    };
    const html = renderToStaticMarkup(
      <TryoutResultView
        data={activeData}
        onBack={() => {}}
        onReview={() => {}}
        onHistory={() => {}}
      />,
    );
    expect(html).not.toContain("Unduh Sertifikat PDF");
  });
});
