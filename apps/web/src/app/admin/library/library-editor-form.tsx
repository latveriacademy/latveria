import { useRef } from "react";
import {
  FileText,
  Video,
  ExternalLink,
  Upload,
  Loader2,
  Sparkles,
  Code2,
  Bold,
  List,
} from "lucide-react";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  utbkSubtests,
  type LibraryItemType,
} from "@latveria/shared";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";

export interface LibraryFormState {
  title: string;
  slug: string;
  type: LibraryItemType;
  subtestSlug: string;
  content: string;
  url: string;
  thumbnailUrl: string;
  tags: string;
  isPublished: boolean;
}

interface LibraryEditorFormProps {
  form: LibraryFormState;
  onChange: <K extends keyof LibraryFormState>(key: K, value: LibraryFormState[K]) => void;
  uploadingThumb: boolean;
  onUploadThumbnail: (file: File) => void;
}

export function LibraryEditorForm({
  form,
  onChange,
  uploadingThumb,
  onUploadThumbnail,
}: LibraryEditorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const insertSnippet = (before: string, after: string = "") => {
    const textarea = document.getElementById("library-content-area") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = form.content;
    const selected = current.substring(start, end) || "teks";
    const replacement = `${before}${selected}${after}`;
    const nextContent = current.substring(0, start) + replacement + current.substring(end);
    onChange("content", nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* KARTU 1: Detail Utama */}
      <div className="p-5 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)] flex items-center gap-2">
          <span>1. Informasi Utama</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Judul Materi <span className="text-red-400">*</span>
          </label>
          <Input
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Contoh: Trik Cepat Penalaran Matematika: Sistem Persamaan Linear"
            className="text-sm font-medium"
            required
          />
        </div>

        {/* Pemilihan Tipe */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Tipe Materi Pembelajaran
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "article",
                label: "Artikel / Modul",
                desc: "Markdown & Formula LaTeX",
                icon: FileText,
                cls: "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]",
              },
              {
                id: "video",
                label: "Video UTBK",
                desc: "Embed YouTube interaktif",
                icon: Video,
                cls: "border-red-500 bg-red-500/10 text-red-400",
              },
              {
                id: "link",
                label: "Tautan Eksternal",
                desc: "Drive, PDF, atau referensi",
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
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    active
                      ? `${t.cls} ring-1 ring-current`
                      : "border-[var(--edge)] bg-[var(--surface-elevated)]/60 text-[var(--ink-muted)] hover:border-[var(--gold)]/40 hover:text-[var(--ink)]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.label}</span>
                  </div>
                  <p className="text-[10px] opacity-80 leading-snug">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtes & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Subtes UTBK Terkait
            </label>
            <select
              value={form.subtestSlug}
              onChange={(e) => onChange("subtestSlug", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--gold)] transition-colors"
            >
              <option value="">-- Umum / Tanpa Subtes Spesifik --</option>
              {utbkSubtests.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.short} - {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Kustom Slug URL (Opsional)
            </label>
            <Input
              value={form.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              placeholder="otomatis-dibuat-bila-kosong"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* KARTU 2: Konten & Media */}
      <div className="p-5 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)] flex items-center justify-between">
          <span>2. Konten Materi</span>
          <span className="text-[11px] font-normal text-[var(--ink-muted)] lowercase font-mono">
            {form.type === "article" ? "markdown & katex" : form.type}
          </span>
        </h3>

        {/* Input URL jika tipe Video atau Link */}
        {(form.type === "video" || form.type === "link") && (
          <div className="p-3.5 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
              {form.type === "video" ? "Tautan Video YouTube" : "Tautan Eksternal"}{" "}
              <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={form.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={
                  form.type === "video"
                    ? "https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                    : "https://drive.google.com/... atau tautan artikel"
                }
                className="text-xs"
                required
              />
              {form.type === "video" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoYouTubeThumb}
                  title="Ambil gambar thumbnail YouTube secara otomatis"
                  className="shrink-0 text-xs h-10 border-[var(--edge)] hover:border-[var(--gold)]"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--gold)]" /> Auto Thumb
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              {form.type === "video"
                ? "Video akan disematkan langsung di pemutar web peserta tanpa iklan luar."
                : "Peserta akan diarahkan ke tautan ini melalui tombol akses referensi."}
            </p>
          </div>
        )}

        {/* Text Editor dengan LaTeX Toolbar */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              {form.type === "article"
                ? "Isi Artikel & Formula Matematika"
                : "Catatan / Ringkasan Materi"}
            </label>

            {/* Quick LaTeX & Markdown Toolbar */}
            <div className="flex items-center gap-1 bg-[var(--surface-elevated)] p-1 rounded-md border border-[var(--edge)] text-xs">
              <button
                type="button"
                onClick={() => insertSnippet("$", "$")}
                className="px-2 py-0.5 rounded hover:bg-[var(--surface-muted)] text-[var(--gold)] font-mono text-[11px]"
                title="Sisipkan LaTeX Inline $x^2$"
              >
                $x$
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("$$\n", "\n$$")}
                className="px-2 py-0.5 rounded hover:bg-[var(--surface-muted)] text-[var(--gold)] font-mono text-[11px]"
                title="Sisipkan LaTeX Blok $$...$$"
              >
                $$...$$
              </button>
              <div className="w-px h-3 bg-[var(--edge)] mx-0.5" />
              <button
                type="button"
                onClick={() => insertSnippet("**", "**")}
                className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                title="Tebal"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("- ")}
                className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                title="Daftar Poin"
              >
                <List className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("```\n", "\n```")}
                className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                title="Blok Kode"
              >
                <Code2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <Textarea
            id="library-content-area"
            value={form.content}
            onChange={(e) => onChange("content", e.target.value)}
            rows={form.type === "article" ? 14 : 5}
            placeholder={
              form.type === "article"
                ? "Tulis isi modul materi lengkap di sini...\n\nContoh formula matematika:\nMisalkan kurva parabola dinyatakan dengan rumus $f(x) = ax^2 + bx + c$.\n\nUntuk rumus blok tengah:\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$"
                : "Tambahkan catatan ringkas, poin penting, atau petunjuk penggunaan materi ini bagi peserta..."
            }
            className="font-mono text-xs leading-relaxed bg-[var(--surface-elevated)]"
          />
        </div>
      </div>

      {/* KARTU 3: Cover Thumbnail & Pengaturan Publikasi */}
      <div className="p-5 rounded-2xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--gold)]">
          3. Cover & Pengaturan
        </h3>

        {/* Thumbnail Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Cover Thumbnail (16:9)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadThumbnail(file);
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingThumb}
              className="text-xs h-8 border-[var(--edge)]"
            >
              {uploadingThumb ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              {uploadingThumb ? "Mengunggah..." : "Unggah Gambar"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            <div className="sm:col-span-3">
              <Input
                value={form.thumbnailUrl}
                onChange={(e) => onChange("thumbnailUrl", e.target.value)}
                placeholder="https://... atau klik tombol Unggah Gambar di atas"
                className="text-xs font-mono"
              />
              <span className="text-[11px] text-[var(--ink-muted)] mt-1.5 block">
                Gunakan rasio 16:9 untuk hasil terbaik di kartu materi dan kartu rekomendasi
                belajar.
              </span>
            </div>

            <div className="sm:col-span-1 flex justify-center">
              <div className="w-32 aspect-video rounded-lg border border-[var(--edge)] bg-zinc-900 overflow-hidden relative flex items-center justify-center">
                {form.thumbnailUrl ? (
                  <img
                    src={form.thumbnailUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                ) : (
                  <span className="text-[10px] text-[var(--ink-muted)] font-mono">No Cover</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tags & Status Publikasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--edge)]/60">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Tag / Kata Kunci (Pisahkan Koma)
            </label>
            <Input
              value={form.tags}
              onChange={(e) => onChange("tags", e.target.value)}
              placeholder="aljabar, matriks, trik-cepat, snbt2026"
              className="text-xs"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] hover:border-[var(--emerald)]/40 transition-colors w-full">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => onChange("isPublished", e.target.checked)}
                className="rounded border-[var(--edge)] accent-[var(--emerald)] w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-[var(--ink)] block">
                  Tayangkan Materi Langsung
                </span>
                <span className="text-[10px] text-[var(--ink-muted)] block">
                  {form.isPublished
                    ? "Materi dapat dicari & dipelajari oleh seluruh peserta"
                    : "Materi disimpan sebagai draf privat (hanya terlihat oleh admin)"}
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
