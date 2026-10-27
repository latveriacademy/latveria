import {
  FileText,
  Video,
  ExternalLink,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  utbkSubtests,
  type LibraryItemType,
} from "@latveria/shared";
import { Input } from "../../../components/ui/input";
import { LibraryMarkdownEditor } from "./library-markdown-editor";
import { LibraryCoverUpload } from "./library-cover-upload";
import { LibraryTagInput } from "./library-tag-input";

export interface LibraryFormState {
  title: string;
  slug: string;
  type: LibraryItemType;
  subtestSlug: string;
  content: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  isPublished: boolean;
}

interface LibraryEditorFormProps {
  form: LibraryFormState;
  onChange: <K extends keyof LibraryFormState>(key: K, value: LibraryFormState[K]) => void;
  uploadingThumb: boolean;
  onUploadThumbnail: (file: File) => Promise<void>;
  slugError?: string | null;
  urlError?: string | null;
}

export function LibraryEditorForm({
  form,
  onChange,
  uploadingThumb,
  onUploadThumbnail,
  slugError,
  urlError,
}: LibraryEditorFormProps) {
  const handleUrlChange = (newUrl: string) => {
    onChange("url", newUrl);
    if (form.type === "video") {
      const ytid = extractYouTubeVideoId(newUrl);
      if (ytid && !form.thumbnailUrl) {
        const thumb = getYouTubeThumbnailUrl(ytid);
        if (thumb) onChange("thumbnailUrl", thumb);
      }
    }
  };

  const handleAutoYouTubeThumb = () => {
    const ytid = extractYouTubeVideoId(form.url);
    if (ytid) {
      const thumb = getYouTubeThumbnailUrl(ytid);
      if (thumb) onChange("thumbnailUrl", thumb);
    }
  };

  const handleGenerateSlugFromTitle = () => {
    const generated = form.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    onChange("slug", generated);
  };

  return (
    <div className="space-y-6">
      {/* SEKSI 1: INFORMASI DASAR MATERI */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-5">
        <div className="border-b border-[var(--edge)] pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)]">
            1. Informasi Dasar Materi
          </h3>
          <span className="text-[11px] text-[var(--ink-muted)]">
            <span className="text-red-400 font-bold">*</span> Wajib diisi
          </span>
        </div>

        {/* Judul Materi Full Width */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Judul Materi <span className="text-red-400">*</span>
          </label>
          <Input
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Contoh: Trik Cepat Penalaran Matematika: Sistem Persamaan Linear"
            className="w-full text-sm font-medium h-11"
            required
          />
          <p className="text-[11px] text-[var(--ink-muted)]">
            Gunakan judul yang jelas dan spesifik agar peserta mudah mengenali topik pembelajaran.
          </p>
        </div>

        {/* Pemilihan Tipe Materi */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Tipe Format Materi <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "article",
                label: "Artikel / Modul",
                desc: "Format teks, Markdown, dan formula LaTeX",
                icon: FileText,
                cls: "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]",
              },
              {
                id: "video",
                label: "Video UTBK",
                desc: "Tautan YouTube dengan pemutar interaktif",
                icon: Video,
                cls: "border-red-500 bg-red-500/10 text-red-400",
              },
              {
                id: "link",
                label: "Tautan Rujukan",
                desc: "Dokumen eksternal, Google Drive, atau PDF",
                icon: ExternalLink,
                cls: "border-amber-500 bg-amber-500/10 text-amber-400",
              },
            ].map((t) => {
              const active = form.type === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange("type", t.id as LibraryItemType)}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? `${t.cls} ring-2 ring-current shadow-sm`
                      : "border-[var(--edge)] bg-[var(--surface-elevated)]/70 text-[var(--ink-muted)] hover:border-[var(--gold)]/40 hover:text-[var(--ink)]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.label}</span>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtes UTBK & Kustom Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--ink)]">
              Kategori Subtes UTBK
            </label>
            <select
              value={form.subtestSlug}
              onChange={(e) => onChange("subtestSlug", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--gold)] transition-colors"
            >
              <option value="">-- Umum / Tanpa Subtes Spesifik --</option>
              {utbkSubtests.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.short} - {st.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Tautkan ke subtes tertentu untuk memudahkan pengelompokan kurikulum.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--ink)]">Slug URL (Opsional)</label>
              {form.title && !form.slug && (
                <button
                  type="button"
                  onClick={handleGenerateSlugFromTitle}
                  className="text-[11px] text-[var(--gold)] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Buat dari Judul
                </button>
              )}
            </div>
            <Input
              value={form.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              placeholder="dibuat-otomatis-jika-kosong"
              className={`w-full text-xs font-mono h-11 ${slugError ? "border-red-500" : ""}`}
            />
            {slugError ? (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {slugError}
              </p>
            ) : (
              <p className="text-[11px] text-[var(--ink-muted)]">
                Hanya huruf kecil, angka, dan tanda hubung (-).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SEKSI 2: KONTEN MATERI (MENGIKUTI TIPE) */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-5">
        <div className="border-b border-[var(--edge)] pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)]">
            2. Konten Materi Pembelajaran
          </h3>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            Format:{" "}
            {form.type === "article"
              ? "Artikel Lengkap"
              : form.type === "video"
                ? "Video YouTube"
                : "Tautan Eksternal"}
          </span>
        </div>

        {/* Input Tautan Khusus untuk Video & Link */}
        {form.type === "video" && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--ink)]">
                Tautan Video YouTube <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoYouTubeThumb}
                className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1 font-semibold"
                title="Gunakan gambar cover resmi video YouTube"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ambil Cover YouTube
              </button>
            </div>
            <Input
              value={form.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              className={`w-full text-xs h-10 ${urlError ? "border-red-500" : ""}`}
              required
            />
            {urlError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {urlError}
              </p>
            )}
            <p className="text-[11px] text-[var(--ink-muted)]">
              Pemutar YouTube akan disematkan langsung di dashboard peserta tanpa gangguan iklan
              eksternal.
            </p>
          </div>
        )}

        {form.type === "link" && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <label className="block text-xs font-bold text-[var(--ink)]">
              Tautan Eksternal Sumber Materi <span className="text-red-400">*</span>
            </label>
            <Input
              value={form.url}
              onChange={(e) => onChange("url", e.target.value)}
              placeholder="https://drive.google.com/... atau https://situs-sumber.com/modul.pdf"
              className={`w-full text-xs h-10 ${urlError ? "border-red-500" : ""}`}
              required
            />
            {urlError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {urlError}
              </p>
            )}
            <p className="text-[11px] text-[var(--ink-muted)]">
              Peserta akan dapat membuka tautan ini langsung dari tombol aksi materi.
            </p>
          </div>
        )}

        {/* Markdown & KaTeX Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--ink)]">
              {form.type === "article"
                ? "Isi Artikel & Modul Pembelajaran"
                : "Catatan Penjelas / Ringkasan Materi"}
            </label>
            <span className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--gold)]" />
              Mendukung Markdown & LaTeX KaTeX
            </span>
          </div>

          <LibraryMarkdownEditor
            value={form.content}
            onChange={(val) => onChange("content", val)}
            minHeight={form.type === "article" ? "min-h-[420px]" : "min-h-[220px]"}
          />
        </div>
      </div>

      {/* SEKSI 3: COVER & TAG & STATUS */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-5">
        <div className="border-b border-[var(--edge)] pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)]">
            3. Gambar Cover, Tag, & Publikasi
          </h3>
        </div>

        {/* Cover 16:9 Upload */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Gambar Cover Materi (Rasio 16:9)
          </label>
          <LibraryCoverUpload
            thumbnailUrl={form.thumbnailUrl}
            onChange={(url) => onChange("thumbnailUrl", url)}
            uploading={uploadingThumb}
            onUploadFile={onUploadThumbnail}
            onAutoYouTubeThumb={handleAutoYouTubeThumb}
            isVideoType={form.type === "video"}
          />
        </div>

        {/* Tag Input Chip */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--edge)]/60">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Tag & Kata Kunci Materi
          </label>
          <LibraryTagInput
            tags={form.tags}
            onChange={(newTags) => onChange("tags", newTags)}
            placeholder="Ketik topik materi (contoh: aljabar, matriks) lalu tekan Enter..."
          />
        </div>

        {/* Pengaturan Status Publikasi (Tunggal & Jelas) */}
        <div className="space-y-2 pt-2 border-t border-[var(--edge)]/60">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Status Ketersediaan Materi
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange("isPublished", false)}
              className={`p-3.5 rounded-xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                !form.isPublished
                  ? "border-zinc-500 bg-zinc-500/10 ring-1 ring-zinc-500"
                  : "border-[var(--edge)] bg-[var(--surface-elevated)]/60 text-[var(--ink-muted)] hover:border-[var(--edge)]/80"
              }`}
            >
              <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[var(--ink)] block">
                  Simpan sebagai Draf
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] block mt-0.5 leading-snug">
                  Hanya tersimpan di panel admin, belum bisa diakses peserta.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChange("isPublished", true)}
              className={`p-3.5 rounded-xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                form.isPublished
                  ? "border-[var(--emerald)] bg-[var(--emerald)]/10 ring-1 ring-[var(--emerald)]"
                  : "border-[var(--edge)] bg-[var(--surface-elevated)]/60 text-[var(--ink-muted)] hover:border-[var(--edge)]/80"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[var(--ink)] block">
                  Tayangkan Sekarang
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] block mt-0.5 leading-snug">
                  Materi langsung tayang dan dapat dipelajari oleh peserta.
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
