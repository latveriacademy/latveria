import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { ArrowLeft, Plus, Settings, CheckCircle2, XCircle } from "lucide-react";
import { type QuestionPackage, type Topic } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { PageHeading, Panel, PanelHeader, StatTile } from "../../../components/ui/dashboard";
import styles from "./packages.module.css";

export function AdminSubtestPackages() {
  const { topic, initialPackages } = useLoaderData<{
    topic: Topic;
    initialPackages: QuestionPackage[];
  }>();
  const navigate = useNavigate();
  const packages = initialPackages;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(Math.max(0, ...packages.map((pkg) => pkg.order)) + 1);
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
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          order: Number(order),
        }),
      });
      navigate(`/admin/paket/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat paket.");
    } finally {
      setPending(false);
    }
  };

  const totalQuestions = packages.reduce((sum, p) => sum + p.questionCount, 0);

  return (
    <div className={styles.page}>
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
        description="Buat paket, isi dengan soal, lalu atur apakah paket tampil kepada peserta."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to={`/admin/soal?subtes=${topic.slug}`}>Lihat semua soal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/admin/soal/impor?subtes=${topic.slug}`}>Impor JSON</Link>
            </Button>
            <Button onClick={() => setShowCreateForm(true)}>
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

      {showCreateForm && (
        <Panel className="p-6 border-[var(--emerald)]">
          <PanelHeader title="Buat Paket Soal Baru" />
          <form onSubmit={handleCreatePackage} className={styles.settingsForm}>
            <fieldset disabled={pending} className={styles.fields}>
              <div className="grid gap-2">
                <label htmlFor="pkg-name" className="text-sm font-medium text-[var(--ink)]">
                  Nama Paket
                </label>
                <input
                  id="pkg-name"
                  type="text"
                  placeholder="Contoh: Paket 1"
                  className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="pkg-desc" className="text-sm font-medium text-[var(--ink)]">
                  Deskripsi (opsional)
                </label>
                <textarea
                  id="pkg-desc"
                  placeholder="Deskripsi singkat materi paket ini..."
                  className="min-h-20 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] p-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="pkg-order" className="text-sm font-medium text-[var(--ink)]">
                  Urutan Tampilan
                </label>
                <input
                  id="pkg-order"
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
                <p className={styles.help}>
                  Angka yang lebih kecil tampil lebih dahulu. Setelah dibuat, kamu bisa mengisi soal
                  atau impor JSON.
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Membuat…" : "Buat paket dan isi soal"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Batal
                </Button>
              </div>
            </fieldset>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Daftar Paket Soal" />
        {packages.length === 0 ? (
          <div className="p-8 text-center text-[var(--soft-ink)]">
            <p>Belum ada paket soal pada subtes ini.</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              <Plus className="size-4" />
              Buat Paket Pertama
            </Button>
          </div>
        ) : (
          <ul className={styles.packageList}>
            {packages.map((pkg, index) => (
              <li
                key={pkg.id}
                className="motion-fade-up transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3>{pkg.name}</h3>
                    <span className={styles.status}>
                      {pkg.isActive ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      {pkg.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-[var(--soft-ink)]">{pkg.description}</p>
                  )}
                  <div className={styles.help}>
                    {pkg.questionCount} soal · Urutan {pkg.order}
                    {pkg.questionCount === 0 ? " · Belum berisi soal" : ""}
                  </div>
                </div>
                <div className={styles.toolbar}>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/soal/impor?subtes=${topic.slug}&paket=${pkg.id}`}>
                      Impor JSON
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/paket/${pkg.id}`}>
                      <Settings className="size-4" />
                      Kelola soal
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
