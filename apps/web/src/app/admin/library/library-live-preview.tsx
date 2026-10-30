import { useState } from "react";
import {
  ExternalLink,
  BookOpen,
  LayoutGrid,
  FileText,
  Video,
  Play,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { utbkSubtests, type LibraryItemType } from "@latveria/shared";
import { MathText } from "../../../components/math/math-text";

interface LibraryLivePreviewProps {
  type: LibraryItemType;
  subtestSlug: string;
  isPublished: boolean;
  title: string;
  url: string;
  content: string;
  thumbnailUrl?: string;
  tags?: string[];
  youtubeVideoId: string | null;
  materialUrl?: string;
  materialTitle?: string;
}

export function LibraryLivePreview({
  type,
  subtestSlug,
  isPublished,
  title,
  url,
  content,
  thumbnailUrl,
  tags = [],
  youtubeVideoId,
  materialUrl,
  materialTitle,
}: LibraryLivePreviewProps) {
  const [viewMode, setViewMode] = useState<"detail" | "card">("detail");
  const subtest = utbkSubtests.find((s) => s.slug === subtestSlug);

  return (
    <div className="space-y-3">
      {/* Selector Mode Pratinjau */}
      <div className="flex items-center justify-between p-2 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] text-xs">
        <span className="font-semibold text-[var(--ink-muted)]">Mode Tampilan:</span>
        <div className="flex rounded-lg border border-[var(--edge)] p-0.5 bg-[var(--surface)]">
          <button
            type="button"
            onClick={() => setViewMode("detail")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
              viewMode === "detail"
                ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Halaman Materi
          </button>
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
              viewMode === "card"
                ? "bg-[var(--gold)]/10 text-[var(--gold)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kartu Katalog
          </button>
        </div>
      </div>

      {viewMode === "detail" ? (
        /* MODE 1: PRATINJAU HALAMAN BELAJAR PESERTA */
        <div className="p-5 rounded-2xl border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--edge)] pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  type === "video"
                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                    : type === "article"
                      ? "bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {type === "video" ? "Video UTBK" : type === "article" ? "Artikel" : "Tautan Luar"}
              </span>

              {subtest && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-[var(--surface)] text-[var(--ink)] border border-[var(--edge)]">
                  {subtest.short} - {subtest.name}
                </span>
              )}
            </div>

            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold ${
                isPublished
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
              }`}
            >
              {isPublished ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tayang
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" /> Draf
                </>
              )}
            </span>
          </div>

          {/* Judul Materi */}
          <h2 className="text-lg sm:text-xl font-black text-[var(--ink)] tracking-tight leading-snug">
            {title.trim() || (
              <span className="text-[var(--ink-muted)]">Judul Materi Belum Diisi</span>
            )}
          </h2>

          {/* Embed Pemutar YouTube jika Video */}
          {type === "video" && (
            <div className="space-y-2">
              {youtubeVideoId ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[var(--edge)] shadow-lg bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
                    title={title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full rounded-xl border border-dashed border-[var(--edge)] bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                  <Video className="w-8 h-8 text-red-400/50 mb-1" />
                  <span className="text-xs text-[var(--ink-muted)]">
                    Masukkan tautan video YouTube valid untuk melihat pemutar interaktif.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Akses Dokumen / Slide Materi Pembahasan jika ada */}
          {materialUrl && (
            <div className="p-3.5 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[var(--gold)]" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--gold)] font-bold uppercase tracking-wider">
                      {type === "video" ? "Materi yang Dibahas" : "Lampiran Slide / Dokumen"}
                    </span>
                    {/drive\.google\.com/i.test(materialUrl) && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                        Google Drive
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[var(--ink)] truncate">
                    {materialTitle ||
                      (type === "video"
                        ? "Slide Pembahasan & Latihan"
                        : "Dokumen Slide / Modul Materi")}
                  </p>
                </div>
              </div>
              <a
                href={materialUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[var(--gold)]/20 text-[var(--gold)] hover:bg-[var(--gold)]/30 font-semibold text-xs flex items-center justify-center gap-1 shrink-0"
              >
                <span>{type === "video" ? "Buka Materi" : "Buka Slide"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Akses Tautan jika Tipe Link */}
          {type === "link" && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-3">
              <div className="truncate flex-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  Tautan Sumber Materi:
                </span>
                <span className="text-xs text-[var(--ink)] font-mono truncate block">
                  {url || "(Belum ada tautan yang diisi)"}
                </span>
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs flex items-center gap-1 shrink-0"
                >
                  <span>Kunjungi</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>
          )}

          {/* Isi Konten Markdown & LaTeX */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              {type === "article" ? "Isi Modul Lengkap" : "Catatan Pembelajaran"}
            </h4>

            {content.trim() ? (
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-[var(--ink)]/90 leading-relaxed p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface)] whitespace-pre-wrap">
                <MathText>{content}</MathText>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--edge)] bg-[var(--surface)]/40 text-center">
                <p className="text-xs text-[var(--ink-muted)] italic">
                  Belum ada catatan materi yang ditulis.
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[var(--edge)]">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] bg-[var(--surface-muted)] text-[var(--gold)] border border-[var(--gold)]/20 font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: PRATINJAU KARTU KATALOG */
        <div className="max-w-sm mx-auto">
          <div className="flex flex-col rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] overflow-hidden shadow-md">
            {/* 16:9 Thumbnail Cover */}
            <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden border-b border-[var(--edge)]">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 text-center">
                  {type === "video" ? (
                    <Video className="w-8 h-8 text-red-500/40 mb-1" />
                  ) : type === "article" ? (
                    <FileText className="w-8 h-8 text-[var(--emerald)]/40 mb-1" />
                  ) : (
                    <ExternalLink className="w-8 h-8 text-amber-500/40 mb-1" />
                  )}
                  <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                    {subtest ? subtest.short : "UTBK"}
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md shadow-sm ${
                    isPublished
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                      : "bg-zinc-950/80 text-zinc-400 border border-zinc-700/40"
                  }`}
                >
                  {isPublished ? "Tayang" : "Draf"}
                </span>
              </div>

              {type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-9 h-9 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Konten Kartu */}
            <div className="p-4 space-y-2">
              {subtest && (
                <span className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-wider block">
                  {subtest.name}
                </span>
              )}
              <h4 className="text-sm font-bold text-[var(--ink)] line-clamp-2">
                {title.trim() || "Judul Materi"}
              </h4>
              {content && (
                <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                  {content}
                </p>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tags.slice(0, 3).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
