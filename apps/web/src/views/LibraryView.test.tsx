import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { LibraryView } from "./LibraryView";

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    topics: [
      { id: "PU", slug: "penalaran-umum", name: "Penalaran Umum", category: "Tes Skolastik" },
      { id: "PM", slug: "penalaran-matematika", name: "Penalaran Matematika", category: "Tes Literasi" },
    ],
    history: [],
    activeSession: null,
    startPractice: vi.fn(),
    loading: false,
  }),
}));

it("renders Library header and package catalog correctly", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryView />
    </MemoryRouter>
  );

  expect(html).toContain("Library");
  expect(html).toContain("Temukan paket soal dan uji kemampuanmu.");
  expect(html).toContain("LIBRARY // ARCHIVE");
  expect(html).toContain("SEMUA PAKET");
  expect(html).toContain("FILTER PAKET");
  expect(html).toContain("Tryout Fundamental UTBK 2027");
  expect(html).toContain("Mulai Paket");
});
