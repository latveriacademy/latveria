import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Archive,
  BarChart3,
  CheckCircle,
  Copy,
  Eye,
  History,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import { bulkDeleteSchema, type Bank } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { MathText } from "../../../components/math/math-text";
import { QuestionUsageDialog } from "./question-usage-dialog";
import { QuestionVersionDialog } from "./question-version-dialog";
import { QuestionAnalyticsDialog } from "./question-analytics-dialog";
import styles from "../admin.module.css";

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "published") {
    return (
      <span className="rounded bg-[var(--emerald-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--emerald)] border border-[var(--emerald-border)] font-semibold">
        Publik
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--soft-ink)] border border-[var(--edge)]">
        Draft
      </span>
    );
  }
  if (status === "in_review") {
    return (
      <span className="rounded bg-[var(--gold-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--gold)] border border-[var(--gold-border)]">
        Review
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink)] border border-[var(--edge)]">
        Disetujui
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--soft-ink)] border border-[var(--edge)] line-through">
        Arsip
      </span>
    );
  }
  return null;
}

export function QuestionBankTable({ bank }: { bank: Bank }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [usageQuestionId, setUsageQuestionId] = useState<string | null>(null);
  const [versionQuestionId, setVersionQuestionId] = useState<string | null>(null);
  const [analyticsQuestionId, setAnalyticsQuestionId] = useState<string | null>(null);

  const all = bank.rows.length > 0 && selected.length === bank.rows.length;

  function choose(ids: string[]) {
    setSelected(ids);
    setConfirm(false);
    setError("");
  }

  const handleDuplicate = async (id: string) => {
    setPending(true);
    try {
      const res = await api<{ id: string; slug: string }>(`/admin/questions/${id}/duplicate`, {
        method: "POST",
      });
      window.location.href = `/admin/soal/${res.id}`;
    } catch {
      setError("Gagal menduplikasi soal.");
    } finally {
      setPending(false);
    }
  };

  const handleBulkStatus = async (status: "published" | "archived") => {
    setPending(true);
    try {
      await api("/admin/questions/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          questionIds: selected,
          action: status === "archived" ? "archive" : "set_status",
          payload: { status },
        }),
      });
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operasi massal gagal.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {selected.length > 0 && (
        <div className={styles.selectionBar} aria-label="Aksi soal terpilih">
          <strong>{selected.length} soal terpilih di halaman ini</strong>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => choose([])}>
            <X aria-hidden="true" />
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleBulkStatus("published")}
          >
            <CheckCircle className="size-3.5 text-[var(--emerald)] mr-1" />
            Publikasikan
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleBulkStatus("archived")}
          >
            <Archive className="size-3.5 text-[var(--gold)] mr-1" />
            Arsipkan
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirm(true)}
          >
            <Trash2 aria-hidden="true" />
            Hapus terpilih
          </Button>
        </div>
      )}

      {error && (
        <div className="my-2 rounded border border-[var(--error-border)] bg-[var(--error-surface)] p-2.5 text-xs text-[var(--error)]">
          {error}
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Hapus ${selected.length} soal terpilih?`}
        description="Tindakan ini tidak dapat dibatalkan. Soal yang telah dikerjakan peserta tidak akan dihapus untuk menjaga integritas rekam jejak."
        confirmLabel="Ya, hapus"
        pendingLabel="Menghapus…"
        destructive
        pending={pending}
        error={error}
        onConfirm={async () => {
          setPending(true);
          setError("");
          try {
            const input = bulkDeleteSchema.parse({ ids: selected });
            const result = await api<{ count: number }>("/admin/questions/bulk-delete", {
              method: "POST",
              body: JSON.stringify(input),
            });
            setSelected([]);
            setConfirm(false);
            const next = new URLSearchParams(params);
            next.delete("created");
            next.delete("imported");
            next.delete("updated");
            next.set("deleted", String(result.count));
            setParams(next);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Penghapusan gagal. Coba lagi.");
          } finally {
            setPending(false);
          }
        }}
      />

      <Table className={styles.questionTable}>
        <caption className="sr-only">Daftar soal sesuai filter, {bank.total} soal.</caption>
        <TableHeader>
          <TableRow>
            <TableHead className={styles.selectColumn}>
              <input
                type="checkbox"
                className={styles.rowCheckbox}
                aria-label="Pilih semua soal di halaman ini"
                checked={all}
                disabled={pending || !bank.rows.length}
                ref={(node) => {
                  if (node) node.indeterminate = selected.length > 0 && !all;
                }}
                onChange={(event) =>
                  choose(event.target.checked ? bank.rows.map((row) => row.id) : [])
                }
              />
            </TableHead>
            <TableHead className={styles.numberColumn}>No.</TableHead>
            <TableHead>Pertanyaan</TableHead>
            <TableHead className={styles.actionColumn}>
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bank.rows.map((row, index) => (
            <TableRow
              key={row.id}
              data-state={selected.includes(row.id) ? "selected" : undefined}
              className={selected.includes(row.id) ? styles.selectedRow : undefined}
            >
              <TableCell>
                <input
                  type="checkbox"
                  className={styles.rowCheckbox}
                  aria-label={`Pilih soal ${index + 1}: ${row.prompt}`}
                  checked={selected.includes(row.id)}
                  disabled={pending}
                  onChange={(event) =>
                    choose(
                      event.target.checked
                        ? [...selected, row.id]
                        : selected.filter((id) => id !== row.id),
                    )
                  }
                />
              </TableCell>
              <TableCell className={styles.numberColumn}>
                {(bank.page - 1) * 15 + index + 1}
              </TableCell>
              <TableCell className={styles.promptCell}>
                <div className={styles.promptText}>
                  <MathText>{row.prompt}</MathText>
                </div>
                <div className={styles.questionMeta}>
                  <StatusBadge status={row.workflowStatus} />
                  <span>{row.topic}</span>
                  {row.packageName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--emerald)]">{row.packageName}</span>
                    </>
                  )}
                  {row.difficulty && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] uppercase text-[var(--gold)]">
                        {row.difficulty}
                      </span>
                    </>
                  )}
                  {row.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{row.category}</span>
                    </>
                  )}
                  {Boolean(row.annotationsCount) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-xs font-semibold text-[var(--accent-gold)]">
                        {row.annotationsCount} kosakata
                      </span>
                    </>
                  )}
                  {(row.passage || row.passageId) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-xs text-[var(--gold)]">
                        {row.passageId ? "wacana terhubung" : "ada wacana"}
                      </span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                    <Link
                      to={`/admin/soal/${row.id}`}
                      aria-label={`Pratinjau soal ${(bank.page - 1) * 15 + index + 1}`}
                    >
                      <Eye aria-hidden="true" className="size-3.5 mr-1" />
                      <span className={styles.previewLabel}>Pratinjau</span>
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-[var(--gold)]"
                    title="Duplikat sebagai soal baru"
                    onClick={() => handleDuplicate(row.id)}
                    disabled={pending}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    title="Peta Dependensi & Keamanan"
                    onClick={() => setUsageQuestionId(row.id)}
                  >
                    <Layers className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    title="Histori Versi & Diff"
                    onClick={() => setVersionQuestionId(row.id)}
                  >
                    <History className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    title="Analitik Performa"
                    onClick={() => setAnalyticsQuestionId(row.id)}
                  >
                    <BarChart3 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!bank.rows.length && (
            <TableRow>
              <TableCell colSpan={4} className={styles.emptyCell}>
                Tidak ada soal yang cocok. Coba kata kunci lain atau ubah filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Usage Dialog */}
      {usageQuestionId && (
        <QuestionUsageDialog
          questionId={usageQuestionId}
          open={Boolean(usageQuestionId)}
          onOpenChange={(open: boolean) => !open && setUsageQuestionId(null)}
          onDeleted={() => window.location.reload()}
        />
      )}

      {/* Version Dialog */}
      {versionQuestionId && (
        <QuestionVersionDialog
          questionId={versionQuestionId}
          open={Boolean(versionQuestionId)}
          onOpenChange={(open: boolean) => !open && setVersionQuestionId(null)}
          onRollbackComplete={() => window.location.reload()}
        />
      )}

      {/* Analytics Dialog */}
      {analyticsQuestionId && (
        <QuestionAnalyticsDialog
          questionId={analyticsQuestionId}
          open={Boolean(analyticsQuestionId)}
          onOpenChange={(open: boolean) => !open && setAnalyticsQuestionId(null)}
        />
      )}
    </>
  );
}
