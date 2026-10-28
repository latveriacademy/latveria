import { FileText, Video, ExternalLink, Calendar, Tag, BookOpen } from "lucide-react";
import { extractYouTubeVideoId, utbkSubtests, type LibraryItemSummary } from "@latveria/shared";
import { AppDialog } from "../../../components/app-dialog";
import { MathText } from "../../../components/math/math-text";

interface LibraryPreviewDialogProps {
  item: LibraryItemSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryPreviewDialog({ item, open, onOpenChange }: LibraryPreviewDialogProps) {
  if (!item) return null;

  const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);
  const youtubeId = item.type === "video" ? extractYouTubeVideoId(item.url) : null;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.title}
      description={subtest ? `Materi ${subtest.name} (${subtest.short})` : "Materi Umum UTBK-SNBT"}
      className="max-w-3xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
        {/* Badges & Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold uppercase tracking-wider ${
              item.type === "video"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : item.type === "article"
                  ? "bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {item.type === "video" && <Video className="w-3 h-3" />}
            {item.type === "article" && <FileText className="w-3 h-3" />}
            {item.type === "link" && <ExternalLink className="w-3 h-3" />}
            {item.type}
          </span>

          {subtest && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-muted)] text-[var(--ink)] border border-[var(--edge)]">
              <BookOpen className="w-3 h-3 text-[var(--gold)]" />
              {subtest.name}
            </span>
          )}

          <span
            className={`px-2 py-0.5 rounded font-medium ${
              item.isPublished
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-500/10 text-zinc-400"
            }`}
          >
            {item.isPublished ? "Tayang" : "Draf"}
          </span>

          <span className="sm:ml-auto flex items-center gap-1 text-[var(--ink-muted)]">
            <Calendar className="w-3 h-3" />
            {new Date(item.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Video Player */}
        {item.type === "video" && youtubeId && (
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-[var(--edge)] bg-black shadow-lg">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}

        {/* External Link Card */}
        {item.type === "link" && item.url && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase font-bold text-amber-400 block mb-1">
                Tautan Sumber
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--ink)] hover:underline break-all"
              >
                {item.url}
              </a>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold shrink-0 flex items-center justify-center gap-1 w-full sm:w-auto"
            >
              Buka <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Article / Notes Content */}
        {item.content && (
          <div className="p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-2 overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
              {item.type === "article" ? "Konten Artikel" : "Catatan / Ringkasan Materi"}
            </h4>
            <div className="prose prose-invert max-w-none text-sm text-[var(--ink)] leading-relaxed space-y-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-x-auto">
              <MathText>{item.content}</MathText>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--edge)]">
            <Tag className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-xs bg-[var(--surface-muted)] text-[var(--ink-muted)] border border-[var(--edge)]"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppDialog>
  );
}
