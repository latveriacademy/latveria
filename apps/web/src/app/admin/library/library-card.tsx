import {
  FileText,
  Video,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { utbkSubtests, type LibraryItemSummary } from "@latveria/shared";

interface LibraryItemCardProps {
  item: LibraryItemSummary;
  isToggling: boolean;
  onTogglePublish: (item: LibraryItemSummary) => void;
  onPreview: (item: LibraryItemSummary) => void;
  onEdit: (item: LibraryItemSummary) => void;
  onDelete: (item: LibraryItemSummary) => void;
}

export function LibraryItemCard({
  item,
  isToggling,
  onTogglePublish,
  onPreview,
  onEdit,
  onDelete,
}: LibraryItemCardProps) {
  const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);

  return (
    <div className="group flex flex-col rounded-xl border border-[var(--edge)] bg-[var(--surface)] overflow-hidden shadow-sm hover:border-[var(--gold)]/50 hover:shadow-md transition-all duration-200">
      {/* 16:9 Thumbnail Cover */}
      <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden border-b border-[var(--edge)] select-none">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 text-center">
            {item.type === "video" ? (
              <Video className="w-8 h-8 text-red-500/40 mb-1" />
            ) : item.type === "article" ? (
              <FileText className="w-8 h-8 text-[var(--emerald)]/40 mb-1" />
            ) : (
              <ExternalLink className="w-8 h-8 text-amber-500/40 mb-1" />
            )}
            <span className="text-[11px] font-mono font-medium text-[var(--ink-muted)]">
              {subtest ? subtest.short : "UTBK"}
            </span>
          </div>
        )}

        {/* Play Overlay untuk Video */}
        {item.type === "video" && (
          <button
            type="button"
            onClick={() => onPreview(item)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-80 group-hover:opacity-100 group-hover:bg-black/50 transition-all cursor-pointer"
            aria-label="Putar video materi"
          >
            <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </button>
        )}

        {/* Tipe Badge di Thumbnail */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
              item.type === "video"
                ? "bg-red-500/80 text-white"
                : item.type === "article"
                  ? "bg-[var(--emerald)]/90 text-[#0b1310]"
                  : "bg-amber-500/90 text-[#0b1310]"
            }`}
          >
            {item.type}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold shadow-sm backdrop-blur-md ${
              item.isPublished
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-950/80 text-zinc-400 border border-zinc-700/40"
            }`}
          >
            {item.isPublished ? "Tayang" : "Draf"}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {subtest && (
            <span className="text-[11px] font-semibold text-[var(--gold)] uppercase tracking-wider block">
              {subtest.name}
            </span>
          )}

          <h4 className="text-sm font-bold text-[var(--ink)] line-clamp-2 leading-snug">
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="text-left font-bold text-[var(--ink)] hover:text-[var(--gold)] cursor-pointer transition-colors"
              title={item.title}
            >
              {item.title}
            </button>
          </h4>

          {item.content && (
            <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
              {item.content}
            </p>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map((t, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-muted)] text-[var(--ink-muted)] border border-[var(--edge)]/60"
              >
                #{t}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-[var(--ink-muted)]">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--edge)]/60 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => onTogglePublish(item)}
            disabled={isToggling}
            className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
            title="Klik untuk ubah status publikasi"
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : item.isPublished ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>{item.isPublished ? "Tayang" : "Draf"}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
              title="Preview Materi"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--gold)] transition-colors"
              title="Edit Materi"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="p-1.5 rounded hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-red-400 transition-colors"
              title="Hapus Materi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
