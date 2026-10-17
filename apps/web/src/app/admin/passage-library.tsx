import { useState, useEffect } from "react";
import { Edit3, Eye, FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { PassageLibraryDetail } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PageHeading } from "../../components/ui/dashboard";
import { AppDialog } from "../../components/app-dialog";
import { ConfirmDialog } from "../../components/confirm-dialog";
import styles from "./admin.module.css";

interface PassageRow {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  isArchived: boolean;
  usedInQuestionsCount: number;
  createdAt: string;
}

export function PassageLibraryPage() {
  const [passages, setPassages] = useState<PassageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPassage, setSelectedPassage] = useState<PassageLibraryDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPassages = async () => {
    setLoading(true);
    try {
      const data = await api<{ rows: PassageRow[] }>(
        `/admin/passages${search ? `?cari=${encodeURIComponent(search)}` : ""}`,
      );
      setPassages(data.rows);
    } catch {
      setErrorMsg("Gagal memuat daftar stimulus passage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassages();
  }, [search]);

  const openCreate = () => {
    setEditId(null);
    setFormTitle("");
    setFormContent("");
    setFormTags("");
    setErrorMsg(null);
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    setLoading(true);
    try {
      const data = await api<PassageLibraryDetail>(`/admin/passages/${id}`);
      setEditId(id);
      setFormTitle(data.title);
      setFormContent(data.content ?? "");
      setFormTags((data.tags ?? []).join(", "));
      setErrorMsg(null);
      setFormOpen(true);
    } catch {
      setErrorMsg("Gagal memuat detail passage.");
    } finally {
      setLoading(false);
    }
  };

  const openViewDetail = async (id: string) => {
    try {
      const data = await api<PassageLibraryDetail>(`/admin/passages/${id}`);
      setSelectedPassage(data);
    } catch {
      setErrorMsg("Gagal memuat detail passage.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim() || null,
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editId) {
        await api(`/admin/passages/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/admin/passages", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setFormOpen(false);
      fetchPassages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan stimulus.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api(`/admin/passages/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      fetchPassages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus passage.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className={styles.bankPage}>
      <PageHeading
        title="Stimulus & Passage Library"
        description="Kelola teks wacana, stimulus bersama, dan periksa soal yang bergantung padanya."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            Tambah Stimulus
          </Button>
        }
      />

      {errorMsg && (
        <div className="my-2 rounded border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-xs text-[var(--error)]">
          {errorMsg}
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul stimulus..."
            className="pl-8 text-xs"
          />
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--soft-ink)]" />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
        </div>
      )}

      {!loading && passages.length === 0 && (
        <div className="py-12 text-center text-xs text-[var(--soft-ink)]">
          Belum ada stimulus passage yang tersimpan.
        </div>
      )}

      {!loading && passages.length > 0 && (
        <div className="rounded border border-[var(--edge)] bg-[var(--surface)] overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--edge)] text-[11px] font-mono uppercase text-[var(--soft-ink)]">
              <tr>
                <th className="p-3">Judul Stimulus</th>
                <th className="p-3">Cuplikan Konten</th>
                <th className="p-3 text-center">Dipakai Soal</th>
                <th className="p-3">Tanggal Dibuat</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--edge)]">
              {passages.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--surface-elevated)]">
                  <td className="p-3 font-medium text-[var(--ink)]">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-[var(--gold)]" />
                      <span>{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[var(--soft-ink)] max-w-[280px] truncate">
                    {p.content || "Stimulus terstruktur (blocks)"}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-[var(--gold)]">
                    {p.usedInQuestionsCount} soal
                  </td>
                  <td className="p-3 text-[var(--soft-ink)] text-[11px]">
                    {new Date(p.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openViewDetail(p.id)}
                      >
                        <Eye className="size-3 mr-1" />
                        Lihat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openEdit(p.id)}
                      >
                        <Edit3 className="size-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[var(--error)]"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <AppDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editId ? "Edit Stimulus Passage" : "Tambah Stimulus Passage Baru"}
        className="max-w-[560px]"
      >
        <form onSubmit={handleSave} className="space-y-3 py-2 text-xs">
          <div>
            <label className="block font-medium mb-1 text-[var(--ink)]">
              Judul Wacana / Stimulus
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              maxLength={300}
              placeholder="Contoh: Wacana Ekologi Mangrove dan Perubahan Iklim"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-[var(--ink)]">
              Isi Wacana (Teks Lengkap / Markdown)
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={8}
              className="w-full rounded border border-[var(--edge)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)]"
              placeholder="Tuliskan teks stimulus bacaan..."
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-[var(--ink)]">
              Tag (pisahkan dengan koma)
            </label>
            <Input
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="ekologi, biologi, sains"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--edge)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={saving || !formTitle.trim()}>
              {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Simpan Stimulus
            </Button>
          </div>
        </form>
      </AppDialog>

      {/* Detail Dialog */}
      {selectedPassage && (
        <AppDialog
          open
          onOpenChange={(open) => !open && setSelectedPassage(null)}
          title={selectedPassage.title}
          className="max-w-[640px]"
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="max-h-[200px] overflow-y-auto rounded border border-[var(--edge)] bg-[var(--surface)] p-3 text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {selectedPassage.content || "(Tidak ada konten teks mentah)"}
            </div>

            <div>
              <strong className="block font-semibold text-[var(--ink)] mb-1.5">
                Daftar Soal yang Menggunakan Stimulus Ini ({selectedPassage.usedInQuestions.length}
                ):
              </strong>
              {selectedPassage.usedInQuestions.length === 0 ? (
                <p className="text-[var(--soft-ink)] italic">
                  Belum ada soal yang ditautkan ke stimulus ini.
                </p>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {selectedPassage.usedInQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded border border-[var(--edge)] bg-[var(--surface-elevated)] p-2 text-xs"
                    >
                      <span className="line-clamp-1 max-w-[75%] text-[var(--ink)]">{q.prompt}</span>
                      <a
                        href={`/admin/soal/${q.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono text-[var(--gold)] underline"
                      >
                        Buka Soal
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AppDialog>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Hapus Stimulus Passage?"
        description="Stimulus ini akan dihapus dari perpustakaan. Pastikan tidak ada soal aktif yang bergantung padanya."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
