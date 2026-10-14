import { useState } from "react";
import { Link } from "react-router";
import { Eye, Trash2, X } from "lucide-react";
import type { TryoutSectionQuestion } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import styles from "./tryout-question-table.module.css";

export function TryoutQuestionTable({
  packageId,
  sectionId,
  rows,
  offset = 0,
  previewOnly = false,
  onChange,
}: {
  packageId: string;
  sectionId: string;
  rows: TryoutSectionQuestion[];
  offset?: number;
  previewOnly?: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const displayedRows = previewOnly ? rows.slice(0, 5) : rows;
  const allSelected =
    displayedRows.length > 0 && displayedRows.every((r) => selected.includes(r.id));

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const next = Array.from(new Set([...selected, ...displayedRows.map((r) => r.id)]));
      setSelected(next);
    } else {
      const displayedIds = new Set(displayedRows.map((r) => r.id));
      setSelected(selected.filter((id) => !displayedIds.has(id)));
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setPending(true);
    setError("");
    try {
      await api(`/admin/tryouts/sections/${sectionId}/questions/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      setSelected([]);
      setConfirmBulk(false);
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengeluarkan beberapa soal terpilih.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {selected.length > 0 && (
        <div className={styles.selectionBar} aria-label="Aksi soal terpilih">
          <strong>{selected.length} soal terpilih</strong>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setSelected([])}
          >
            <X size={14} aria-hidden="true" />
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmBulk(true)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Keluarkan terpilih
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--edge)] text-xs text-[var(--soft-ink)]">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  className={styles.rowCheckbox}
                  aria-label="Pilih semua soal yang tampil"
                  checked={allSelected}
                  disabled={pending || displayedRows.length === 0}
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = selected.length > 0 && !allSelected;
                    }
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="p-3 w-12">No</th>
              <th className="p-3 w-28">Tipe</th>
              <th className="p-3">Teks soal</th>
              <th className="p-3 w-28">Wacana</th>
              <th className="p-3 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((q, index) => {
              const isChecked = selected.includes(q.id);
              return (
                <tr
                  key={q.id}
                  className={`border-b border-[var(--edge)] ${isChecked ? styles.selectedRow : ""}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      aria-label={`Pilih soal ${offset + index + 1}`}
                      checked={isChecked}
                      disabled={pending}
                      onChange={(e) => toggleOne(q.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-3 text-xs text-[var(--soft-ink)]">{offset + index + 1}</td>
                  <td className="p-3 text-xs">
                    {q.type === "true_false_group" ? "Benar/salah" : "Pilihan ganda"}
                  </td>
                  <td className="p-3">
                    <p className="m-0 line-clamp-2 text-sm leading-relaxed">{q.prompt}</p>
                  </td>
                  <td className="p-3 text-xs text-[var(--soft-ink)]">
                    {q.passageId
                      ? "Terhubung"
                      : q.passage || q.stimulus?.passage
                        ? "Teks sendiri"
                        : q.stimulus?.blocks?.length
                          ? "Stimulus"
                          : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          to={`/admin/tryouts/${packageId}/subtes/${sectionId}/soal/${q.id}`}
                          aria-label={`Pratinjau soal ${offset + index + 1}`}
                        >
                          <Eye size={15} />
                          <span className={styles.previewLabel}>Pratinjau</span>
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewOnly && rows.length > 5 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[var(--soft-ink)]">
            Menampilkan 5 dari {rows.length} soal
          </span>
          <Button asChild variant="outline">
            <Link to={`/admin/tryouts/${packageId}/subtes/${sectionId}`}>
              Lihat semua ({rows.length} soal)
            </Link>
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={(open) => !open && setConfirmBulk(false)}
        title={`Keluarkan ${selected.length} soal terpilih?`}
        description="Relasi soal-soal terpilih ke subtes ini akan dilepas. Soal tetap tersimpan di Bank Soal dan hasil peserta masa lalu tetap terjaga."
        confirmLabel="Keluarkan terpilih"
        destructive
        pending={pending}
        error={error}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
