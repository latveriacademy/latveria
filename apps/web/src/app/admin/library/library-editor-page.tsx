import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  FileEdit,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  extractYouTubeVideoId,
  type LibraryItemInput,
  type LibraryItemSummary,
} from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { LibraryLivePreview } from "./library-live-preview";
import { LibraryEditorForm, type LibraryFormState } from "./library-editor-form";

const initialFormState: LibraryFormState = {
  title: "",
  slug: "",
  type: "article",
  subtestSlug: "",
  content: "",
  url: "",
  thumbnailUrl: "",
  tags: "",
  isPublished: true,
};

export function LibraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<LibraryFormState>(initialFormState);
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Responsive tab switcher for mobile/tablet screens
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Delete state for edit mode
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch initial item data if in edit mode
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function loadItem() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const item = await api<LibraryItemSummary>(`/admin/library/${id}`);
        if (!mounted) return;
        setForm({
          title: item.title,
          slug: item.slug,
          type: item.type,
          subtestSlug: item.subtestSlug ?? "",
          content: item.content ?? "",
          url: item.url ?? "",
          thumbnailUrl: item.thumbnailUrl ?? "",
          tags: (item.tags ?? []).join(", "),
          isPublished: item.isPublished,
        });
      } catch (err) {
        if (!mounted) return;
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat materi library.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadItem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleFormChange = useCallback(
    <K extends keyof LibraryFormState>(key: K, value: LibraryFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errorMsg) setErrorMsg(null);
      if (successMsg) setSuccessMsg(null);
    },
    [errorMsg, successMsg],
  );

  const handleUploadThumbnail = async (file: File) => {
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
        handleFormChange("thumbnailUrl", res.url);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunggah thumbnail cover.");
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("Judul materi wajib diisi.");
      setMobileTab("form");
      return;
    }
    if ((form.type === "video" || form.type === "link") && !form.url.trim()) {
      setErrorMsg(`Tautan ${form.type === "video" ? "YouTube" : "eksternal"} wajib diisi.`);
      setMobileTab("form");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: LibraryItemInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      type: form.type,
      subtestSlug: form.subtestSlug.trim() || null,
      content: form.content.trim() || null,
      url: form.url.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isPublished: form.isPublished,
    };

    try {
      if (isEdit && id) {
        await api(`/admin/library/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("Perubahan materi berhasil disimpan!");
      } else {
        await api("/admin/library", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setTimeout(() => {
        navigate("/admin/library");
      }, 400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan materi library.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api(`/admin/library/${id}`, { method: "DELETE" });
      navigate("/admin/library");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus materi.");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const youtubeVideoId = form.type === "video" ? extractYouTubeVideoId(form.url) : null;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[var(--ink-muted)] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-medium">Memuat data editor materi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER NAVIGASI & AKSI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--edge)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/library"
            className="p-2 rounded-xl border border-[var(--edge)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--gold)]/50 transition-colors"
            title="Kembali ke Daftar Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] mb-0.5">
              <span>Admin</span>
              <span>/</span>
              <Link to="/admin/library" className="hover:text-[var(--gold)]">
                Library
              </Link>
              <span>/</span>
              <span className="text-[var(--ink)]">{isEdit ? "Edit Materi" : "Tambah Baru"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight">
              {isEdit ? "Perbarui Materi Library" : "Buat Materi Pembelajaran Baru"}
            </h1>
          </div>
        </div>

        {/* Tombol Simpan & Status */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={saving}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
              title="Hapus materi ini"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Hapus
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/library")}
            disabled={saving}
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-[#0b1310] font-bold shadow-md px-5"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Terbitkan Materi"}
          </Button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* MOBILE TAB SWITCHER */}
      <div className="flex lg:hidden rounded-xl border border-[var(--edge)] p-1 bg-[var(--surface)] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
            mobileTab === "form"
              ? "bg-[var(--gold)]/10 text-[var(--gold)] shadow-sm"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <FileEdit className="w-4 h-4" /> Formulir Input
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
            mobileTab === "preview"
              ? "bg-[var(--gold)]/10 text-[var(--gold)] shadow-sm"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Eye className="w-4 h-4" /> Live Preview
        </button>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* KOLOM KIRI: FORMULIR INPUT */}
        <div
          className={`lg:col-span-7 space-y-6 ${mobileTab === "preview" ? "hidden lg:block" : "block"}`}
        >
          <form onSubmit={handleSave}>
            <LibraryEditorForm
              form={form}
              onChange={handleFormChange}
              uploadingThumb={uploadingThumb}
              onUploadThumbnail={handleUploadThumbnail}
            />
          </form>
        </div>

        {/* KOLOM KANAN: LIVE PREVIEW SISWA (STICKY) */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-6 space-y-3 ${
            mobileTab === "form" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[var(--gold)]" /> Pratinjau Tampilan Peserta
            </span>
            <span className="text-[11px] text-[var(--ink-muted)] font-mono">Real-time render</span>
          </div>

          <div className="rounded-2xl border border-[var(--edge)] bg-[var(--surface)] p-2 shadow-sm">
            <LibraryLivePreview
              type={form.type}
              subtestSlug={form.subtestSlug}
              isPublished={form.isPublished}
              title={form.title}
              url={form.url}
              content={form.content}
              youtubeVideoId={youtubeVideoId}
            />
          </div>
        </div>
      </div>

      {/* DIALOG KONFIRMASI HAPUS */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Materi Library?"
        description="Materi ini akan dihapus permanen dari katalog dan tidak dapat diakses lagi oleh peserta."
        confirmLabel="Ya, Hapus Permanen"
        destructive
        pending={deleting}
        pendingLabel="Menghapus..."
        onConfirm={handleDelete}
      />
    </div>
  );
}
