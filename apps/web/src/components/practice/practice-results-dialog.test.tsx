import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PracticeResultsDialog } from "./practice-results-dialog";

vi.mock("../app-dialog", () => ({
  AppDialog: ({ children }: { children: ReactNode }) => children,
}));

it("labels the result as accuracy and separates correct, incorrect, unanswered, and EXP", () => {
  const html = renderToStaticMarkup(
    <PracticeResultsDialog
      open
      subject="Pengetahuan Kuantitatif"
      packageName="Kalkulus 001"
      correct={4}
      total={10}
      unanswered={0}
      earnedXP={90}
      onClose={() => {}}
      onExit={() => {}}
    />,
  );
  expect(html).toContain("Ketepatan jawaban");
  expect(html).toContain("4 dari 10 soal dijawab benar.");
  expect(html).toContain("<strong>40</strong>");
  expect(html).toContain("+90 EXP");
  expect(html).toContain("Lihat pembahasan");
  expect(html).not.toContain("/ 100");
});

it("does not show an EXP reward for read-only history results", () => {
  const html = renderToStaticMarkup(
    <PracticeResultsDialog
      open
      subject="Latihan"
      correct={0}
      total={0}
      unanswered={0}
      earnedXP={null}
      onClose={() => {}}
      onExit={() => {}}
      exitLabel="Kembali ke riwayat"
    />,
  );
  expect(html).not.toContain("EXP diperoleh");
  expect(html).toContain("Kembali ke riwayat");
  expect(html).not.toContain("NaN");
});

it("displays average time per question and total duration when provided", () => {
  const html = renderToStaticMarkup(
    <PracticeResultsDialog
      open
      subject="Penalaran Matematika"
      correct={8}
      total={10}
      unanswered={0}
      averageTimeSeconds={45}
      totalTimeSeconds={450}
      onClose={() => {}}
      onExit={() => {}}
    />,
  );
  expect(html).toContain("Rata-rata waktu per butir");
  expect(html).toContain("45 dtk / butir");
  expect(html).toContain("Total durasi pengerjaan");
  expect(html).toContain("7m 30s");
});
