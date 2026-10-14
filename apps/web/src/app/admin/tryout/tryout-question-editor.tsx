import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  sectionImportQuestionSchema,
  type AdminTryoutSectionDetail,
  type LexiconAnnotation,
  type TryoutSectionQuestion,
} from "@latveria/shared";
import { PageHeading } from "../../../components/ui/dashboard";
import { Button } from "../../../components/ui/button";
import { MathText } from "../../../components/math/math-text";
import { api } from "../../../lib/api";
import { PassageEditor } from "../soal/passage-editor";
import { LexiconEditor } from "../soal/lexicon-editor";
import { TikzHelp } from "../soal/tikz-help";
import styles from "../admin.module.css";

export function TryoutQuestionEditor() {
  const { tryout, section, question } = useLoaderData<
    AdminTryoutSectionDetail & { question: TryoutSectionQuestion }
  >();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(question.prompt);
  const [passage, setPassage] = useState(
    question.passageId ? "" : question.passage || question.stimulus?.passage || "",
  );
  const [passageId, setPassageId] = useState<string | null>(question.passageId ?? null);
  const [options, setOptions] = useState(question.options ?? []);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer ?? 0);
  const [statements, setStatements] = useState(
    (question.statements ?? []).map((s) => ({ ...s, answer: s.answer ?? false })),
  );
  const [mode, setMode] = useState(question.scoring?.mode ?? "per_statement");
  const [points, setPoints] = useState(question.scoring?.points ?? 1);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [source, setSource] = useState(question.source ?? "");
  const [category, setCategory] = useState(question.category ?? "");
  const [annotations, setAnnotations] = useState<LexiconAnnotation[]>(question.annotations ?? []);
  const [stimulus, setStimulus] = useState(
    question.stimulus ? JSON.stringify({ ...question.stimulus, passage: undefined }, null, 2) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [diagramError, setDiagramError] = useState("");
  const sources = section.questions.flatMap((q) => {
    const text = q.passage || q.stimulus?.passage;
    return q.id !== question.id && !q.passageId && text
      ? [{ id: q.id, passage: text, prompt: q.prompt }]
      : [];
  });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    let stimulusValue: unknown;
    try {
      stimulusValue = stimulus.trim() ? JSON.parse(stimulus) : null;
    } catch {
      setError("Stimulus JSON tidak valid. Periksa koma dan tanda kutip.");
      return;
    }
    const leading = prompt.length - prompt.trimStart().length;
    const parsed = sectionImportQuestionSchema.safeParse({
      type: question.type,
      prompt,
      passage: passageId ? null : passage,
      passageId,
      stimulus: stimulusValue,
      explanation,
      source,
      category,
      itemWeight: question.itemWeight,
      calculatorAllowed: question.calculatorAllowed,
      annotations: annotations.map((a) => ({
        ...a,
        start: a.start - leading,
        end: a.end - leading,
      })),
      ...(question.type === "single_choice"
        ? { options, correctAnswer }
        : { statements, scoring: { mode, points } }),
    });
    if (!parsed.success) {
      setError(
        `Periksa ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
      );
      return;
    }
    setPending(true);
    try {
      await api(`/admin/tryouts/${tryout.id}/sections/${section.id}/questions/${question.id}`, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      navigate(`/admin/tryouts/${tryout.id}/subtes/${section.id}?updated=${question.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Soal tidak dapat disimpan.");
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageHeading
        title="Edit soal Tryout"
        description={`${tryout.name} · ${section.title} · ${question.type === "single_choice" ? "Pilihan ganda" : "Benar/salah kompleks"}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/admin/tryouts/${tryout.id}/subtes/${section.id}`}>Kembali ke subtes</Link>
          </Button>
        }
      />
      <form className={styles.questionForm} onSubmit={save}>
        <fieldset disabled={pending} className={styles.formSection}>
          <legend>Soal dan wacana</legend>
          <div className={styles.field}>
            <label htmlFor="prompt">Teks soal</label>
            <textarea
              id="prompt"
              value={prompt}
              rows={5}
              maxLength={5000}
              required
              onChange={(e) => setPrompt(e.target.value)}
            />
            <span className={styles.hint}>{prompt.length}/5.000 karakter</span>
          </div>
          <TikzHelp
            prompt={prompt}
            onApply={setPrompt}
            disabled={pending}
            diagramError={diagramError}
            setDiagramError={setDiagramError}
          />
          <PassageEditor
            passage={passage}
            onChangePassage={setPassage}
            passageId={passageId}
            onChangePassageId={setPassageId}
            availablePassages={sources}
            maxLength={20000}
            disabled={pending}
          />
          <p className={styles.hint}>
            Wacana terhubung mengikuti perubahan soal sumber pada subtes ini, tanpa menyalin teks.
          </p>
          {prompt.trim() && (
            <div className="rounded border border-[var(--edge)] p-4 text-sm">
              <MathText>{prompt}</MathText>
            </div>
          )}
          {section.subtestCode === "EN" && (
            <LexiconEditor
              prompt={prompt}
              annotations={annotations}
              onChange={setAnnotations}
              disabled={pending}
            />
          )}
        </fieldset>
        <fieldset disabled={pending} className={styles.formSection}>
          <legend>Jawaban</legend>
          {question.type === "single_choice" ? (
            <>
              {options.map((option, index) => (
                <div className={styles.field} key={index}>
                  <label htmlFor={`tryout-option-${index}`}>Opsi {"ABCDE"[index]}</label>
                  <textarea
                    id={`tryout-option-${index}`}
                    value={option}
                    required
                    rows={2}
                    maxLength={1000}
                    onChange={(e) =>
                      setOptions((rows) => rows.map((v, i) => (i === index ? e.target.value : v)))
                    }
                  />
                </div>
              ))}
              <div className={styles.field}>
                <label htmlFor="tryout-answer">Kunci jawaban</label>
                <select
                  id="tryout-answer"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4].map((index) => (
                    <option key={index} value={index}>
                      {"ABCDE"[index]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {statements.map((s, index) => (
                <div className="grid gap-2 border-b border-[var(--edge)] py-3" key={s.id}>
                  <label htmlFor={`statement-${s.id}`}>Pernyataan {index + 1}</label>
                  <textarea
                    id={`statement-${s.id}`}
                    value={s.text}
                    rows={2}
                    required
                    maxLength={1000}
                    onChange={(e) =>
                      setStatements((rows) =>
                        rows.map((v) => (v.id === s.id ? { ...v, text: e.target.value } : v)),
                      )
                    }
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.answer}
                        onChange={(e) =>
                          setStatements((rows) =>
                            rows.map((v) =>
                              v.id === s.id ? { ...v, answer: e.target.checked } : v,
                            ),
                          )
                        }
                      />
                      Kunci: {s.answer ? "Benar" : "Salah"}
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={statements.length <= 2}
                      aria-label={`Hapus pernyataan ${index + 1}`}
                      onClick={() => setStatements((rows) => rows.filter((v) => v.id !== s.id))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={statements.length >= 10}
                onClick={() =>
                  setStatements((rows) => [
                    ...rows,
                    { id: crypto.randomUUID(), text: "", answer: false },
                  ])
                }
              >
                <Plus size={14} />
                Tambah pernyataan
              </Button>
              <div className={styles.field}>
                <label htmlFor="tryout-scoring-mode">Aturan penilaian</label>
                <select
                  id="tryout-scoring-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="per_statement">Poin per pernyataan</option>
                  <option value="all_or_nothing">Harus semua benar</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="tryout-scoring-points">Poin</label>
                <input
                  id="tryout-scoring-points"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </fieldset>
        <fieldset disabled={pending} className={styles.formSection}>
          <legend>Pembahasan dan sumber</legend>
          <div className={styles.field}>
            <label htmlFor="tryout-explanation">Pembahasan</label>
            <textarea
              id="tryout-explanation"
              value={explanation}
              required
              rows={5}
              maxLength={5000}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="tryout-source">Sumber</label>
            <input
              id="tryout-source"
              value={source}
              required
              maxLength={300}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="tryout-category">Kategori</label>
            <input
              id="tryout-category"
              value={category}
              maxLength={120}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <details>
            <summary className="cursor-pointer py-3 text-sm">
              Stimulus lanjutan: gambar, tabel, diagram atau grafik
            </summary>
            <div className={styles.field}>
              <label htmlFor="tryout-stimulus">Stimulus JSON</label>
              <textarea
                id="tryout-stimulus"
                value={stimulus}
                rows={8}
                spellCheck={false}
                className={styles.jsonEditor}
                onChange={(e) => setStimulus(e.target.value)}
              />
            </div>
          </details>
        </fieldset>
        {error && (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        )}
        <div className={styles.formActions}>
          <Button type="submit" disabled={pending}>
            <Save size={16} />
            {pending ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
          <p className={styles.hint}>
            Perubahan berlaku pada soal Bank yang sama. Hasil Tryout tersimpan tetap memakai
            snapshot.
          </p>
        </div>
      </form>
    </>
  );
}
