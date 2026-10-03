import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Eye, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { bulkDeleteSchema, type Bank } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { MathText } from "../../components/math-text";
import styles from "./admin.module.css";

export function QuestionBankTable({ bank }: { bank: Bank }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const all = bank.rows.length > 0 && selected.length === bank.rows.length;
  function choose(ids: string[]) {
    setSelected(ids);
    setConfirm(false);
    setError("");
  }
  return (
    <>
      {selected.length > 0 && (
        <div className={styles.selectionBar} aria-label="Aksi soal terpilih">
          <strong>{selected.length} soal terpilih di halaman ini</strong>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => choose([])}>
            <X aria-hidden="true" />
            Batalkan pilihan
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
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Hapus ${selected.length} soal terpilih?`}
        description="Tindakan ini tidak dapat dibatalkan. Riwayat jawaban peserta yang terkait dengan soal-soal ini akan otomatis dibersihkan."
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
          } catch (error) {
            setError(error instanceof Error ? error.message : "Penghapusan gagal. Coba lagi.");
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
                  <span>{row.topic}</span>
                  {row.packageName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--emerald)]">{row.packageName}</span>
                    </>
                  )}
                  {row.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{row.category}</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Button asChild size="sm" variant="ghost">
                  <Link
                    to={`/admin/soal/${row.id}`}
                    aria-label={`Pratinjau soal ${(bank.page - 1) * 15 + index + 1}`}
                  >
                    <Eye aria-hidden="true" />
                    <span className={styles.previewLabel}>Pratinjau</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!bank.rows.length && (
            <TableRow>
              <TableCell colSpan={4} className={styles.emptyCell}>
                Tidak ada soal pada filter ini. Coba ubah subtes, paket, atau kategori.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
