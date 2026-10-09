import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { buildUtbkReport, scoreSimulationSubtest, utbkSubtests } from "@latveria/shared";
import { TryoutScoreReport } from "./tryout-score-report";
const subtests = utbkSubtests.map((subtest, index) =>
  scoreSimulationSubtest(subtest.slug, subtest.name, [
    {
      questionId: subtest.slug,
      revisionId: subtest.slug,
      scoreFraction: index === 0 ? 1 : 0,
      isAnswered: true,
      maxPoints: 1,
      irtEligible: true,
      timeSpentSeconds: 60,
    },
  ]),
);
it("renders an accessible radar with real subtest scores and collapsed calibration details", () => {
  const html = renderToStaticMarkup(<TryoutScoreReport report={buildUtbkReport(subtests, 7)} />);
  expect(html).toContain('role="img"');
  expect(html).toContain("Penalaran Umum: 1000 dari 1000");
  expect(html).toContain("Penalaran Matematika: 0 dari 1000");
  expect(html).toContain("143");
  expect(html).toContain("Rata-rata tujuh subtes");
  expect(html).toContain("<details");
  expect(html).not.toContain("NaN");
});
it("does not invent zero scores for missing axes in partial Tryouts", () => {
  const html = renderToStaticMarkup(
    <TryoutScoreReport report={buildUtbkReport(subtests.slice(0, 2), 2)} />,
  );
  expect(html).not.toContain('role="img"');
  expect(html).toContain("Rata-rata 2 subtes");
  expect(html).toContain("Profil radar tersedia ketika tujuh subtes");
});
it("keeps a partially available IRT subtest score visible without mixing it into the total", () => {
  const report = buildUtbkReport(
    subtests.map((row, index) =>
      index === 0
        ? {
            ...row,
            irtStatus: "calibrated",
            irt: {
              score: 612,
              theta: 1.12,
              standardError: 0.3,
              calibrationId: "model",
              version: "v1",
            },
          }
        : row,
    ),
    7,
  );
  expect(report.method).toBe("simulation");
  const html = renderToStaticMarkup(<TryoutScoreReport report={report} />);
  expect(html).toContain("612");
  expect(html).toContain("IRT 2PL");
  expect(html).toContain("143");
});
