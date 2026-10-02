import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { ArrowLeft, Plus, Settings, CheckCircle2, XCircle } from "lucide-react";
import { type QuestionPackage, type Topic } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel, PanelHeader, StatTile } from "../../components/ui/dashboard";

export function AdminSubtestPackages() {
  const { topic, initialPackages } = useLoaderData<{ topic: Topic; initialPackages: QuestionPackage[] }>();
  const [packages, setPackages] = useState<QuestionPackage[]>(initialPackages);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(packages.length + 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError("");
    try {
      const created = await api<QuestionPackage>(`/admin/subtests/${topic.slug}/packages`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, order: Number(order) }),
      });
      setPackages((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setName("");
      setDescription("");
      setOrder(packages.length + 2);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat paket.");
    } finally {
      setPending(false);
    }
  };

  const totalQuestions = packages.reduce((sum, p) => sum + p.questionCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin">
            <ArrowLeft className="size-4" />
            Kembali ke ringkasan
          </Link>
        </Button>
      </div>

      <PageHeading
        title={topic.name}
        description={`Kelola paket soal untuk subtes ${topic.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to={`/admin/soal?subtes=${topic.slug}`}>
                Lihat semua soal
              </Link>
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Tambah Paket
            </Button>
          </div>
        }
      />

      <div className="hero-metrics-grid admin-stats">
        <StatTile label="Paket Soal" value={packages.length} />
        <StatTile label="Total Soal" value={totalQuestions} />
        <StatTile label="Paket Aktif" value={packages.filter((p) => p.isActive).length} />
      </div>

      {showAddModal && (
        <Panel className="p-6 border-[var(--emerald)]">
          <PanelHeader title="Buat Paket Soal Baru" />
          <form onSubmit={handleCreatePackage} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <label htmlFor="pkg-name" className="text-sm font-medium text-[var(--ink)]">Nama Paket</label>
              <input
                id="pkg-name"
                type="text"
                placeholder="Contoh: Paket 1"
                className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="pkg-desc" className="text-sm font-medium text-[var(--ink)]">Deskripsi (opsional)</label>
              <textarea
                id="pkg-desc"
                placeholder="Deskripsi singkat materi paket ini..."
                className="min-h-20 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] p-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="pkg-order" className="text-sm font-medium text-[var(--ink)]">Urutan Tampilan</label>
              <input
                id="pkg-order"
                type="number"
                min="0"
                className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan Paket"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Daftar Paket Soal" />
        {packages.length === 0 ? (
          <div className="p-8 text-center text-[var(--soft-ink)]">
            <p>Belum ada paket soal pada subtes ini.</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Buat Paket Pertama
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--edge)]">
            {packages.map((pkg, idx) => (
              <li
                key={pkg.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[var(--surface-elevated)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] motion-fade-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg text-[var(--ink)]">{pkg.name}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono ${pkg.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-400"}`}>
                      {pkg.isActive ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      {pkg.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-[var(--soft-ink)]">{pkg.description}</p>
                  )}
                  <div className="text-xs text-[var(--soft-ink)] font-mono">
                    Urutan: {pkg.order} · {pkg.questionCount} soal
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/paket/${pkg.id}`}>
                      <Settings className="size-4" />
                      Kelola
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
