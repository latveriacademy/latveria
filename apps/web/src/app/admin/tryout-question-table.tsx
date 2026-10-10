import { useState } from "react";
import { Link } from "react-router";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { TryoutSectionQuestion, LexiconAnnotation } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { AppDialog } from "../../components/app-dialog";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { QuestionRenderer } from "../../components/question-renderer";
import { LexiconContent } from "../../components/lexicon-content";

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
  const [preview, setPreview] = useState<TryoutSectionQuestion | null>(null);
  const [target, setTarget] = useState<TryoutSectionQuestion | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [word, setWord] = useState<LexiconAnnotation | null>(null);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--edge)] text-xs text-[var(--soft-ink)]">
              <th className="p-3 w-12">No</th>
              <th className="p-3 w-28">Tipe</th>
              <th className="p-3">Teks soal</th>
              <th className="p-3 w-28">Wacana</th>
              <th className="p-3 w-36 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(previewOnly ? rows.slice(0, 5) : rows).map((q, index) => (
              <tr key={q.id} className="border-b border-[var(--edge)]">
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
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Pratinjau soal ${offset + index + 1}`}
                      onClick={() => setPreview(q)}
                    >
                      <Eye size={15} />
                    </Button>
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        aria-label={`Edit soal ${offset + index + 1}`}
                        to={`/admin/tryouts/${packageId}/subtes/${sectionId}/soal/${q.id}/edit`}
                      >
                        <Pencil size={15} />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Keluarkan soal ${offset + index + 1}`}
                      onClick={() => {
                        setError("");
                        setTarget(q);
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
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
      <AppDialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
        title="Pratinjau soal"
        description="Kunci dan pembahasan untuk peninjauan admin."
      >
        {preview && (
          <QuestionRenderer
            question={{ ...preview, questionType: preview.type }}
            evaluated
            disabled
            showVerdict={false}
            onOpenLexicon={(annotation) => setWord(annotation)}
          />
        )}
      </AppDialog>
      <AppDialog
        open={Boolean(word)}
        onOpenChange={(open) => !open && setWord(null)}
        title={`Arti ${word?.term ?? "kosakata"}`}
      >
        {word && <LexiconContent annotation={word} />}
      </AppDialog>
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Keluarkan soal dari subtes?"
        description="Relasi soal ke subtes ini akan dilepas. Soal tetap berada di Bank soal dan hasil peserta yang tersimpan tetap terjaga."
        confirmLabel="Keluarkan soal"
        destructive
        pending={pending}
        error={error}
        onConfirm={async () => {
          if (!target) return;
          setPending(true);
          setError("");
          try {
            await api(`/admin/tryouts/sections/${sectionId}/questions/${target.id}`, {
              method: "DELETE",
            });
            setTarget(null);
            await onChange();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Soal tidak dapat dikeluarkan.");
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );
}
