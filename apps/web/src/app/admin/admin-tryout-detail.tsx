import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Plus,
  Clock,
  Layers,
  Upload,
  Eye,
  Trash2,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  TryoutSectionWithQuestions,
  TryoutSectionQuestion,
  AdminTryoutDetail,
} from "@latveria/shared";
import { api } from "../../lib/api";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import { Button } from "../../components/ui/button";
import { AppDialog } from "../../components/app-dialog";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { QuestionRenderer } from "../../components/question-renderer";
import { TryoutSectionImportModal } from "./tryout-section-import-modal";

type TryoutDetailData = AdminTryoutDetail;

export function AdminTryoutDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TryoutDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Import modal state
  const [importSection, setImportSection] = useState<TryoutSectionWithQuestions | null>(null);

  // Preview modal state
  const [previewQuestion, setPreviewQuestion] = useState<
    TryoutSectionWithQuestions["questions"][number] | null
  >(null);

  // Delete question from section state
  const [deleteTarget, setDeleteTarget] = useState<{
    sectionId: string;
    questionId: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          sectionOrder: (data?.sections.length || 0) + 1,
        }),
      });
      setAddSectionOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah subtes.");
    }
  };

  const handleRemoveQuestion = async () => {
    if (!id || !deleteTarget) return;
    setDeleting(true);
    try {
      await api(
        `/admin/tryouts/sections/${deleteTarget.sectionId}/questions/${deleteTarget.questionId}`,
        { method: "DELETE" },
      );
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus soal dari subtes.");
    } finally {
      setDeleting(false);
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

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImportSection(section)}
                    className="flex items-center gap-1.5"
                  >
                    <Upload size={13} /> Impor Soal
                  </Button>
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
                      <Button
                        size="sm"
                        onClick={() => setImportSection(section)}
                        className="btn-gold-solid"
                      >
                        <Upload size={14} /> Impor Soal Subtes Sekarang
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--edge)] font-mono text-xs text-[var(--soft-ink)]">
                            <th className="py-2 px-3 w-12">No</th>
                            <th className="py-2 px-3 w-28">Tipe</th>
                            <th className="py-2 px-3">Teks Soal</th>
                            <th className="py-2 px-3 w-24">Stimulus</th>
                            <th className="py-2 px-3 w-28 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.questions.map((q: TryoutSectionQuestion, qIdx: number) => {
                            const hasStimulus = Boolean(
                              q.stimulus?.passage ||
                              (q.stimulus?.blocks && q.stimulus.blocks.length > 0) ||
                              q.passage,
                            );

                            return (
                              <tr
                                key={q.id}
                                className="border-b border-[var(--edge)]/40 hover:bg-[var(--surface-muted)]/50"
                              >
                                <td className="py-2.5 px-3 font-mono text-xs text-[var(--gold)]">
                                  {qIdx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--edge)] bg-[var(--surface-muted)]">
                                    {q.type === "true_false_group"
                                      ? "Benar/Salah"
                                      : "Pilihan Ganda"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-serif text-xs text-[var(--ink)] line-clamp-1">
                                  {q.prompt}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs">
                                  {hasStimulus ? (
                                    <span className="text-[var(--emerald)]">Ada</span>
                                  ) : (
                                    <span className="text-[var(--soft-ink)]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Pratinjau Soal"
                                      onClick={() => setPreviewQuestion(q)}
                                    >
                                      <Eye size={14} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[var(--crimson)] hover:bg-[var(--crimson)]/10"
                                      title="Hapus dari Subtes"
                                      onClick={() =>
                                        setDeleteTarget({
                                          sectionId: section.id,
                                          questionId: q.id,
                                        })
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Import Modal */}
      {importSection && id && (
        <TryoutSectionImportModal
          open={Boolean(importSection)}
          onOpenChange={(open) => !open && setImportSection(null)}
          tryoutId={id}
          sectionId={importSection.id}
          sectionTitle={importSection.title}
          onSuccess={loadData}
        />
      )}

      {/* Question Preview Modal */}
      <AppDialog
        open={Boolean(previewQuestion)}
        onOpenChange={(open) => !open && setPreviewQuestion(null)}
        title="Pratinjau Soal"
        description="Tampilan evaluasi lengkap seperti yang dilihat peserta saat sesi review."
      >
        {previewQuestion && (
          <div className="pt-2 max-h-[75vh] overflow-y-auto">
            <QuestionRenderer
              question={{
                id: previewQuestion.id,
                prompt: previewQuestion.prompt,
                questionType: previewQuestion.type,
                stimulus: previewQuestion.stimulus,
                passage: previewQuestion.passage,
                statements: previewQuestion.statements,
                options: previewQuestion.options,
                correctAnswer: previewQuestion.correctAnswer,
                explanation: previewQuestion.explanation,
              }}
              evaluated
              disabled
            />
          </div>
        )}
      </AppDialog>

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
              placeholder="Contoh: PU, PK, LBI"
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

      {/* Confirm Delete Question from Section */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Soal dari Subtes?"
        description="Soal akan dilepaskan dari subtes ini. Riwayat jawaban masa lalu tetap terjaga."
        confirmLabel="Hapus dari Subtes"
        pending={deleting}
        error={error}
        onConfirm={handleRemoveQuestion}
      />
    </>
  );
}
