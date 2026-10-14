import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Plus,
  Trophy,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { api } from "../../../lib/api";
import { PageHeading, Panel } from "../../../components/ui/dashboard";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import type { AdminTryoutItem } from "@latveria/shared";

type TryoutItem = AdminTryoutItem;

export function AdminTryouts() {
  const [tryouts, setTryouts] = useState<TryoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetYear, setTargetYear] = useState("2026");

  const [deleteTarget, setDeleteTarget] = useState<TryoutItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTryouts = async () => {
    setLoading(true);
    try {
      const data = await api<TryoutItem[]>("/admin/tryouts");
      setTryouts(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar tryout.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTryouts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api("/admin/tryouts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          targetYear: targetYear ? Number(targetYear) : 2026,
          published: false,
        }),
      });
      setCreateOpen(false);
      setName("");
      setDescription("");
      await loadTryouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat paket tryout.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/admin/tryouts/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadTryouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus paket tryout.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Manajemen Tryout"
        description="Buat dan kelola simulasi UTBK-SNBT lengkap per subtes beserta alokasi durasinya."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/tryouts/kalibrasi">Kalibrasi IRT</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="btn-gold-solid">
              <Plus size={16} /> Buat Tryout Baru
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-[var(--crimson)]/50 bg-[var(--crimson)]/10 p-4 font-mono text-sm text-[var(--crimson)]">
          {error}
        </div>
      )}

      {loading ? (
        <Panel className="p-8 text-center font-mono text-sm text-[var(--soft-ink)]">
          Memuat paket tryout...
        </Panel>
      ) : tryouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--edge)] p-12 text-center">
          <h3 className="font-serif text-lg font-bold text-[var(--ink)] mb-1">
            Belum Ada Paket Tryout
          </h3>
          <p className="font-serif text-sm text-[var(--soft-ink)] mb-4">
            Buat paket tryout pertama untuk mengaktifkan simulasi UTBK dengan 7 subtes.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="btn-gold-solid">
            <Plus size={16} /> Buat Tryout Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tryouts.map((item) => (
            <Panel
              key={item.id}
              className="flex flex-col justify-between border border-[var(--edge)] bg-[var(--surface-elevated)] p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)] leading-snug">
                    {item.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border border-[var(--edge)] bg-[var(--surface-muted)]">
                    {item.published ? (
                      <span className="flex items-center gap-1 text-[var(--emerald)]">
                        <CheckCircle2 size={12} /> Publik
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--soft-ink)]">
                        <XCircle size={12} /> Draf
                      </span>
                    )}
                  </span>
                </div>
                {item.description && (
                  <p className="font-serif text-xs text-[var(--soft-ink)] line-clamp-2 mb-4">
                    {item.description}
                  </p>
                )}
                <div className="space-y-1.5 font-mono text-xs text-[var(--soft-ink)] mb-4">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-[var(--gold)]" />
                    <span>{item.sectionCount} Subtes Terkonfigurasi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[var(--gold)]" />
                    <span>{item.questionCount} Total Soal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--gold)]" />
                    <span>{item.durationMinutes} Menit Alokasi Total</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--edge)] pt-4 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--crimson)] hover:bg-[var(--crimson)]/10"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`Hapus tryout ${item.name}`}
                >
                  <Trash2 size={14} />
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/tryouts/${item.id}`} className="flex items-center gap-1.5">
                    Kelola Subtes <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Dialog Buat Tryout */}
      <AppDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Buat Paket Tryout Baru"
        description="Saat dibuat, sistem akan otomatis menyiapkan 7 subtes standar SNPMB 2026."
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="tryout-name"
              className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Nama Paket Tryout *
            </label>
            <input
              id="tryout-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tryout Akbar UTBK-SNBT 2026 Jilid 1"
              className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="tryout-description"
              className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Deskripsi Singkat
            </label>
            <textarea
              id="tryout-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Keterangan tryout, target peserta, dan petunjuk umum."
              className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tryout-year"
                className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
              >
                Tahun Target
              </label>
              <input
                id="tryout-year"
                type="number"
                min={2020}
                max={2100}
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
              />
            </div>
            <p className="text-sm text-[var(--soft-ink)]">
              Tryout dibuat sebagai draf. Isi soal setiap subtes sebelum dipublikasikan.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--edge)]">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={creating || !name.trim()} className="btn-gold-solid">
              {creating ? "Membuat..." : "Simpan & Buat Subtes"}
            </Button>
          </div>
        </form>
      </AppDialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Paket Tryout?"
        description={`Paket "${deleteTarget?.name}" beserta section dan relasi soalnya akan dihapus. Paket yang memiliki soal asal atau riwayat peserta tidak dapat dihapus; nonaktifkan melalui pengaturan paket.`}
        destructive
        error={error}
        confirmLabel="Hapus Permanen"
        pending={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
