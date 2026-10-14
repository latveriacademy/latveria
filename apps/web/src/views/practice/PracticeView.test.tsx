import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { PracticeView } from "./PracticeView";
import { learnerMobileNavigation, learnerNavigation } from "../../components/learner-navigation";
import { useApp } from "../../context/AppContext";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(() => ({
    topics: [],
    topicsLoading: false,
    topicsError: "Gagal memuat subtes.",
    refreshTopics: () => {},
  })),
}));

it("shows an error and retry action instead of a blank practice catalogue", () => {
  vi.mocked(useApp).mockReturnValue({
    topics: [],
    topicsLoading: false,
    topicsError: "Gagal memuat subtes.",
    refreshTopics: () => {},
  } as ReturnType<typeof useApp>);
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PracticeView />
    </MemoryRouter>,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Gagal memuat subtes.");
  expect(html).toContain("Coba lagi");
});

it("keeps Drilling as question discovery and exposes non-tryout destinations separately", () => {
  vi.mocked(useApp).mockReturnValue({
    topics: [
      {
        id: "PU",
        slug: "penalaran-umum",
        name: "Penalaran Umum",
        category: "Tes Skolastik",
        description: "Pola dan logika",
        packageCount: 1,
        questionsCount: 10,
      },
      {
        id: "MD",
        slug: "matematika-dasar",
        name: "Matematika Dasar",
        category: "Ujian Mandiri",
        description: "Aljabar dasar",
        packageCount: 1,
        questionsCount: 8,
      },
    ],
    topicsLoading: false,
    topicsError: "",
    refreshTopics: () => {},
  } as ReturnType<typeof useApp>);
  expect(learnerNavigation.find((item) => item.id === "practice")?.label).toBe("Drilling");
  expect(learnerNavigation.find((item) => item.id === "library")?.label).toBe("Library");
  expect(learnerMobileNavigation.map((item) => item.id)).toContain("library");
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PracticeView />
    </MemoryRouter>,
  );
  expect(html).toContain('placeholder="Cari paket soal, subtes, topik…"');
  expect(html).toContain('aria-label="Filter paket"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain("TKA &amp; Mandiri");
  expect(html).toContain("Drilling");
  expect(html).not.toContain("Materi belum tersedia");
});

it("preserves a subtest deep link as the selected package filter", () => {
  vi.mocked(useApp).mockReturnValue({
    topics: [
      { id: "PU", slug: "penalaran-umum", name: "Penalaran Umum", category: "Tes Skolastik" },
    ],
    topicsLoading: false,
    topicsError: "",
  } as ReturnType<typeof useApp>);
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard?tab=practice&subtes=penalaran-umum"]}>
      <PracticeView />
    </MemoryRouter>,
  );
  expect(html).toMatch(
    /<button[^>]*aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Penalaran Umum/,
  );
  expect(html).toContain('<option value="penalaran-umum" selected="">');
});
