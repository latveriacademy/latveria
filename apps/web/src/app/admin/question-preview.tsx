import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { QuestionDetail } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { MathText } from "../../components/math-text";
import styles from "./admin.module.css";

export function QuestionPreview() {
  const item = useLoaderData<QuestionDetail>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <PageHeading
        title="Pratinjau soal"
        description={`${item.topic} / ${item.category ?? "Tanpa kategori"}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/admin/soal?subtes=${item.slug}`}>
              <ArrowLeft />
              Bank soal
            </Link>
          </Button>
        }
      />
      <Panel className={styles.preview}>
        <div className={styles.previewHeader}>{item.source}</div>
        <div className={styles.previewPrompt}>
          <MathText>{item.prompt}</MathText>
        </div>
        <ol className={styles.previewOptions}>
          {item.options.map((option, index) => (
            <li
              key={index}
              className={index === item.correctAnswer ? styles.correctOption : undefined}
            >
              <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
              <span className={styles.optionText}>
                <MathText>{option}</MathText>
              </span>
              {index === item.correctAnswer && <strong>Kunci jawaban</strong>}
            </li>
          ))}
        </ol>
        <section className={styles.previewExplanation}>
          <h2>Pembahasan</h2>
          <MathText>{item.explanation}</MathText>
        </section>
      </Panel>
      <div className={styles.previewActions}>
        {item.usage ? (
          <p>
            Soal sudah dipakai dalam {item.usage} jawaban peserta sehingga tidak dapat diedit atau
            dihapus.
          </p>
        ) : (
          <>
            <Button asChild variant="outline">
              <Link to={`/admin/soal/${item.id}/edit`}>
                <Pencil />
                Edit soal
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                setConfirmDelete(true);
              }}
            >
              <Trash2 />
              Hapus soal
            </Button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus soal ini?"
        description="Tindakan ini tidak dapat dibatalkan. Soal yang sudah dipakai peserta tidak dapat dihapus."
        destructive
        confirmLabel="Ya, hapus"
        pending={deleting}
        pendingLabel="Menghapus…"
        error={error}
        onConfirm={async () => {
          setDeleting(true);
          setError("");
          try {
            await api(`/admin/questions/${item.id}`, { method: "DELETE" });
            setConfirmDelete(false);
            navigate(`/admin/soal?subtes=${item.slug}&deleted=1`);
          } catch (error) {
            setError(error instanceof Error ? error.message : "Gagal hapus.");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
