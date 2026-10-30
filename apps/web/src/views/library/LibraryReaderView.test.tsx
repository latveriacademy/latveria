import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { LibraryItemSummary } from "@latveria/shared";
import { LibraryReaderView } from "./LibraryReaderView";

let mockItemData: LibraryItemSummary = {
  id: "test-id-1",
  title: "Konsep Aljabar dan Persamaan Kuadrat",
  slug: "konsep-aljabar",
  type: "article",
  subtestSlug: "penalaran-matematika",
  content: "Rumus abc: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
  url: null,
  thumbnailUrl: null,
  metadata: null,
  tags: ["aljabar", "matematika"],
  isPublished: true,
  authorId: "admin-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockItemData,
  };
});

it("renders LibraryReaderView with math content and badges", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryReaderView />
    </MemoryRouter>,
  );

  expect(html).toContain("Konsep Aljabar dan Persamaan Kuadrat");
  expect(html).toContain("Penalaran Matematika");
  expect(html).toContain("Artikel Konsep");
  expect(html).toContain("Kembali ke Library");
  expect(html).toContain("Ke atas");
  expect(html).toContain("aljabar");
  expect(html).toContain("matematika");
});

it("renders video with discussion material action button when materialUrl is provided", () => {
  mockItemData = {
    id: "test-video-1",
    title: "Video Pembahasan Soal UTBK Geometri",
    slug: "video-geometri",
    type: "video",
    subtestSlug: "penalaran-matematika",
    content: "Catatan rumus penting.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    metadata: {
      materialUrl: "https://drive.google.com/file/d/sample-slide/view",
      materialTitle: "Slide Pembahasan & Latihan Soal",
    },
    tags: ["geometri"],
    isPublished: true,
    authorId: "admin-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryReaderView />
    </MemoryRouter>,
  );

  expect(html).toContain("Video Pembahasan Soal UTBK Geometri");
  expect(html).toContain("Materi yang Sedang Dibahas");
  expect(html).toContain("Google Drive");
  expect(html).toContain("Slide Pembahasan &amp; Latihan Soal");
  expect(html).toContain("Buka Materi Pembahasan");
  expect(html).toContain("https://drive.google.com/file/d/sample-slide/view");
});

it("renders article with slide/document attachment button when materialUrl is provided", () => {
  mockItemData = {
    id: "test-article-1",
    title: "Materi DWU: Konsep Dasar Logika",
    slug: "materi-dwu-logika",
    type: "article",
    subtestSlug: "penalaran-umum",
    content: "Penjelasan logika proposisi.",
    url: null,
    thumbnailUrl: null,
    metadata: {
      materialUrl: "https://drive.google.com/file/d/dwu-slide-ppt/view",
      materialTitle: "Slide DWU Presentasi PPT",
    },
    tags: ["dwu", "logika"],
    isPublished: true,
    authorId: "admin-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryReaderView />
    </MemoryRouter>,
  );

  expect(html).toContain("Materi DWU: Konsep Dasar Logika");
  expect(html).toContain("Lampiran Dokumen / Slide Materi");
  expect(html).toContain("Slide DWU Presentasi PPT");
  expect(html).toContain("Buka Slide / Dokumen");
  expect(html).toContain("https://drive.google.com/file/d/dwu-slide-ppt/view");
});
