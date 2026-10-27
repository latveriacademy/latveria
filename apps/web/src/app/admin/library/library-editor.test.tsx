import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LibraryEditorPage } from "./library-editor-page";
import { LibraryEditorForm, type LibraryFormState } from "./library-editor-form";
import { LibraryLivePreview } from "./library-live-preview";

it("renders LibraryEditorPage with clean navigation, form fields, and live preview", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/admin/library/new"]}>
      <LibraryEditorPage />
    </MemoryRouter>,
  );

  expect(html).toContain("Buat Materi Pembelajaran Baru");
  expect(html).toContain("1. Informasi Utama");
  expect(html).toContain("2. Konten Materi");
  expect(html).toContain("3. Cover &amp; Pengaturan");
  expect(html).toContain("Pratinjau Tampilan Peserta");
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
    tags: "matematika, utbk",
    isPublished: true,
  };

  const html = renderToStaticMarkup(
    <LibraryEditorForm
      form={form}
      onChange={() => {}}
      uploadingThumb={false}
      onUploadThumbnail={() => {}}
    />,
  );

  expect(html).toContain("Tautan Video YouTube");
  expect(html).toContain("Auto Thumb");
  expect(html).toContain("Unggah Gambar");
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
});
