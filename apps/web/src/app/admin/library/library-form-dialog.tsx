import { useState, useEffect, useRef } from "react";
import { FileText, Video, ExternalLink, Upload, Loader2, Check, Eye, Sparkles } from "lucide-react";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  utbkSubtests,
  type LibraryItemInput,
  type LibraryItemSummary,
  type LibraryItemType,
} from "@latveria/shared";
import { api } from "../../../lib/api";
import { AppDialog } from "../../../components/app-dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { LibraryLivePreview } from "./library-live-preview";

interface LibraryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: LibraryItemSummary | null;
  onSaved: () => void;
}

export function LibraryFormDialog({ open, onOpenChange, item, onSaved }: LibraryFormDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<LibraryItemType>("article");
  const [subtestSlug, setSubtestSlug] = useState<string>("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSlug(item.slug);
      setType(item.type);
      setSubtestSlug(item.subtestSlug ?? "");
      setContent(item.content ?? "");
      setUrl(item.url ?? "");
      setThumbnailUrl(item.thumbnailUrl ?? "");
      setTags((item.tags ?? []).join(", "));
      setIsPublished(item.isPublished);
    } else {
      setTitle("");
      setSlug("");
      setType("article");
      setSubtestSlug("");
      setContent("");
      setUrl("");
      setThumbnailUrl("");
      setTags("");
      setIsPublished(true);
    }
    setActiveTab("edit");
    setErrorMsg(null);
  }, [item, open]);

  // Otomatis deteksi thumbnail YouTube jika URL diubah dan tipe video
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (type === "video") {
      const ytid = extractYouTubeVideoId(newUrl);
      if (ytid && !thumbnailUrl) {
        setThumbnailUrl(getYouTubeThumbnailUrl(ytid) || "");
      }
    }
  };

  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await api<{ url: string }>("/admin/library/thumbnail", {
        method: "POST",
        body: formData,
      });

      if (res.url) {
        setThumbnailUrl(res.url);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunggah thumbnail.");
    } finally {
      setUploadingThumb(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAutoYouTubeThumb = () => {
    const ytid = extractYouTubeVideoId(url);
    if (ytid) {
      setThumbnailUrl(getYouTubeThumbnailUrl(ytid) || "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Judul materi wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: LibraryItemInput = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      type,
      subtestSlug: subtestSlug.trim() || null,
      content: content.trim() || null,
      url: url.trim() || null,
      thumbnailUrl: thumbnailUrl.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isPublished,
    };

    try {
      if (item?.id) {
        await api(`/admin/library/${item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/admin/library", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      onOpenChange(false);
      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan materi.");
    } finally {
      setSaving(false);
    }
  };

  const youtubeVideoId = type === "video" ? extractYouTubeVideoId(url) : null;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit Materi Library" : "Tambah Materi Baru"}
      description="Kelola modul pembelajaran, artikel LaTeX, tautan video, atau referensi UTBK."
      className="max-w-3xl"
    >
      <div className="flex border-b border-[var(--edge)] mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "edit"
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Form Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "preview"
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Eye className="w-4 h-4" /> Live Preview
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {activeTab === "edit" ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                Judul Materi *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Trik Penalaran Kuantitatif: Aljabar Cepat"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                Tipe Materi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "article",
                    label: "Artikel",
                    icon: FileText,
                    cls: "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]",
                  },
                  {
                    id: "video",
                    label: "Video",
                    icon: Video,
                    cls: "border-red-500 bg-red-500/10 text-red-400",
                  },
                  {
                    id: "link",
                    label: "Tautan",
                    icon: ExternalLink,
                    cls: "border-amber-500 bg-amber-500/10 text-amber-400",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as LibraryItemType)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold border transition-all ${
                      type === t.id
                        ? t.cls
                        : "border-[var(--edge)] text-[var(--ink-muted)] hover:border-[var(--gold)]/40"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                Kaitan Subtes UTBK
              </label>
              <select
                value={subtestSlug}
                onChange={(e) => setSubtestSlug(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[var(--edge)] bg-[var(--surface-elevated)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--gold)]"
              >
                <option value="">-- Umum / Tanpa Subtes Tertentu --</option>
                {utbkSubtests.map((st) => (
                  <option key={st.slug} value={st.slug}>
                    {st.short} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                Slug URL (Opsional)
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Dibuat otomatis bila dikosongkan"
              />
            </div>
          </div>

          {(type === "video" || type === "link") && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                {type === "video" ? "Tautan Video YouTube *" : "Tautan Eksternal *"}
              </label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    type === "video"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://drive.google.com/... atau tautan situs"
                  }
                  required
                />
                {type === "video" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoYouTubeThumb}
                    title="Ambil thumbnail dari YouTube"
                    className="shrink-0 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--gold)]" /> Auto Thumb
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pengaturan Thumbnail */}
          <div className="p-3.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
                Cover / Thumbnail Gambar
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUploadThumbnail}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingThumb}
                className="text-xs h-7"
              >
                {uploadingThumb ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                Upload Gambar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="md:col-span-2">
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="URL gambar thumbnail (https://...)"
                  className="text-xs"
                />
                <span className="text-[11px] text-[var(--ink-muted)] mt-1 block">
                  Unggah file gambar atau masukkan tautan gambar cover secara manual.
                </span>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="w-28 h-16 rounded border border-[var(--edge)] overflow-hidden bg-[var(--surface)] flex items-center justify-center relative">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='60'><rect width='100%' height='100%' fill='%23222'/><text x='50%' y='50%' fill='%23666' text-anchor='middle' dy='.3em' font-size='10'>Error</text></svg>";
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-[var(--ink-muted)]">No Cover</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                {type === "article"
                  ? "Isi Artikel (Markdown & LaTeX)"
                  : "Ringkasan / Catatan Materi"}
              </label>
              <span className="text-[11px] text-[var(--ink-muted)]">
                Dukungan LaTeX inline <code>$x^2$</code> & display <code>$$...$$</code>
              </span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={type === "article" ? 8 : 4}
              placeholder={
                type === "article"
                  ? "Tulis isi materi di sini...\nGunakan $f(x) = ax + b$ untuk formula matematika inline."
                  : "Tambahkan catatan penjelas atau panduan singkat..."
              }
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                Tag / Topik (pisahkan dengan koma)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="aljabar, matriks, snbt2026"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-[var(--edge)] accent-[var(--emerald)] w-4 h-4"
                />
                Publikasikan materi ini sekarang
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--edge)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-[#0b1310] font-bold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              {item ? "Simpan Perubahan" : "Buat Materi"}
            </Button>
          </div>
        </form>
      ) : (
        <LibraryLivePreview
          type={type}
          subtestSlug={subtestSlug}
          isPublished={isPublished}
          title={title}
          url={url}
          content={content}
          youtubeVideoId={youtubeVideoId}
        />
      )}
    </AppDialog>
  );
}
