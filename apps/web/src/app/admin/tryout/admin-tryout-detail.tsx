import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Plus,
  Clock,
  Layers,
  Upload,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AdminTryoutDetail } from "@latveria/shared";
import { api } from "../../../lib/api";
import { PageHeading, Panel } from "../../../components/ui/dashboard";
import { Button } from "../../../components/ui/button";
import { AppDialog } from "../../../components/app-dialog";
import { TryoutQuestionTable } from "./tryout-question-table";
import { DeleteTryoutSection } from "./delete-tryout-section";

type TryoutDetailData = AdminTryoutDetail;

export function AdminTryoutDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TryoutDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Add section dialog
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSubtestCode, setNewSubtestCode] = useState("PU");
  const [newTitle, setNewTitle] = useState("Penalaran Umum");
  const [newDurationMin, setNewDurationMin] = useState("30");

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api<TryoutDetailData>(`/admin/tryouts/${id}`);
      setData(res);
      setError("");
      if (!expandedSection && res.sections.length > 0) {
        setExpandedSection(res.sections[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail tryout.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api(`/admin/tryouts/${id}/sections`, {
        method: "POST",
        body: JSON.stringify({
          subtestCode: newSubtestCode,
          title: newTitle,
          durationSeconds: Number(newDurationMin) * 60,
          sectionOrder: Math.max(0, ...(data?.sections.map((s) => s.sectionOrder) ?? [])) + 1,
        }),
      });
      setAddSectionOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah subtes.");
    }
  };

  const handleTogglePublished = async () => {
    if (!id || !data) return;
    try {
      await api(`/admin/tryouts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ published: !data.published }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status publish.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-sm text-[var(--soft-ink)]">
        Memuat detail tryout...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center font-mono text-sm text-[var(--crimson)]">
        {error || "Tryout tidak ditemukan."}
      </div>
    );
  }

  const totalQuestions = data.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const totalMinutes = Math.round(data.totalDurationSeconds / 60);

  return (
    <>
      <PageHeading
        title={data.name}
        description={data.description || "Konfigurasi subtes dan bank soal simulasi UTBK-SNBT."}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/tryouts">
                <ArrowLeft size={16} /> Daftar Tryout
              </Link>
            </Button>
            <Button
              variant={data.published ? "default" : "outline"}
              onClick={handleTogglePublished}
              className={data.published ? "bg-[var(--emerald)] text-black" : ""}
            >
              {data.published ? "Publik (Aktif)" : "Draf (Nonaktif)"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded border border-[var(--crimson)]/50 bg-[var(--crimson)]/10 p-3 font-mono text-sm text-[var(--crimson)]">
          {error}
        </div>
      )}

      {/* Meta Bar */}
      <Panel className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-[var(--edge)] bg-[var(--surface-elevated)] p-4">
        <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-[var(--soft-ink)]">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[var(--gold)]" />
            <span>{data.sections.length} Subtes</span>
          </div>
          <div className="flex items-center gap-2">
            <FileQuestion size={15} className="text-[var(--gold)]" />
            <span>{totalQuestions} Total Soal</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[var(--gold)]" />
            <span>{totalMinutes} Menit Alokasi</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddSectionOpen(true)} className="btn-gold-solid">
          <Plus size={14} /> Tambah Subtes
        </Button>
      </Panel>

      {/* Section List */}
      <div className="space-y-4">
        {data.sections.map((section, idx) => {
          const isExpanded = expandedSection === section.id;
          const sectionMin = Math.round(section.durationSeconds / 60);

          return (
            <Panel
              key={section.id}
              className="border border-[var(--edge)] bg-[var(--surface)] p-0 overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-muted)] p-4 border-b border-[var(--edge)]">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  className="flex items-center gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  <span className="font-mono text-xs font-bold text-[var(--gold)]">#{idx + 1}</span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[var(--ink)]">
                      {section.title}
                    </h3>
                    <div className="flex items-center gap-3 font-mono text-xs text-[var(--soft-ink)]">
                      <span>Kode: {section.subtestCode}</span>
                      <span>• {sectionMin} Menit</span>
                      <span>• {section.questions.length} Soal</span>
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="flex items-center gap-1.5">
                    <Link to={`/admin/tryouts/${id}/impor?section=${section.id}`}>
                      <Upload size={13} /> Impor Soal
                    </Link>
                  </Button>
                  <DeleteTryoutSection
                    packageId={data.id}
                    sectionId={section.id}
                    title={section.title}
                    questionCount={section.questionCount}
                    onDeleted={loadData}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    aria-label={`${isExpanded ? "Tutup" : "Buka"} subtes ${section.title}`}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </div>

              {/* Collapsible Questions List */}
              {isExpanded && (
                <div className="p-4">
                  {section.questions.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="font-serif text-sm text-[var(--soft-ink)] mb-3">
                        Subtes ini belum memiliki soal.
                      </p>
                      <Button asChild size="sm" className="btn-gold-solid">
                        <Link to={`/admin/tryouts/${id}/impor?section=${section.id}`}>
                          <Upload size={14} /> Impor Soal Subtes Sekarang
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <TryoutQuestionTable
                        packageId={data.id}
                        sectionId={section.id}
                        rows={section.questions}
                        previewOnly
                        onChange={loadData}
                      />
                    </>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Add Section Dialog */}
      <AppDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        title="Tambah Subtes Baru"
        description="Tambahkan section subtes baru ke dalam susunan tryout ini."
      >
        <form onSubmit={handleAddSection} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="section-code"
              className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Kode Subtes
            </label>
            <input
              id="section-code"
              type="text"
              required
              value={newSubtestCode}
              onChange={(e) => setNewSubtestCode(e.target.value.toUpperCase())}
              placeholder="Contoh: PU, PK, BI"
              className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="section-title"
              className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Nama Subtes
            </label>
            <input
              id="section-title"
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Penalaran Umum"
              className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="section-duration"
              className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Alokasi Waktu (Menit)
            </label>
            <input
              id="section-duration"
              type="number"
              required
              min={1}
              value={newDurationMin}
              onChange={(e) => setNewDurationMin(e.target.value)}
              className="w-full rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--edge)]">
            <Button type="button" variant="outline" onClick={() => setAddSectionOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="btn-gold-solid">
              Simpan Subtes
            </Button>
          </div>
        </form>
      </AppDialog>
    </>
  );
}
