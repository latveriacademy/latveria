import { useState } from "react";
import { Upload, FileCode, CheckCircle, AlertTriangle } from "lucide-react";
import { sectionImportSchema, type SectionImportInput } from "@latveria/shared";
import { api } from "../../lib/api";
import { AppDialog } from "../../components/app-dialog";
import { Button } from "../../components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tryoutId: string;
  sectionId: string;
  sectionTitle: string;
  onSuccess: () => void;
}

export function TryoutSectionImportModal({
  open,
  onOpenChange,
  sectionId,
  sectionTitle,
  onSuccess,
}: Props) {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [jsonText, setJsonText] = useState("");
  const [parsedData, setParsedData] = useState<SectionImportInput | null>(null);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleValidate = (raw: string) => {
    setParseError("");
    setApiError("");
    if (!raw.trim()) {
      setParsedData(null);
      return;
    }
    if (new TextEncoder().encode(raw).byteLength > 200_000) {
      setParsedData(null);
      setParseError("JSON maksimal 200 KB.");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const res = sectionImportSchema.safeParse(parsed);
      if (!res.success) {
        const firstErr = res.error.issues[0];
        setParseError(`Format tidak valid: [${firstErr.path.join(".")}] ${firstErr.message}`);
        setParsedData(null);
      } else {
        setParsedData(res.data);
      }
    } catch {
      setParseError("Sintaks JSON tidak valid. Periksa koma, tanda petik, dan kurung kurawal.");
      setParsedData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200_000) {
      setParsedData(null);
      setParseError("File maksimal 200 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setJsonText(content);
      handleValidate(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!parsedData) return;
    setSubmitting(true);
    setApiError("");
    try {
      await api(`/admin/tryouts/sections/${sectionId}/import`, {
        method: "POST",
        body: JSON.stringify(parsedData),
      });
      onSuccess();
      onOpenChange(false);
      setJsonText("");
      setParsedData(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Gagal mengimpor batch soal.");
    } finally {
      setSubmitting(false);
    }
  };

  const singleChoiceCount =
    parsedData?.questions.filter((q) => !("type" in q) || q.type === "single_choice").length || 0;
  const trueFalseCount =
    parsedData?.questions.filter((q) => "type" in q && q.type === "true_false_group").length || 0;
  const withStimulusCount =
    parsedData?.questions.filter((q) => Boolean(q.stimulus || q.passage)).length || 0;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Impor Soal Subtes: ${sectionTitle}`}
      description="Format JSON mendukung pilihan ganda tunggal, pilihan benar-salah kompleks, stimulus gambar, tabel, dan grafik."
      pending={submitting}
    >
      <div className="space-y-4 pt-1">
        {/* Tab switch */}
        <div className="flex border-b border-[var(--edge)]">
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={`pb-2 px-3 font-mono text-xs font-semibold border-b-2 transition-colors ${
              tab === "paste"
                ? "border-[var(--gold)] text-[var(--gold)]"
                : "border-transparent text-[var(--soft-ink)] hover:text-[var(--ink)]"
            }`}
          >
            <FileCode size={14} className="inline mr-1.5" />
            Tempel JSON
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`pb-2 px-3 font-mono text-xs font-semibold border-b-2 transition-colors ${
              tab === "upload"
                ? "border-[var(--gold)] text-[var(--gold)]"
                : "border-transparent text-[var(--soft-ink)] hover:text-[var(--ink)]"
            }`}
          >
            <Upload size={14} className="inline mr-1.5" />
            Unggah File .json
          </button>
        </div>

        {tab === "upload" && (
          <div className="rounded-lg border-2 border-dashed border-[var(--edge)] p-6 text-center hover:border-[var(--gold)]/50">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="jsonFileInput"
            />
            <label htmlFor="jsonFileInput" className="cursor-pointer space-y-2 block">
              <Upload size={28} className="mx-auto text-[var(--gold)]" />
              <p className="font-mono text-xs font-semibold text-[var(--ink)]">
                Pilih file JSON dari komputer Anda
              </p>
              <p className="font-mono text-[11px] text-[var(--soft-ink)]">
                Batas maksimal 100 soal dan 200 KB per berkas.
              </p>
            </label>
          </div>
        )}

        <div>
          <label
            htmlFor="section-json"
            className="block font-mono text-xs font-semibold text-[var(--ink)] mb-1"
          >
            Editor JSON Batch
          </label>
          <textarea
            id="section-json"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              handleValidate(e.target.value);
            }}
            placeholder={`{\n  "questions": [{\n    "type": "single_choice",\n    "prompt": "Berapakah nilai x?",\n    "options": ["1", "2", "3", "4", "5"],\n    "correctAnswer": 0,\n    "explanation": "Penjelasan..."\n  }]\n}`}
            rows={10}
            className="w-full font-mono text-xs rounded-md border border-[var(--edge)] bg-[var(--surface)] p-3 text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
          />
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded border border-[var(--crimson)]/50 bg-[var(--crimson)]/10 p-3 font-mono text-xs text-[var(--crimson)]">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {apiError && (
          <div className="flex items-start gap-2 rounded border border-[var(--crimson)]/50 bg-[var(--crimson)]/10 p-3 font-mono text-xs text-[var(--crimson)]">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {parsedData && (
          <div className="rounded border border-[var(--emerald)]/50 bg-[var(--emerald)]/10 p-3.5 font-mono text-xs text-[var(--emerald)] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle size={15} />
              <span>Validasi Berhasil: {parsedData.questions.length} Soal Siap Diimpor</span>
            </div>
            <div className="text-[11px] text-[var(--soft-ink)] flex flex-wrap gap-x-4">
              <span>• Pilihan Ganda: {singleChoiceCount}</span>
              <span>• Benar / Salah: {trueFalseCount}</span>
              <span>• Dengan Stimulus: {withStimulusCount}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--edge)]">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!parsedData || submitting}
            onClick={handleSubmit}
            className="btn-gold-solid"
          >
            {submitting
              ? "Mengimpor..."
              : `Impor ${parsedData?.questions.length || 0} Soal Secara Atomik`}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
