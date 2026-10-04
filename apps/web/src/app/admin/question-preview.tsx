import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { LexiconAnnotation, QuestionDetail } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { AppDialog } from "../../components/app-dialog";
import { MathText } from "../../components/math-text";
import { AnnotatedText } from "../../components/annotated-text";
import { LexiconContent } from "../../components/lexicon-content";
import styles from "./admin.module.css";

export function QuestionPreview() {
  const item = useLoaderData<QuestionDetail>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<LexiconAnnotation | null>(null);
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
          <AnnotatedText
            annotations={item.annotations || []}
            onOpen={(annotation) => setSelectedAnnotation(annotation)}
          >
            {item.prompt}
          </AnnotatedText>
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
        {Boolean(item.annotations?.length) && (
          <section className="mt-6 border-t border-[var(--edge)] pt-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--ink)]">
              Kosakata Lexicon ({item.annotations!.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.annotations!.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-4 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
                  onClick={() => setSelectedAnnotation(entry)}
                >
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <strong className="font-serif text-base text-[var(--accent-gold)]">
                      {entry.term}
                    </strong>
                    {entry.phonetic && (
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {entry.phonetic}
                      </span>
                    )}
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-[var(--edge)] bg-[var(--bg-app)] text-[var(--accent-gold)]">
                      {entry.partOfSpeech || "TERM"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] mb-1 leading-snug">
                    {entry.definition}
                  </p>
                  {entry.context && (
                    <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed line-clamp-2">
                      "{entry.context}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </Panel>
      {selectedAnnotation && (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedAnnotation(null);
          }}
          title={
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--accent-gold)]" />
              Glosarium Akademik Latveria
            </span>
          }
          className="max-w-[560px]"
        >
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            <LexiconContent annotation={selectedAnnotation} />
          </div>
        </AppDialog>
      )}
      <div className={styles.previewActions}>
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
        {Boolean(item.usage) && (
          <p className="text-xs text-[var(--text-muted)] m-0 self-center">
            Pernah dikerjakan {item.usage} kali oleh peserta.
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus soal ini?"
        description={
          item.usage
            ? `Soal ini pernah dikerjakan ${item.usage} kali. Menghapusnya akan membersihkan riwayat jawaban terkait dari sistem.`
            : "Tindakan ini tidak dapat dibatalkan."
        }
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
