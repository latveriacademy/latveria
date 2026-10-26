import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  utbkSubtests,
  type LibraryItemListResponse,
  type LibraryItemSummary,
} from "@latveria/shared";
import { api } from "../../../lib/api";
import { PageHeading } from "../../../components/ui/dashboard";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { LibraryFormDialog } from "./library-form-dialog";
import { LibraryPreviewDialog } from "./library-preview-dialog";
import { LibraryItemCard } from "./library-card";

export function LibraryAdminPage() {
  const [items, setItems] = useState<LibraryItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subtestFilter, setSubtestFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItemSummary | null>(null);
  const [previewItem, setPreviewItem] = useState<LibraryItemSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryItemSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("cari", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (subtestFilter !== "all") params.set("subtestSlug", subtestFilter);
      if (statusFilter !== "all")
        params.set("isPublished", statusFilter === "published" ? "true" : "false");
      params.set("limit", "50");

      const res = await api<LibraryItemListResponse>(`/admin/library?${params.toString()}`);
      setItems(res.rows);
      setTotal(res.total);
    } catch (err) {
      console.error("Gagal mengambil data library:", err);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, subtestFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: LibraryItemSummary) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleTogglePublish = async (item: LibraryItemSummary) => {
    setTogglingId(item.id);
    try {
      const res = await api<{ id: string; isPublished: boolean }>(
        `/admin/library/${item.id}/publish`,
        {
          method: "PATCH",
        },
      );
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isPublished: res.isPublished } : it)),
      );
    } catch (err) {
      console.error("Gagal toggle status publish:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/admin/library/${deleteTarget.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Gagal menghapus materi:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Library Materi"
          description="Pusat kurasi materi UTBK, modul artikel LaTeX, tautan video pembelajaran, dan referensi belajar."
        />
        <Button
          onClick={handleOpenCreate}
          className="bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-[#0b1310] font-bold shrink-0 self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tambah Materi
        </Button>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface)] space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ink-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari materi atau topik..."
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Filter Tipe */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Semua Tipe Materi</option>
              <option value="article">Artikel (Markdown & LaTeX)</option>
              <option value="video">Video Pembelajaran</option>
              <option value="link">Tautan Eksternal</option>
            </select>
          </div>

          {/* Filter Subtes */}
          <div>
            <select
              value={subtestFilter}
              onChange={(e) => setSubtestFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Semua Subtes UTBK</option>
              {utbkSubtests.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.short} - {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status & Switch View */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="all">Semua Status</option>
              <option value="published">Tayang (Published)</option>
              <option value="draft">Draf (Draft)</option>
            </select>

            <div className="flex rounded-md border border-[var(--edge)] p-0.5 bg-[var(--surface-elevated)] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-2 rounded ${
                  viewMode === "table"
                    ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Total info */}
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] pt-1 border-t border-[var(--edge)]/40">
          <span>
            Menampilkan <strong className="text-[var(--ink)]">{items.length}</strong> dari{" "}
            <strong className="text-[var(--ink)]">{total}</strong> materi
          </span>
          {(search ||
            typeFilter !== "all" ||
            subtestFilter !== "all" ||
            statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setSubtestFilter("all");
                setStatusFilter("all");
              }}
              className="text-[var(--gold)] hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[var(--ink-muted)] gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
          <p className="text-sm">Memuat koleksi library...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--edge)] bg-[var(--surface)]/50 p-8 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-[var(--gold)]/40" />
          <h3 className="text-base font-bold text-[var(--ink)]">Belum ada materi</h3>
          <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
            {search || typeFilter !== "all"
              ? "Tidak ada materi yang sesuai dengan filter pencarian."
              : "Mulai kurasi materi pembelajaran untuk membantu peserta belajar UTBK lebih terarah."}
          </p>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="mt-2 bg-[var(--gold)] text-[#0b1310] font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Buat Materi Pertama
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW DENGAN THUMBNAIL */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <LibraryItemCard
              key={item.id}
              item={item}
              isToggling={togglingId === item.id}
              onTogglePublish={handleTogglePublish}
              onPreview={setPreviewItem}
              onEdit={handleOpenEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        /* TABLE VIEW RINGKAS */
        <div className="rounded-xl border border-[var(--edge)] bg-[var(--surface)] overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--edge)] bg-[var(--surface-muted)] text-[var(--ink-muted)] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Cover</th>
                <th className="py-3 px-4">Judul Materi</th>
                <th className="py-3 px-4 w-28">Tipe</th>
                <th className="py-3 px-4 w-40">Subtes</th>
                <th className="py-3 px-4 w-24">Status</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--edge)]/60">
              {items.map((item) => {
                const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--surface-muted)]/40 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="w-12 h-8 rounded border border-[var(--edge)] bg-zinc-900 overflow-hidden relative">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--ink-muted)]">
                            No Cover
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        onClick={() => setPreviewItem(item)}
                        className="font-bold text-[var(--ink)] hover:text-[var(--gold)] cursor-pointer block truncate max-w-md"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                      {item.url && (
                        <span className="text-[10px] text-[var(--ink-muted)] block truncate max-w-sm">
                          {item.url}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.type === "video"
                            ? "bg-red-500/10 text-red-400"
                            : item.type === "article"
                              ? "bg-[var(--emerald)]/10 text-[var(--emerald)]"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--ink-muted)]">
                      {subtest ? `${subtest.short} - ${subtest.name}` : "-"}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(item)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.isPublished
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {item.isPublished ? "Tayang" : "Draf"}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--gold)]"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-red-400"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Form Tambah / Edit */}
      <LibraryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSaved={fetchItems}
      />

      {/* Dialog Preview Cepat */}
      <LibraryPreviewDialog
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      />

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Materi Library"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.title}"? Materi yang dihapus tidak dapat dipulihkan.`}
        confirmLabel="Hapus Materi"
        pending={deleting}
        pendingLabel="Menghapus..."
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
