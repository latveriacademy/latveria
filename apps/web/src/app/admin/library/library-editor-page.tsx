import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Eye,
  FileEdit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
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
  materialUrl: "",
  materialTitle: "",
  tags: [],
  isPublished: true,
};

export function LibraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<LibraryFormState>(initialFormState);
  const [initialLoadedForm, setInitialLoadedForm] = useState<LibraryFormState>(initialFormState);
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Responsive tab switcher for mobile/tablet screens
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Delete state for edit mode
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Unsaved changes dirty checker
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialLoadedForm);
  }, [form, initialLoadedForm]);

  // Warn user on window unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
        const loaded: LibraryFormState = {
          title: item.title,
          slug: item.slug,
          type: item.type,
          subtestSlug: item.subtestSlug ?? "",
          content: item.content ?? "",
          url: item.url ?? "",
          thumbnailUrl: item.thumbnailUrl ?? "",
          materialUrl: item.metadata?.materialUrl ?? "",
          materialTitle: item.metadata?.materialTitle ?? "",
          tags: item.tags ?? [],
          isPublished: item.isPublished,
        };
        setForm(loaded);
        setInitialLoadedForm(loaded);
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
      throw err;
    } finally {
      setUploadingThumb(false);
    }
  };

  // Validation
  const slugError = useMemo(() => {
    if (!form.slug.trim()) return null;
    const isValid = /^[a-z0-9-]+$/.test(form.slug.trim());
    return isValid
      ? null
      : "Slug hanya boleh berisi huruf kecil (a-z), angka (0-9), dan tanda hubung (-).";
  }, [form.slug]);

  const urlError = useMemo(() => {
    if (form.type === "article") return null;
    if (!form.url.trim()) return "Tautan wajib diisi untuk tipe ini.";
    try {
      const parsed = new URL(form.url);
      if (!parsed.protocol.startsWith("http")) {
        return "Tautan harus diawali dengan https:// atau http://";
      }
    } catch {
      return "Format URL tidak valid. Pastikan menyertakan https://";
    }
    if (form.type === "video") {
      const ytid = extractYouTubeVideoId(form.url);
      if (!ytid) return "URL harus berupa tautan video YouTube yang valid.";
    }
    return null;
  }, [form.type, form.url]);

  const materialUrlError = useMemo(() => {
    if (!form.materialUrl.trim()) return null;
    try {
      const parsed = new URL(form.materialUrl);
      if (!parsed.protocol.startsWith("http")) {
        return "Tautan materi harus diawali dengan https:// atau http://";
      }
      return null;
    } catch {
      return "Format URL materi tidak valid. Pastikan menyertakan https://";
    }
  }, [form.materialUrl]);

  const handleSave = async (overridePublish?: boolean) => {
    if (!form.title.trim()) {
      setErrorMsg("Judul materi wajib diisi.");
      setMobileTab("form");
      return;
    }
    if (slugError) {
      setErrorMsg(slugError);
      setMobileTab("form");
      return;
    }
    if (urlError) {
      setErrorMsg(urlError);
      setMobileTab("form");
      return;
    }
    if (materialUrlError) {
      setErrorMsg(materialUrlError);
      setMobileTab("form");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const publishStatus = overridePublish !== undefined ? overridePublish : form.isPublished;

    const payload: LibraryItemInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      type: form.type,
      subtestSlug: form.subtestSlug.trim() || null,
      content: form.content.trim() || null,
      url: form.url.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      materialUrl: form.materialUrl.trim() || null,
      materialTitle: form.materialTitle.trim() || null,
      tags: form.tags,
      isPublished: publishStatus,
      metadata: {
        materialUrl: form.materialUrl.trim() || null,
        materialTitle: form.materialTitle.trim() || null,
      },
    };

    try {
      if (isEdit && id) {
        await api(`/admin/library/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("Materi berhasil diperbarui!");
      } else {
        await api("/admin/library", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("Materi baru berhasil disimpan!");
      }

      setInitialLoadedForm({ ...form, isPublished: publishStatus });
      setLastSavedAt(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      );

      setTimeout(() => {
        navigate("/admin/library");
      }, 500);
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
        <p className="text-sm font-medium">Memuat editor materi library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28">
      {/* HEADER NAVIGASI & AKSI ATAS */}
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
                Library Materi
              </Link>
              <span>/</span>
              <span className="text-[var(--ink)] font-medium">
                {isEdit ? "Edit Materi" : "Buat Materi Baru"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight">
                {isEdit ? "Perbarui Materi Library" : "Buat Materi Pembelajaran Baru"}
              </h1>
              {isDirty ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Belum disimpan
                </span>
              ) : lastSavedAt ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Tersimpan {lastSavedAt}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Tombol Simpan Header */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={saving}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 text-xs"
              title="Hapus materi ini"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="text-xs border-[var(--edge)] hover:border-zinc-500"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-zinc-400" /> Simpan Draf
          </Button>

          <Button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-[#0b1310] font-bold shadow-md px-4 text-xs"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1.5" />
            )}
            {saving ? "Menyimpan..." : "Terbitkan Materi"}
          </Button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
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
          <Eye className="w-4 h-4" /> Pratinjau Langsung
        </button>
      </div>

      {/* WORKSPACE DUA KOLOM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* KOLOM KIRI: FORMULIR INPUT */}
        <div
          className={`lg:col-span-7 space-y-6 min-w-0 ${mobileTab === "preview" ? "hidden lg:block" : "block"}`}
        >
          <LibraryEditorForm
            form={form}
            onChange={handleFormChange}
            uploadingThumb={uploadingThumb}
            onUploadThumbnail={handleUploadThumbnail}
            slugError={slugError}
            urlError={urlError}
            materialUrlError={materialUrlError}
          />
        </div>

        {/* KOLOM KANAN: PRATINJAU LANGSUNG (STICKY DI DESKTOP) */}
        <div
          className={`lg:col-span-5 min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] space-y-3 ${
            mobileTab === "form" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[var(--gold)]" /> Pratinjau Tampilan Peserta
            </span>
            <span className="text-[11px] text-[var(--ink-muted)] font-mono">Render Otomatis</span>
          </div>

          <div className="rounded-2xl border border-[var(--edge)] bg-[var(--surface)] p-2 shadow-sm">
            <LibraryLivePreview
              type={form.type}
              subtestSlug={form.subtestSlug}
              isPublished={form.isPublished}
              title={form.title}
              url={form.url}
              content={form.content}
              thumbnailUrl={form.thumbnailUrl}
              tags={form.tags}
              youtubeVideoId={youtubeVideoId}
              materialUrl={form.materialUrl}
              materialTitle={form.materialTitle}
            />
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION BAR (SELALU TERLIHAT) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--edge)] py-3.5 px-4 sm:px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${form.isPublished ? "bg-emerald-400" : "bg-zinc-400"}`}
            />
            <span className="text-xs text-[var(--ink-muted)] hidden sm:inline">
              Mode Simpan:{" "}
              <strong className="text-[var(--ink)]">
                {form.isPublished ? "Tayang Publik" : "Draf Privat"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/library")}
              disabled={saving}
              className="text-xs"
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-xs border-[var(--edge)] hover:border-zinc-500"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-zinc-400" /> Simpan Draf
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-[#0b1310] font-bold shadow-md px-5 text-xs"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              {saving ? "Menyimpan..." : isEdit ? "Perbarui & Tayangkan" : "Terbitkan Materi"}
            </Button>
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
