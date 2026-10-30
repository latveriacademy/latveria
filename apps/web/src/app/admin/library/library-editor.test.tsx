import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LibraryEditorPage } from "./library-editor-page";
import { LibraryEditorForm, type LibraryFormState } from "./library-editor-form";
import { LibraryLivePreview } from "./library-live-preview";
import { LibraryTagInput } from "./library-tag-input";

it("renders LibraryEditorPage with clean navigation, form fields, and live preview", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/admin/library/new"]}>
      <LibraryEditorPage />
    </MemoryRouter>,
  );

  expect(html).toContain("Buat Materi Pembelajaran Baru");
  expect(html).toContain("1. Informasi Dasar Materi");
  expect(html).toContain("2. Konten Materi Pembelajaran");
  expect(html).toContain("3. Gambar Cover, Tag, &amp; Publikasi");
  expect(html).toContain("Pratinjau Tampilan Peserta");
  expect(html).toContain("Simpan Draf");
  expect(html).toContain("Terbitkan Materi");
});

it("renders LibraryEditorForm with YouTube URL and auto-thumbnail helpers for video type", () => {
  const form: LibraryFormState = {
    title: "Video Pembahasan Penalaran Kuantitatif",
    slug: "video-pk-utbk",
    type: "video",
    subtestSlug: "penalaran-matematika",
    content: "Catatan rumus penting.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    materialUrl: "https://drive.google.com/file/d/sample-slide/view",
    materialTitle: "Slide Pembahasan & Latihan Soal",
    tags: ["matematika", "utbk"],
    isPublished: true,
  };

  const html = renderToStaticMarkup(
    <LibraryEditorForm
      form={form}
      onChange={() => {}}
      uploadingThumb={false}
      onUploadThumbnail={async () => {}}
    />,
  );

  expect(html).toContain("Tautan Video YouTube");
  expect(html).toContain("Ambil Cover YouTube");
  expect(html).toContain("Tautan Materi yang Sedang Dibahas");
  expect(html).toContain("Nama / Label Tombol Materi (Opsional)");
  expect(html).toContain("https://drive.google.com/file/d/sample-slide/view");
  expect(html).toContain("Slide Pembahasan &amp; Latihan Soal");
  expect(html).toContain("Gambar Cover Materi (Rasio 16:9)");
  expect(html).toContain("Tag &amp; Kata Kunci Materi");
});

it("renders LibraryEditorForm with document attachment field for article type", () => {
  const form: LibraryFormState = {
    title: "Modul Lengkap Barisan dan Deret",
    slug: "modul-barisan-deret",
    type: "article",
    subtestSlug: "penalaran-matematika",
    content: "Penjelasan materi dan rumus.",
    url: "",
    thumbnailUrl: "",
    materialUrl: "https://drive.google.com/file/d/slide-dwu/view",
    materialTitle: "Slide PPT Pembahasan Barisan",
    tags: ["matematika"],
    isPublished: true,
  };

  const html = renderToStaticMarkup(
    <LibraryEditorForm
      form={form}
      onChange={() => {}}
      uploadingThumb={false}
      onUploadThumbnail={async () => {}}
    />,
  );

  expect(html).toContain("Lampiran Dokumen / Slide Materi (Google Drive, PDF, PPT)");
  expect(html).toContain("https://drive.google.com/file/d/slide-dwu/view");
  expect(html).toContain("Slide PPT Pembahasan Barisan");
});

it("renders LibraryLivePreview properly with video material action button", () => {
  const html = renderToStaticMarkup(
    <LibraryLivePreview
      type="video"
      subtestSlug="penalaran-matematika"
      isPublished={true}
      title="Video Bahas Tuntas Geometri"
      url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      content="Catatan geometri ruang."
      youtubeVideoId="dQw4w9WgXcQ"
      materialUrl="https://drive.google.com/file/d/slide-geo/view"
      materialTitle="Slide Geometri Ruang UTBK"
    />,
  );

  expect(html).toContain("Video Bahas Tuntas Geometri");
  expect(html).toContain("Materi yang Dibahas");
  expect(html).toContain("Google Drive");
  expect(html).toContain("Slide Geometri Ruang UTBK");
  expect(html).toContain("Buka Materi");
  expect(html).toContain("https://drive.google.com/file/d/slide-geo/view");
});

it("renders LibraryLivePreview properly with subtest and math content", () => {
  const html = renderToStaticMarkup(
    <LibraryLivePreview
      type="article"
      subtestSlug="penalaran-matematika"
      isPublished={true}
      title="Konsep Barisan dan Deret"
      url=""
      content="Rumus suku ke-$n$ barisan aritmetika adalah $U_n = a + (n-1)b$."
      youtubeVideoId={null}
    />,
  );

  expect(html).toContain("Konsep Barisan dan Deret");
  expect(html).toContain("Penalaran Matematika");
  expect(html).toContain("Tayang");
  expect(html).toContain("Mode Tampilan:");
});

it("renders LibraryTagInput chips properly", () => {
  const tags = ["aljabar", "matriks"];
  const html = renderToStaticMarkup(<LibraryTagInput tags={tags} onChange={() => {}} />);

  expect(html).toContain("#aljabar");
  expect(html).toContain("#matriks");
  expect(html).toContain("2/10 tag");
});

it("renders LibraryLivePreview with draft status badge and external link", () => {
  const html = renderToStaticMarkup(
    <LibraryLivePreview
      type="link"
      subtestSlug="literasi-dalam-bahasa-indonesia"
      isPublished={false}
      title="Rujukan Modul Bahasa"
      url="https://example.com/modul.pdf"
      content="Panduan membaca cepat."
      youtubeVideoId={null}
    />,
  );

  expect(html).toContain("Rujukan Modul Bahasa");
  expect(html).toContain("Draf");
  expect(html).toContain("Tautan Sumber Materi:");
});
