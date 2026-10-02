import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { PracticeView } from "./PracticeView";

vi.mock("../context/AppContext", () => ({
  useApp: () => ({ topics: [], topicsLoading: false, topicsError: "Gagal memuat subtes.", refreshTopics: () => {} }),
}));

it("shows an error and retry action instead of a blank practice catalogue", () => {
  const html = renderToStaticMarkup(<MemoryRouter><PracticeView /></MemoryRouter>);
  expect(html).toContain('role="alert"');
  expect(html).toContain("Gagal memuat subtes.");
  expect(html).toContain("Coba lagi");
});
