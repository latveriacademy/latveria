import { useState, useRef, type DragEvent } from "react";
import {
  Upload,
  Image as ImageIcon,
  Link2,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface LibraryCoverUploadProps {
  thumbnailUrl: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onAutoYouTubeThumb?: () => void;
  isVideoType?: boolean;
}

export function LibraryCoverUpload({
  thumbnailUrl,
  onChange,
  uploading,
  onUploadFile,
  onAutoYouTubeThumb,
  isVideoType = false,
}: LibraryCoverUploadProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("Format berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLocalError("Ukuran gambar maksimal adalah 2 MB.");
      return;
    }
    try {
      await onUploadFile(file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Gagal mengunggah berkas gambar.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  return (
    <div className="space-y-3">
      {/* Tab Switcher & Aksi Cepat */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
              mode === "upload"
                ? "bg-[var(--surface-muted)] text-[var(--gold)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Unggah Berkas
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
              mode === "url"
                ? "bg-[var(--surface-muted)] text-[var(--gold)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Tautan URL
          </button>
        </div>

        {isVideoType && onAutoYouTubeThumb && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoYouTubeThumb}
            className="text-xs h-7 border-[var(--edge)] hover:border-[var(--gold)]"
            title="Gunakan thumbnail otomatis dari video YouTube"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--gold)]" /> Ambil Cover YouTube
          </Button>
        )}
      </div>

      {localError && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Main 16:9 Cover Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Pratinjau Cover 16:9 */}
        <div className="md:col-span-5">
          <div className="relative aspect-video w-full rounded-xl border-2 border-dashed border-[var(--edge)] bg-zinc-950 overflow-hidden flex flex-col items-center justify-center text-center group">
            {thumbnailUrl ? (
              <>
                <img
                  src={thumbnailUrl}
                  alt="Cover pratinjau"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='90'><rect width='100%' height='100%' fill='%23111'/><text x='50%' y='50%' fill='%23666' text-anchor='middle' dy='.3em' font-size='11'>Gambar Tidak Ditemukan</text></svg>";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange("")}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20 text-xs h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Cover
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-4 space-y-1">
                <ImageIcon className="w-8 h-8 text-[var(--ink-muted)]/50 mx-auto" />
                <span className="text-xs font-semibold text-[var(--ink-muted)] block">
                  Belum Ada Cover
                </span>
                <span className="text-[10px] text-[var(--ink-muted)]/70 block">
                  Rasio standar 16:9 (1280 × 720 px)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Input / Upload Controller */}
        <div className="md:col-span-7 space-y-2">
          {mode === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                dragOver
                  ? "border-[var(--gold)] bg-[var(--gold)]/5"
                  : "border-[var(--edge)] bg-[var(--surface-elevated)]/50 hover:border-[var(--gold)]/40 hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--ink)]">
                  {uploading ? "Sedang mengunggah gambar..." : "Klik atau seret gambar ke sini"}
                </p>
                <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                  Format: JPG, PNG, atau WebP (Maksimum 2 MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 p-3 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)]">
              <label className="block text-xs font-semibold text-[var(--ink)]">
                Tautan Gambar Cover
              </label>
              <Input
                value={thumbnailUrl}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://contoh-domain.com/gambar-cover.jpg"
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-[var(--ink-muted)]">
                Masukkan tautan langsung ke berkas gambar beresolusi baik.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
