import { useState, useId } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { AppDialog } from "../../../components/app-dialog";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { DialogFooter } from "../../../components/ui/dialog";
import { api, ApiError } from "../../../lib/api";
import { parseCsv, parseJson, type ParsedUserInput } from "./user-import-parser";

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportResult {
  total: number;
  createdCount: number;
  failedCount: number;
  results: {
    created: Array<{ email: string; name: string; role: string }>;
    failed: Array<{ email: string; reason: string }>;
  };
}

export function ImportUsersDialog({ open, onOpenChange, onSuccess }: ImportUsersDialogProps) {
  const fileInputId = useId();
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [pasteContent, setPasteContent] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fileName, setFileName] = useState("");
  const [parsedUsers, setParsedUsers] = useState<ParsedUserInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const resetAll = () => {
    setFileName("");
    setPasteContent("");
    setParsedUsers([]);
    setParseErrors([]);
    setError("");
    setResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setResult(null);

    const isJson = file.name.endsWith(".json");
    const isCsv = file.name.endsWith(".csv");

    if (!isJson && !isCsv) {
      setError("Format file harus .csv atau .json");
      setParsedUsers([]);
      setParseErrors([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const res = isJson ? parseJson(text) : parseCsv(text);
      setParsedUsers(res.valid);
      setParseErrors(res.errors);
    };
    reader.readAsText(file);
  };

  const handlePasteParse = () => {
    setError("");
    setResult(null);
    if (!pasteContent.trim()) {
      setParsedUsers([]);
      setParseErrors(["Konten teks masih kosong."]);
      return;
    }

    const res = format === "json" ? parseJson(pasteContent) : parseCsv(pasteContent);
    setParsedUsers(res.valid);
    setParseErrors(res.errors);
  };

  const handleImportSubmit = async () => {
    if (parsedUsers.length === 0) return;
    setPending(true);
    setError("");

    try {
      const res = await api<ImportResult>("/admin/users/bulk-create", {
        method: "POST",
        body: JSON.stringify({ users: parsedUsers }),
      });
      setResult(res);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses impor massal.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAll();
        onOpenChange(next);
      }}
      title="Impor Pengguna Massal"
      pending={pending}
      className="max-w-2xl"
    >
      <div className="grid gap-4">
        {result ? (
          <div className="grid gap-4 py-2">
            <div className="p-4 rounded-md border border-[var(--edge)] bg-[var(--surface)] grid gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 size-5" />
                <span className="font-semibold text-[var(--ink)]">Impor Selesai</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm font-mono pt-1">
                <div className="p-2 border border-[var(--edge)] rounded bg-[var(--bg-app)]">
                  <div className="text-xs text-[var(--soft-ink)]">Total</div>
                  <div className="font-bold text-[var(--ink)]">{result.total}</div>
                </div>
                <div className="p-2 border border-green-500/30 rounded bg-green-500/10">
                  <div className="text-xs text-green-400">Berhasil Dibuat</div>
                  <div className="font-bold text-green-400">{result.createdCount}</div>
                </div>
                <div className="p-2 border border-red-500/30 rounded bg-red-500/10">
                  <div className="text-xs text-red-400">Gagal / Dilewati</div>
                  <div className="font-bold text-red-400">{result.failedCount}</div>
                </div>
              </div>

              {result.results.failed.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-red-400 mb-1">Rincian kegagalan:</div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono bg-black/20 p-2 rounded">
                    {result.results.failed.map((f, i) => (
                      <div key={i} className="text-red-300">
                        • {f.email}: {f.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  resetAll();
                  onOpenChange(false);
                }}
              >
                Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex border-b border-[var(--edge)] gap-4 text-sm">
              <button
                type="button"
                className={`pb-2 font-medium transition-colors ${
                  tab === "file"
                    ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                    : "text-[var(--soft-ink)] hover:text-[var(--ink)]"
                }`}
                onClick={() => {
                  setTab("file");
                  resetAll();
                }}
              >
                Unggah File (.csv / .json)
              </button>
              <button
                type="button"
                className={`pb-2 font-medium transition-colors ${
                  tab === "paste"
                    ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                    : "text-[var(--soft-ink)] hover:text-[var(--ink)]"
                }`}
                onClick={() => {
                  setTab("paste");
                  resetAll();
                }}
              >
                Tempel Teks (Paste)
              </button>
            </div>

            {tab === "file" ? (
              <div className="grid gap-3">
                <label
                  htmlFor={fileInputId}
                  className="border-2 border-dashed border-[var(--edge)] hover:border-[var(--gold)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[var(--surface)] text-center"
                >
                  <Upload className="size-8 text-[var(--gold)]" />
                  <span className="text-sm font-medium text-[var(--ink)]">
                    {fileName ? fileName : "Klik atau seret file CSV / JSON ke sini"}
                  </span>
                  <span className="text-xs text-[var(--soft-ink)]">
                    Kolom CSV wajib: email, password | Opsional: name, role
                  </span>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv, .json, text/csv, application/json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--soft-ink)]">Format input:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "csv"}
                      onChange={() => setFormat("csv")}
                    />
                    CSV
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "json"}
                      onChange={() => setFormat("json")}
                    />
                    JSON
                  </label>
                </div>
                <Textarea
                  rows={6}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={
                    format === "csv"
                      ? "email,password,name,role\nuser1@latveria.test,Rahasia123!,User Satu,user\nadmin1@latveria.test,Rahasia123!,Admin Satu,admin"
                      : '[\n  { "email": "user1@latveria.test", "password": "Rahasia123!", "name": "User Satu", "role": "user" }\n]'
                  }
                  className="font-mono text-xs w-full"
                />
                <Button type="button" variant="outline" size="sm" onClick={handlePasteParse}>
                  <FileText size={14} className="mr-1" />
                  Periksa Format Teks
                </Button>
              </div>
            )}

            {/* Error alerts */}
            {error && (
              <p role="alert" className="text-red-500 text-sm">
                {error}
              </p>
            )}

            {parseErrors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 max-h-32 overflow-y-auto">
                <div className="font-semibold flex items-center gap-1 mb-1">
                  <AlertCircle size={13} />
                  Ditemukan {parseErrors.length} kesalahan validasi baris:
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...dan {parseErrors.length - 5} kesalahan lainnya.</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview of Parsed Users */}
            {parsedUsers.length > 0 && (
              <div className="border border-[var(--edge)] rounded p-3 bg-[var(--surface)] text-xs grid gap-2">
                <div className="flex justify-between items-center text-[var(--ink)]">
                  <span className="font-semibold">
                    Siap diimpor:{" "}
                    <span className="text-[var(--gold)]">{parsedUsers.length} pengguna</span>
                  </span>
                  <span className="text-[var(--soft-ink)] text-[11px]">
                    Maks. 500 pengguna per kirim
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-[var(--edge)] rounded">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-[var(--bg-app)] border-b border-[var(--edge)]">
                      <tr>
                        <th className="p-1.5">Email</th>
                        <th className="p-1.5">Nama</th>
                        <th className="p-1.5">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--edge)]">
                      {parsedUsers.slice(0, 5).map((u, i) => (
                        <tr key={i}>
                          <td className="p-1.5 text-[var(--ink)]">{u.email}</td>
                          <td className="p-1.5 text-[var(--soft-ink)]">{u.name || "—"}</td>
                          <td className="p-1.5">
                            <span
                              className={`px-1 rounded text-[10px] ${
                                u.role === "admin"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {u.role || "user"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedUsers.length > 5 && (
                  <span className="text-[var(--soft-ink)] text-[10px]">
                    +{parsedUsers.length - 5} pengguna lainnya tidak ditampilkan pada pratinjau.
                  </span>
                )}
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  resetAll();
                  onOpenChange(false);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={parsedUsers.length === 0 || pending}
                loading={pending}
                loadingText="Mengimpor…"
                onClick={handleImportSubmit}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Impor {parsedUsers.length > 0 ? `${parsedUsers.length} Pengguna` : ""}
              </Button>
            </DialogFooter>
          </>
        )}
      </div>
    </AppDialog>
  );
}
