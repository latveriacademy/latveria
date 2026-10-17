"use client";

import { useActionState, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  questionSchema,
  type QuestionDetail,
  type QuestionPackage,
  type LexiconAnnotation,
  type PackageDetail,
} from "@latveria/shared";
import { LexiconEditor } from "./lexicon-editor";
import { PassageEditor, type AvailablePassage } from "./passage-editor";
import { TikzHelp } from "./tikz-help";
import { QuestionDuplicateChecker } from "./question-duplicate-checker";
import { QuestionQualityIndicator } from "./question-quality-indicator";
import { api } from "../../../lib/api";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MathText } from "../../../components/math/math-text";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import styles from "../admin.module.css";

export function QuestionForm({
  topics,
  initialTopicId,
  initialPackageId,
  question,
}: {
  topics: { id: string; name: string; section: string; slug?: string }[];
  initialTopicId?: string;
  initialPackageId?: string;
  question?: QuestionDetail;
}) {
  const navigate = useNavigate();
  const [selectedTopicId, setSelectedTopicId] = useState(
    question?.topicId ?? initialTopicId ?? topics[0]?.id,
  );
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [packagesRetry, setPackagesRetry] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(
    question?.packageId ?? initialPackageId,
  );
  const [showNewPkg, setShowNewPkg] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [pkgPending, setPkgPending] = useState(false);
  const [pkgError, setPkgError] = useState("");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [passage, setPassage] = useState(question?.passageId ? "" : (question?.passage ?? ""));
  const [passageId, setPassageId] = useState<string | null>(question?.passageId ?? null);
  const [availablePassages, setAvailablePassages] = useState<AvailablePassage[]>([]);
  const [diagramError, setDiagramError] = useState("");
  const [annotations, setAnnotations] = useState<LexiconAnnotation[]>(question?.annotations ?? []);
  const isLbe =
    topics.find((topic) => topic.id === selectedTopicId)?.slug === "literasi-bahasa-inggris";

  useEffect(() => {
    if (!selectedPackageId) {
      setAvailablePassages([]);
      return;
    }
    const controller = new AbortController();
    api<PackageDetail>(`/admin/packages/${selectedPackageId}`, { signal: controller.signal })
      .then((detail) => {
        if (controller.signal.aborted) return;
        const candidates = detail.questions
          .filter((q) => q.passage && q.id !== question?.id)
          .map((q) => ({ id: q.id, passage: q.passage!, prompt: q.prompt }));
        setAvailablePassages(candidates);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedPackageId, question?.id]);

  useEffect(() => {
    if (!selectedTopicId) return;
    const controller = new AbortController();
    setPackagesLoading(true);
    setPackagesError("");
    setPackages([]);
    api<QuestionPackage[]>(`/admin/subtests/${selectedTopicId}/packages`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPackages(data);
        const preferred = question?.packageId ?? initialPackageId;
        if (preferred && data.some((p) => p.id === preferred)) {
          setSelectedPackageId(preferred);
        } else if (initialPackageId && selectedTopicId === initialTopicId) {
          setSelectedPackageId(undefined);
          setPkgError("Paket tujuan tidak tersedia. Pilih paket lain sebelum menyimpan.");
        } else if (data.length > 0) {
          setSelectedPackageId(data[0].id);
        } else {
          setSelectedPackageId(undefined);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPackagesError("Gagal memuat paket soal. Coba lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPackagesLoading(false);
      });
    return () => controller.abort();
  }, [selectedTopicId, question?.packageId, initialPackageId, initialTopicId, packagesRetry]);

  const handleCreatePackage = async () => {
    if (!newPkgName.trim() || !selectedTopicId) return;
    setPkgPending(true);
    setPkgError("");
    try {
      const created = await api<QuestionPackage>(`/admin/subtests/${selectedTopicId}/packages`, {
        method: "POST",
        body: JSON.stringify({ name: newPkgName.trim(), order: packages.length + 1 }),
      });
      setPackages((prev) => [...prev, created]);
      setSelectedPackageId(created.id);
      setNewPkgName("");
      setShowNewPkg(false);
    } catch (err) {
      setPkgError(err instanceof Error ? err.message : "Gagal membuat paket.");
    } finally {
      setPkgPending(false);
    }
  };

  const createQuestion = async (_previous: string, form: FormData) => {
    if (packagesLoading || packagesError)
      return "Paket tujuan belum dapat diperiksa. Coba muat kembali daftar paket.";
    if (initialPackageId && selectedTopicId === initialTopicId && !selectedPackageId)
      return "Pilih paket tujuan sebelum menyimpan soal.";
    const leadingSpace = prompt.length - prompt.trimStart().length;
    const parsed = questionSchema.safeParse({
      topicId: selectedTopicId,
      packageId: selectedPackageId || undefined,
      passage: passage.trim() || undefined,
      passageId: passageId || undefined,
      prompt: form.get("prompt"),
      options: [0, 1, 2, 3, 4].map((index) => form.get(`option-${index}`)),
      correctAnswer: Number(form.get("correctAnswer")),
      explanation: form.get("explanation"),
      source: form.get("source"),
      category: String(form.get("category") ?? "").trim() || undefined,
      annotations: isLbe
        ? annotations.map((item) => ({
            ...item,
            start: item.start - leadingSpace,
            end: item.end - leadingSpace,
            phonetic: item.phonetic ?? "",
            example: item.example ?? "",
            etymology: item.etymology ?? "",
            synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          }))
        : [],
    });
    if (!parsed.success) return parsed.error.issues[0].message;
    try {
      const result = await api<{ id: string; slug: string }>(
        question ? `/admin/questions/${question.id}` : "/admin/questions",
        { method: question ? "PUT" : "POST", body: JSON.stringify(parsed.data) },
      );
      navigate(
        question
          ? `/admin/soal/${result.id}?updated=1`
          : initialPackageId && selectedPackageId === initialPackageId
            ? `/admin/paket/${initialPackageId}`
            : `/admin/soal?subtes=${result.slug}&created=${result.id}`,
      );
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Gagal menyimpan soal.";
    }
  };

  const [message, action, pending] = useActionState(createQuestion, "");
  if (!topics.length)
    return (
      <div className={styles.empty}>
        <p>
          Belum ada subtes. Jalankan <code>bun run db:seed</code> untuk memuat katalog UTBK.
        </p>
      </div>
    );

  return (
    <form action={action} className={styles.questionForm}>
      <fieldset className={styles.formSection}>
        <legend>Soal</legend>
        <div className={styles.field}>
          <label htmlFor="topicId">Subtes</label>
          <Select
            name="topicId"
            value={selectedTopicId}
            onValueChange={(val) => setSelectedTopicId(val)}
            required
          >
            <SelectTrigger id="topicId">
              <SelectValue placeholder="Pilih subtes" />
            </SelectTrigger>
            <SelectContent>
              {(["tps", "literasi"] as const).map((section) => (
                <SelectGroup key={section}>
                  <SelectLabel>
                    {section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}
                  </SelectLabel>
                  {topics
                    .filter((topic) => topic.section === section)
                    .map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles.field}>
          <label htmlFor="packageId">Paket Soal</label>
          {packagesLoading ? (
            <p role="status">Memuat paket…</p>
          ) : packagesError ? (
            <div role="alert">
              <p>{packagesError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPackagesRetry((value) => value + 1)}
              >
                Coba lagi
              </Button>
            </div>
          ) : packages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                <Select
                  value={selectedPackageId ?? "none"}
                  onValueChange={(val) => {
                    setSelectedPackageId(val === "none" ? undefined : val);
                    setPkgError("");
                  }}
                >
                  <SelectTrigger id="packageId">
                    <SelectValue placeholder="Pilih paket soal" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.questionCount} soal)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewPkg(!showNewPkg)}
              >
                <Plus className="size-4" />
                Buat Paket
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--soft-ink)] italic p-2 border border-[var(--edge)] rounded-md bg-[var(--surface-elevated)]">
                Belum ada paket pada subtes ini
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewPkg(!showNewPkg)}
              >
                <Plus className="size-4" />
                Buat Paket
              </Button>
            </div>
          )}

          {showNewPkg && (
            <div className="mt-2 p-3 border border-[var(--edge)] bg-[var(--surface-elevated)] rounded-md space-y-2">
              <div className="text-xs font-semibold text-[var(--ink)]">
                Tambah Paket Baru untuk Subtes Ini
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nama paket (mis. Paket 1)"
                  className="min-h-9 text-sm border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-2 rounded-md focus:border-[var(--emerald)] focus:outline-none flex-1"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pkgPending || !newPkgName.trim()}
                  onClick={handleCreatePackage}
                >
                  {pkgPending ? "Membuat..." : "Simpan Paket"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewPkg(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
          {pkgError && (
            <p className={styles.formError} role="alert">
              {pkgError}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="category">Materi / kategori</label>
          <input
            id="category"
            name="category"
            maxLength={120}
            defaultValue={question?.category}
            placeholder="Contoh: Perbandingan dan persentase"
          />
          <span className={styles.hint}>
            Opsional. Isi sesuai materi yang ingin kamu kelompokkan.
          </span>
        </div>
        <PassageEditor
          passage={passage}
          onChangePassage={setPassage}
          passageId={passageId}
          onChangePassageId={setPassageId}
          availablePassages={availablePassages}
          disabled={pending}
        />
        <div className={styles.field}>
          <div className="flex items-center justify-between">
            <label htmlFor="prompt">Pertanyaan</label>
            <span className="font-mono text-[11px] text-[var(--soft-ink)]">
              {prompt.length} / 5.000 karakter
            </span>
          </div>
          <textarea
            id="prompt"
            name="prompt"
            minLength={5}
            maxLength={5000}
            rows={4}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setDiagramError("");
            }}
            required
          />
        </div>
        <p className={styles.hint}>
          Rumus: <code>$x^2$</code> inline atau <code>$$\frac&#123;1&#125;&#123;2&#125;$$</code>{" "}
          blok.
        </p>
        <TikzHelp
          prompt={prompt}
          onApply={setPrompt}
          disabled={pending}
          diagramError={diagramError}
          setDiagramError={setDiagramError}
        />
        {prompt && (
          <div className={styles.promptPreview}>
            <h2>Pratinjau pertanyaan</h2>
            <MathText>{prompt}</MathText>
          </div>
        )}
        <QuestionDuplicateChecker prompt={prompt} excludeId={question?.id} />
        <QuestionQualityIndicator prompt={prompt} explanation={question?.explanation} />
      </fieldset>
      {isLbe && (
        <fieldset className={styles.formSection}>
          <legend>Lexicon LBE</legend>
          <LexiconEditor
            prompt={prompt}
            annotations={annotations}
            onChange={setAnnotations}
            disabled={pending}
          />
        </fieldset>
      )}
      <fieldset className={styles.formSection}>
        <legend>Pilihan jawaban</legend>
        <div className={styles.options}>
          {[0, 1, 2, 3, 4].map((index) => (
            <div className={styles.field} key={index}>
              <label htmlFor={`option-${index}`}>Opsi {index + 1}</label>
              <input
                id={`option-${index}`}
                name={`option-${index}`}
                maxLength={300}
                defaultValue={question?.options[index]}
                required
              />
            </div>
          ))}
        </div>
        <div className={styles.field}>
          <label htmlFor="correctAnswer">Jawaban benar</label>
          <Select name="correctAnswer" defaultValue={String(question?.correctAnswer ?? 0)}>
            <SelectTrigger id="correctAnswer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((index) => (
                <SelectItem key={index} value={String(index)}>
                  Opsi {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>
      <fieldset className={styles.formSection}>
        <legend>Pembahasan dan sumber</legend>
        <div className={styles.field}>
          <label htmlFor="explanation">Pembahasan</label>
          <textarea
            id="explanation"
            name="explanation"
            minLength={5}
            maxLength={2000}
            defaultValue={question?.explanation}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="source">Sumber soal</label>
          <input
            id="source"
            name="source"
            maxLength={300}
            defaultValue={question?.source}
            required
          />
        </div>
      </fieldset>
      {message && (
        <p className={styles.formError} role="alert">
          {message}
        </p>
      )}
      <div className={styles.formActions}>
        <Button type="submit" disabled={pending || packagesLoading || !!packagesError}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save />
              {question ? "Simpan perubahan" : "Simpan soal"}
            </>
          )}
        </Button>
        <Button asChild variant="ghost">
          <Link
            to={
              question
                ? `/admin/soal/${question.id}`
                : initialPackageId
                  ? `/admin/paket/${initialPackageId}`
                  : "/admin/soal"
            }
          >
            <ArrowLeft />
            Batal
          </Link>
        </Button>
      </div>
    </form>
  );
}
