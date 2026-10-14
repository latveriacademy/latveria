import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { ArrowLeft, Download, Layers, Pencil, Trash2 } from "lucide-react";
import type {
  AdminTryoutSectionDetail,
  LexiconAnnotation,
  TryoutSectionQuestion,
} from "@latveria/shared";
import { api } from "../../../lib/api";
import { downloadJson } from "../../../lib/question/question-export";
import { Button } from "../../../components/ui/button";
import { PageHeading, Panel } from "../../../components/ui/dashboard";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { AppDialog } from "../../../components/app-dialog";
import { MathText } from "../../../components/math/math-text";
import { AnnotatedText } from "../../../components/lexicon/annotated-text";
import { LexiconContent } from "../../../components/lexicon/lexicon-content";
import { StimulusRenderer } from "../../../components/question/stimulus-renderer";
import styles from "../admin.module.css";

type LoaderData = AdminTryoutSectionDetail & { question: TryoutSectionQuestion };

export function TryoutQuestionPreview() {
  const { tryout, section, question } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<LexiconAnnotation | null>(null);

  const isTrueFalse = question.type === "true_false_group";
  const statements = question.statements ?? [];

  return (
    <>
      <PageHeading
        title="Pratinjau soal"
        description={`${tryout.name} · ${section.title} / ${question.category ?? "Tanpa kategori"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to={`/admin/tryouts/${tryout.id}/subtes/${section.id}`}>
                <ArrowLeft />
                {section.title}
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to={`/admin/tryouts/${tryout.id}`}>
                <Layers size={14} />
                Ringkasan Tryout
              </Link>
            </Button>
          </div>
        }
      />
      <Panel className={styles.preview}>
        <div className={styles.previewHeader}>
          <span>{question.source || "Tryout Latveria"}</span>
          <span className="text-xs font-mono text-[var(--gold)]">
            {isTrueFalse ? "Benar / Salah Kompleks" : "Pilihan Ganda"}
          </span>
        </div>
        {question.passage && (
          <div className="border-b border-[var(--edge)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--soft-ink)] mb-2 uppercase tracking-wider">
              <span>Wacana / Teks Soal</span>
              {question.passageId && (
                <span className="font-semibold text-[var(--accent-gold)]">
                  ★ Wacana Terhubung (Reusable)
                </span>
              )}
            </div>
            <div className="font-serif text-base leading-relaxed text-[var(--ink)] whitespace-pre-line">
              <MathText>{question.passage}</MathText>
            </div>
          </div>
        )}
        {Boolean(question.stimulus?.blocks?.length) && (
          <div className="border-b border-[var(--edge)] bg-[var(--surface)] p-6">
            <StimulusRenderer stimulus={question.stimulus!} />
          </div>
        )}
        <div className={styles.previewPrompt}>
          <AnnotatedText
            annotations={question.annotations || []}
            onOpen={(annotation) => setSelectedAnnotation(annotation)}
          >
            {question.prompt}
          </AnnotatedText>
        </div>

        {/* Options / Choices */}
        {!isTrueFalse ? (
          <ol className={styles.previewOptions}>
            {(question.options ?? []).map((option, index) => (
              <li
                key={index}
                className={index === question.correctAnswer ? styles.correctOption : undefined}
              >
                <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span className={styles.optionText}>
                  <MathText>{option}</MathText>
                </span>
                {index === question.correctAnswer && <strong>Kunci jawaban</strong>}
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.previewOptions}>
            <div className="mb-2 text-xs font-mono uppercase text-[var(--soft-ink)]">
              Daftar Pernyataan (
              {question.scoring?.mode === "all_or_nothing"
                ? "Harus semua benar"
                : "Poin per pernyataan"}
              )
            </div>
            <ul className="space-y-2 list-none p-0 m-0">
              {statements.map((statement, index) => (
                <li
                  key={statement.id || index}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] ${
                    statement.answer ? styles.correctOption : ""
                  }`}
                >
                  <span className="flex-1 text-sm text-[var(--ink)]">
                    <MathText>{statement.text}</MathText>
                  </span>
                  <strong className="font-mono text-xs uppercase px-2 py-1 rounded bg-[var(--surface)] border border-[var(--edge)]">
                    Kunci: {statement.answer ? "Benar" : "Salah"}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pembahasan */}
        <section className={styles.previewExplanation}>
          <h2>Pembahasan</h2>
          <MathText>{question.explanation || "Pembahasan tersedia."}</MathText>
        </section>

        {/* Lexicon Vocabulary Cards */}
        {Boolean(question.annotations?.length) && (
          <section className="mt-6 border-t border-[var(--edge)] pt-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--ink)]">
              Kosakata Lexicon ({question.annotations!.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {question.annotations!.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className="rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-4 text-left cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
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
                </button>
              ))}
            </div>
          </section>
        )}
      </Panel>

      {/* Lexicon Definition Popup Dialog */}
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

      {/* Action Buttons: Identik dengan drilling */}
      <div className={styles.previewActions}>
        <Button asChild variant="outline">
          <Link to={`/admin/tryouts/${tryout.id}/subtes/${section.id}/soal/${question.id}/edit`}>
            <Pencil />
            Edit soal
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadJson(
              `soal-tryout-${section.subtestCode.toLowerCase()}-${question.id.slice(0, 8)}.json`,
              JSON.stringify(question, null, 2),
            )
          }
        >
          <Download />
          Ekspor JSON
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setError("");
            setConfirmRemove(true);
          }}
        >
          <Trash2 />
          Keluarkan dari subtes
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Keluarkan soal ini dari subtes?"
        description="Relasi soal ke subtes ini akan dilepas. Soal tetap berada di Bank soal dan hasil peserta yang tersimpan tetap terjaga."
        destructive
        confirmLabel="Ya, keluarkan"
        pending={removing}
        pendingLabel="Mengeluarkan…"
        error={error}
        onConfirm={async () => {
          setRemoving(true);
          setError("");
          try {
            await api(`/admin/tryouts/sections/${section.id}/questions/${question.id}`, {
              method: "DELETE",
            });
            setConfirmRemove(false);
            navigate(`/admin/tryouts/${tryout.id}/subtes/${section.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengeluarkan soal.");
          } finally {
            setRemoving(false);
          }
        }}
      />
    </>
  );
}
