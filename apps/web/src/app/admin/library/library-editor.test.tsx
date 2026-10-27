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
  expect(html).toContain("Gambar Cover Materi (Rasio 16:9)");
  expect(html).toContain("Tag &amp; Kata Kunci Materi");
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
