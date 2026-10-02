import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { ArrowLeft, Save, Trash2, Plus, MoveRight, LogOut } from "lucide-react";
import { type PackageDetail, type QuestionPackage } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel, PanelHeader, StatTile } from "../../components/ui/dashboard";
import { MathText } from "../../components/math-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

type LoaderData = {
  pkg: PackageDetail;
  otherPackages: QuestionPackage[];
  availableQuestions: { id: string; prompt: string; category: string | null; packageName: string | null }[];
};

export function AdminPackageDetail() {
  const { pkg: initialPkg, otherPackages, availableQuestions: initialAvailable } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<PackageDetail>(initialPkg);
  const [availableQuestions, setAvailableQuestions] = useState(initialAvailable);
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description ?? "");
  const [order, setOrder] = useState(pkg.order);
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [settingsPending, setSettingsPending] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedAddQuestionId, setSelectedAddQuestionId] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState("");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsPending(true);
    setSettingsMessage("");
    try {
      const updated = await api<QuestionPackage>(`/admin/packages/${pkg.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, order: Number(order), isActive }),
      });
      setPkg((prev) => ({ ...prev, ...updated }));
      setSettingsMessage("Pengaturan paket berhasil disimpan.");
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSettingsPending(false);
    }
  };

  const handleDeletePackage = async () => {
    setDeletePending(true);
    setDeleteError("");
    try {
      await api(`/admin/packages/${pkg.id}`, { method: "DELETE" });
      navigate(`/admin/subtes/${pkg.topicSlug}`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus paket.");
      setDeletePending(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedAddQuestionId) return;
    setAddPending(true);
    setActionMessage("");
    try {
      await api(`/admin/packages/${pkg.id}/questions`, {
        method: "POST",
        body: JSON.stringify({ questionId: selectedAddQuestionId }),
      });
      const added = availableQuestions.find((q) => q.id === selectedAddQuestionId);
      if (added) {
        setPkg((prev) => ({
          ...prev,
          questionCount: prev.questionCount + 1,
          questions: [...prev.questions, { id: added.id, prompt: added.prompt, category: added.category, source: "Bank Soal", usage: 0 }],
        }));
        setAvailableQuestions((prev) => prev.filter((q) => q.id !== selectedAddQuestionId));
        setSelectedAddQuestionId("");
        setActionMessage("Soal berhasil dimasukkan ke dalam paket.");
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Gagal menambahkan soal.");
    } finally {
      setAddPending(false);
    }
  };

  const handleMoveQuestion = async (questionId: string) => {
    const targetPkgId = moveTargets[questionId];
    if (!targetPkgId) return;
    setActionMessage("");
    try {
      await api(`/admin/questions/${questionId}/package`, {
        method: "PUT",
        body: JSON.stringify({ packageId: targetPkgId }),
      });
      setPkg((prev) => ({
        ...prev,
        questionCount: Math.max(0, prev.questionCount - 1),
        questions: prev.questions.filter((q) => q.id !== questionId),
      }));
      setActionMessage("Soal berhasil dipindahkan.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Gagal memindahkan soal.");
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    setActionMessage("");
    try {
      await api(`/admin/packages/${pkg.id}/questions/${questionId}`, { method: "DELETE" });
      const removed = pkg.questions.find((q) => q.id === questionId);
      setPkg((prev) => ({
        ...prev,
        questionCount: Math.max(0, prev.questionCount - 1),
        questions: prev.questions.filter((q) => q.id !== questionId),
      }));
      if (removed) {
        setAvailableQuestions((prev) => [...prev, { id: removed.id, prompt: removed.prompt, category: removed.category, packageName: null }]);
      }
      setActionMessage("Soal dikeluarkan dari paket.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Gagal mengeluarkan soal.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/subtes/${pkg.topicSlug}`}>
            <ArrowLeft className="size-4" />
            Kembali ke {pkg.topicName}
          </Link>
        </Button>
      </div>

      <PageHeading
        title={`${pkg.topicName} / ${pkg.name}`}
        description={`${pkg.questionCount} soal dalam paket ini`}
        actions={
          <Button asChild>
            <Link to={`/admin/soal/baru?subtes=${pkg.topicSlug}`}>
              <Plus className="size-4" />
              Buat Soal Baru
            </Link>
          </Button>
        }
      />

      <div className="hero-metrics-grid admin-stats">
        <StatTile label="Total Soal" value={pkg.questionCount} />
        <StatTile label="Status" value={pkg.isActive ? "Aktif" : "Nonaktif"} />
        <StatTile label="Urutan" value={pkg.order} />
      </div>

      {actionMessage && (
        <p className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-sm font-medium" role="status">
          {actionMessage}
        </p>
      )}

      {/* Edit Settings Panel */}
      <Panel>
        <PanelHeader title="Pengaturan Paket" />
        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-[var(--ink)]">Nama Paket</label>
              <input
                id="name"
                className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="order" className="text-sm font-medium text-[var(--ink)]">Urutan</label>
              <input
                id="order"
                type="number"
                min="0"
                className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium text-[var(--ink)]">Deskripsi</label>
            <textarea
              id="description"
              className="min-h-20 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] p-3 rounded-md focus:border-[var(--emerald)] focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="isActive"
              type="checkbox"
              className="size-4 accent-[var(--emerald)] cursor-pointer"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-[var(--ink)] cursor-pointer">
              Aktifkan paket untuk latihan peserta
            </label>
          </div>
          {settingsMessage && <p className="text-sm text-[var(--emerald)] font-medium">{settingsMessage}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <Button type="submit" disabled={settingsPending}>
              <Save className="size-4" />
              {settingsPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-500">Hapus paket ini?</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Batal</Button>
                <Button type="button" size="sm" disabled={deletePending} onClick={handleDeletePackage}>
                  <Trash2 className="size-4" />
                  {deletePending ? "Menghapus..." : "Ya, Hapus Paket"}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
                Hapus Paket
              </Button>
            )}
          </div>
          {deleteError && <p className="text-sm text-red-500 font-medium" role="alert">{deleteError}</p>}
        </form>
      </Panel>

      {/* Add Question to this Package */}
      {availableQuestions.length > 0 && (
        <Panel className="p-6">
          <PanelHeader title="Tambahkan Soal ke Paket Ini" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[280px]">
              <Select value={selectedAddQuestionId} onValueChange={setSelectedAddQuestionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih soal dari subtes ini yang belum masuk paket..." />
                </SelectTrigger>
                <SelectContent>
                  {availableQuestions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.prompt.length > 80 ? `${q.prompt.slice(0, 80)}…` : q.prompt}
                      {q.packageName ? ` (saat ini: ${q.packageName})` : " (tanpa paket)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!selectedAddQuestionId || addPending} onClick={handleAddQuestion}>
              <Plus className="size-4" />
              {addPending ? "Menambahkan..." : "Tambahkan Soal"}
            </Button>
          </div>
        </Panel>
      )}

      {/* Questions List */}
      <Panel>
        <PanelHeader title={`Daftar Soal (${pkg.questions.length} Soal)`} />
        {pkg.questions.length === 0 ? (
          <div className="p-8 text-center text-[var(--soft-ink)]">
            <p>Belum ada soal dalam paket ini.</p>
          </div>
        ) : (
          <ol className="divide-y divide-[var(--edge)]">
            {pkg.questions.map((q, idx) => (
              <li
                key={q.id}
                className="p-4 space-y-3 motion-fade-up transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--emerald)] shrink-0 pt-0.5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-[var(--ink)] text-sm">
                        <MathText>{q.prompt}</MathText>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--soft-ink)] font-mono">
                        {q.category && <span>Kategori: {q.category}</span>}
                        {q.usage > 0 && <span>· Dipakai: {q.usage} kali</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/soal/${q.id}`}>
                        Lihat Soal
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Move / Remove action row */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
                  {otherPackages.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--soft-ink)]">Pindahkan ke:</span>
                      <Select
                        value={moveTargets[q.id] ?? ""}
                        onValueChange={(val) => setMoveTargets((prev) => ({ ...prev, [q.id]: val }))}
                      >
                        <SelectTrigger className="h-8 text-xs min-w-[120px]">
                          <SelectValue placeholder="Pilih paket" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherPackages.map((other) => (
                            <SelectItem key={other.id} value={other.id}>
                              {other.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2"
                        disabled={!moveTargets[q.id]}
                        onClick={() => handleMoveQuestion(q.id)}
                      >
                        <MoveRight className="size-3" />
                        Pindah
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveQuestion(q.id)}
                  >
                    <LogOut className="size-3" />
                    Keluarkan
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
